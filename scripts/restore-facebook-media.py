"""Restore provider-grounded Page media. Secrets and short-lived URLs enter hidden stdin only.

Checkpoints contain source paths and acknowledged object keys, never tokens or signed URLs.
Run through the Site owner's session after enabling the temporary restoration endpoint.
"""
import concurrent.futures
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import struct
import sys
import tempfile
import termios
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageOps


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def object_key(data, suffix):
    digest = hashlib.sha256(data).hexdigest()[:32]
    return f"{digest[:8]}-{digest[8:12]}-{digest[12:16]}-{digest[16:20]}-{digest[20:]}.{suffix}"


def photo_bytes(image, longest):
    image = image.copy()
    image.thumbnail((longest, longest), Image.Resampling.LANCZOS)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    for quality in (86, 80, 74, 66, 58):
        output = io.BytesIO()
        image.save(output, "WEBP", quality=quality, method=4)
        data = output.getvalue()
        if len(data) <= 1500000:
            return data, image.width, image.height
    raise ValueError("PHOTO_LIMIT")


class Restorer:
    def __init__(self, config):
        origin = urllib.parse.urlsplit(config.get("origin", ""))
        if origin.scheme != "https" or origin.path not in ("", "/") or origin.query or origin.fragment or origin.username:
            raise ValueError("INVALID_ORIGIN")
        self.origin = config["origin"].rstrip("/")
        self.token, self.key = config.get("serviceToken", ""), config.get("importKey", "")
        self.path = Path(config["checkpoint"])
        self.results = json.loads(self.path.read_text()) if self.path.exists() else {}
        self.lock = threading.Lock()
        self.opener = urllib.request.build_opener(NoRedirect())
        self.workers = min(12, max(1, int(config.get("workers", 8))))
        self.video_slot = threading.Semaphore(3)

    def checkpoint(self, source, result):
        with self.lock:
            self.results[source] = result
            temporary = self.path.with_suffix(".tmp")
            temporary.write_text(json.dumps(self.results, ensure_ascii=False))
            temporary.replace(self.path)

    def api(self, data, query="", content_type="application/json"):
        if isinstance(data, dict):
            data = json.dumps(data, ensure_ascii=False).encode()
        request = urllib.request.Request(self.origin + "/api/source-archive" + query, data=data, headers={
            "OAI-Sites-Authorization": "Bearer " + self.token, "x-source-archive-key": self.key,
            "Content-Type": content_type,
        })
        for attempt in range(3):
            try:
                with self.opener.open(request, timeout=120) as response:
                    return json.load(response)
            except urllib.error.HTTPError as error:
                if error.code not in (429, 502, 503, 504) or attempt == 2:
                    raise ValueError("SITE_HTTP_" + str(error.code)) from None
            except (TimeoutError, OSError):
                if attempt == 2:
                    raise ValueError("SITE_CONNECTION") from None
            time.sleep(0.5 * (attempt + 1))

    def upload(self, data, mime, suffix):
        key = object_key(data, suffix)
        if len(data) <= 8388608:
            self.api(data, "?media=" + key, mime)
        else:
            result = self.api({"action": "startMedia", "key": key, "size": len(data), "type": mime})
            if not result.get("complete"):
                chunk_size = 8 * 1024 * 1024
                completed = set(result.get("parts", []))
                for offset in range(0, len(data), chunk_size):
                    number = offset // chunk_size + 1
                    if number not in completed:
                        self.api(data[offset:offset + chunk_size], "?part=" + key + "&number=" + str(number), mime)
                self.api({"action": "completeMedia", "key": key})
        return key

    def source_bytes(self, item):
        if item.get("localPath"):
            local = Path(item["localPath"]).resolve()
            if not local.is_relative_to(Path.cwd().parent):
                raise ValueError("INVALID_LOCAL_FILE")
            data = local.read_bytes()
        else:
            url = urllib.parse.urlsplit(item["downloadUrl"])
            allowed = url.hostname and (url.hostname.endswith(".blob.core.windows.net") or url.hostname.endswith(".oaiusercontent.com") or url.hostname.endswith(".amazonaws.com"))
            if url.scheme != "https" or not allowed:
                raise ValueError("INVALID_FILE_REFERENCE")
            with self.opener.open(item["downloadUrl"], timeout=180) as response:
                data = response.read(512 * 1024 * 1024 + 1)
        if len(data) != int(item["bytes"]):
            raise ValueError("SOURCE_SIZE_MISMATCH")
        return data

    def prepare_image(self, item):
        source = item["source"]
        if source in self.results:
            return {"source": source, "state": "existing"}
        try:
            with Image.open(io.BytesIO(self.source_bytes(item))) as original:
                image = ImageOps.exif_transpose(original)
                full, width, height = photo_bytes(image, 2048)
                preview, preview_width, _ = photo_bytes(image, 640)
            key, preview_key = object_key(full, "webp"), object_key(preview, "webp")
            return {"source": source, "result": {"uploadedKey": key, "previewKey": preview_key, "width": width, "height": height, "previewWidth": preview_width}, "payloads": {key: full, preview_key: preview}}
        except Exception as error:
            return {"source": source, "state": "error", "error": (str(error) if isinstance(error, ValueError) else type(error).__name__)[:80]}

    def image_batch(self, items):
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, self.workers)) as pool:
            prepared = list(pool.map(self.prepare_image, items))
        payloads = {key: data for entry in prepared for key, data in entry.get("payloads", {}).items()}
        acknowledged = set()
        group, size = {}, 0
        groups = []
        for key, data in payloads.items():
            if group and (len(group) == 40 or size + len(data) > 8 * 1024 * 1024 - 16000):
                groups.append(group)
                group, size = {}, 0
            group[key], size = data, size + len(data)
        if group:
            groups.append(group)
        failure = "MEDIA_NOT_ACKNOWLEDGED"
        for group in groups:
            try:
                manifest = json.dumps([{"key": key, "type": "image/webp", "size": len(data)} for key, data in group.items()], separators=(",", ":")).encode()
                response = self.api(struct.pack(">I", len(manifest)) + manifest + b"".join(group.values()), "?mediaBatch=1", "application/octet-stream")
                if set(response.get("keys", [])) != set(group):
                    raise ValueError("MEDIA_NOT_ACKNOWLEDGED")
                acknowledged.update(group)
            except Exception as error:
                failure = (str(error) if isinstance(error, ValueError) else type(error).__name__)[:80]
        results = []
        for entry in prepared:
            if "state" in entry:
                results.append(entry)
            elif set(entry["payloads"]) <= acknowledged:
                self.checkpoint(entry["source"], entry["result"])
                results.append({"source": entry["source"], "state": "uploaded"})
            else:
                results.append({"source": entry["source"], "state": "error", "error": failure})
        return results

    def restore(self, item, prepare_only=False):
        # Bound memory while original videos are read, hashed and transferred.
        with self.video_slot if item["type"] == "video" else contextlib.nullcontext():
            return self.restore_one(item, prepare_only)

    def restore_one(self, item, prepare_only=False):
        source = item["source"]
        if source in self.results and not prepare_only:
            return {"source": source, "state": "existing"}
        try:
            data = self.source_bytes(item)
            preview = None
            if item["type"] == "image":
                with Image.open(io.BytesIO(data)) as original:
                    image = ImageOps.exif_transpose(original)
                    full, width, height = photo_bytes(image, 2048)
                    preview, preview_width, _ = photo_bytes(image, 640)
                if prepare_only:
                    return {"source": source, "state": "prepared", "width": width, "height": height, "sourceBytes": len(data), "webpBytes": len(full), "previewBytes": len(preview)}
                key = self.upload(full, "image/webp", "webp")
                preview_key = key if full == preview else self.upload(preview, "image/webp", "webp")
                result = {"uploadedKey": key, "previewKey": preview_key, "width": width, "height": height, "previewWidth": preview_width}
            else:
                suffix = "webm" if item.get("mime") == "video/webm" else "mp4"
                if prepare_only:
                    return {"source": source, "state": "prepared", "sourceBytes": len(data)}
                key = self.upload(data, "video/" + suffix, suffix)
                result = {"uploadedKey": key}
                with tempfile.TemporaryDirectory(prefix="orman-video-") as directory:
                    video = Path(directory) / ("source." + suffix)
                    video.write_bytes(data)
                    poster = Path(directory) / "poster.webp"
                    completed = subprocess.run(["ffmpeg", "-v", "error", "-threads", "1", "-i", str(video), "-frames:v", "1", "-vf", "scale=640:640:force_original_aspect_ratio=decrease", "-threads", "1", str(poster)], capture_output=True, timeout=35)
                    if completed.returncode == 0 and poster.exists():
                        preview = poster.read_bytes()
                        with Image.open(poster) as image:
                            result.update(previewWidth=image.width, width=image.width, height=image.height)
                        result["previewKey"] = self.upload(preview, "image/webp", "webp")
            self.checkpoint(source, result)
            return {"source": source, "state": "uploaded"}
        except urllib.error.HTTPError as error:
            return {"source": source, "state": "error", "error": "SOURCE_HTTP_" + str(error.code)}
        except Exception as error:
            code = str(error) if isinstance(error, ValueError) else type(error).__name__
            return {"source": source, "state": "error", "error": code[:80]}

    def batch(self, items, prepare_only=False):
        images = [item for item in items if item["type"] == "image"]
        results = self.image_batch(images) if not prepare_only else []
        remaining = items if prepare_only else [item for item in items if item["type"] != "image"]
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.workers) as pool:
            for result in pool.map(lambda item: self.restore(item, prepare_only), remaining):
                results.append(result)
        errors = [result for result in results if result["state"] == "error"]
        print(json.dumps({"processed": len(results), "restored": len(self.results), "states": {state: sum(result["state"] == state for result in results) for state in ["uploaded", "existing", "prepared", "error"]}, "errors": errors[:30], "prepared": [result for result in results if result["state"] == "prepared"]}), flush=True)

    def import_archive(self, path):
        posts = json.loads(Path(path).read_text())["posts"]
        for post in posts:
            for media in post["media"]:
                if media.get("path") in self.results:
                    media.update(self.results[media["path"]])
        def restore_part(part):
            try:
                response = self.api({"posts": part})
                result = self.api({"action": "publishReady", "ids": [post["id"] for post in part]})
                return {"processed": len(part), "imported": response.get("imported", 0), "published": result.get("published", 0), "skippedPublication": result.get("skipped", 0)}
            except Exception as error:
                return {"processed": 0, "failedRecords": len(part), "error": (str(error) if isinstance(error, ValueError) else type(error).__name__)[:80]}
        totals = {"processed": 0, "imported": 0, "published": 0, "skippedPublication": 0, "failedRecords": 0}
        errors = []
        parts = [posts[offset:offset + 40] for offset in range(0, len(posts), 40)]
        # Each partition owns distinct record IDs; publishing waits for its insert.
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for index, result in enumerate(pool.map(restore_part, parts)):
                for key in totals:
                    totals[key] += result.get(key, 0)
                if result.get("error"):
                    errors.append({"partition": index, "error": result["error"]})
                if index % 10 == 0:
                    print(json.dumps({"metadataProgress": totals["processed"], "imported": totals["imported"], "published": totals["published"], "failedRecords": totals["failedRecords"]}), flush=True)
        print(json.dumps({"metadataSourceRecords": len(posts), **totals, "errors": errors}), flush=True)


def main():
    if sys.stdin.isatty():
        settings = termios.tcgetattr(sys.stdin)
        settings[3] &= ~(termios.ECHO | termios.ICANON)
        settings[6][termios.VMIN] = 1
        settings[6][termios.VTIME] = 0
        termios.tcsetattr(sys.stdin, termios.TCSANOW, settings)
    print("Ready for hidden restoration configuration", flush=True)
    restorer = Restorer(json.loads(sys.stdin.readline()))
    print("Restoration session ready", flush=True)
    for line in sys.stdin:
        request = json.loads(line)
        if request.get("action") == "stop":
            print(json.dumps({"restored": len(restorer.results)}), flush=True)
            break
        if request.get("action") == "import":
            restorer.import_archive(request["path"])
        else:
            restorer.batch(request.get("items", []), request.get("prepareOnly", False))


if __name__ == "__main__":
    main()
