"""Normalize a verified Facebook Page HTML/media export without running HTML or guessing dates.

Inventory files contain metadata returned by the connected Drive provider. Output contains
private draft records and an exact path-to-file inventory; no source access tokens are stored.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath


class Node:
    def __init__(self, tag="", attrs=None):
        self.tag, self.attrs, self.children = tag, attrs or {}, []

    def text(self):
        return "".join(child.text() if isinstance(child, Node) else child for child in self.children)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()


class ExportParser(HTMLParser):
    void = set("area base br col embed hr img input link meta param source track wbr".split())

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in self.void:
            self.stack.append(node)
        if tag == "br":
            node.children.append("\n")

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                return

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def export_date(text, offset):
    match = re.fullmatch(r"(\S+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}):(\d{2})(am|pm)", text.strip(), re.I)
    if not match or offset is None:
        return ""
    months = {name.casefold(): month for month, names in enumerate([
        ["Oca", "Jan"], ["Şub", "Feb"], ["Mar"], ["Nis", "Apr"], ["May"], ["Haz", "Jun"],
        ["Tem", "Jul"], ["Ağu", "Aug"], ["Eyl", "Sep"], ["Eki", "Oct"], ["Kas", "Nov"], ["Ara", "Dec"],
    ], 1) for name in names}
    month = months.get(match[1].casefold())
    if not month:
        return ""
    hour = int(match[4]) % 12 + (12 if match[7].lower() == "pm" else 0)
    try:
        date = dt.datetime(int(match[3]), month, int(match[2]), hour, int(match[5]), int(match[6]), tzinfo=dt.timezone(offset))
        return date.astimezone(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    except ValueError:
        return ""


def html_records(path):
    html = Path(path).read_text(encoding="utf-8")
    if not html.rstrip().endswith("</html>"):
        raise ValueError("Incomplete HTML export")
    parser = ExportParser()
    parser.feed(html)
    # Only explicitly recorded export offsets are used; geography is never a date offset.
    timezone = re.search(r"UTC([+-])(\d{2}):(\d{2})", parser.root.text())
    offset = (dt.timedelta(hours=int(timezone[2]), minutes=int(timezone[3])) * (1 if timezone[1] == "+" else -1)) if timezone else None
    records = []
    for row in parser.root.walk():
        if "_a6-g" not in row.attrs.get("class", "").split():
            continue
        nodes = list(row.walk())
        media = []
        for node in nodes:
            src = node.attrs.get("src", "")
            if node.tag in ["video", "img"] and src.startswith("posts/media/") and ".." not in PurePosixPath(src).parts:
                item = {"path": src, "type": "video" if node.tag == "video" else "image", "alt": ""}
                # A video's fallback image may repeat the same MP4 source.
                if node.tag == "img" and src.lower().endswith(".mp4"):
                    continue
                if item not in media:
                    media.append(item)
        if not media:
            continue
        captions = [node.text().strip() for node in nodes if node.attrs.get("class") == "_3-95" and node.text().strip()]
        dates = [node.text() for node in nodes if "_a72d" in node.attrs.get("class", "").split()]
        records.append({"text": "\n\n".join(captions), "publishedAt": export_date(dates[0], offset) if dates else "", "media": media})
    return records


def normalize(inventory, html_paths):
    files = {}
    duplicates, conflicts = 0, []
    for file in inventory:
        path = "posts/media/" + file["folder"] + "/" + file["name"]
        if path in files:
            if files[path]["bytes"] != file["bytes"]:
                conflicts.append(path)
            duplicates += 1
            continue
        files[path] = file
    if conflicts:
        raise ValueError("Conflicting archive paths; resolve originals before importing")
    rows = {}
    for html in html_paths:
        for record in html_records(html):
            identity = "|".join(media["path"] for media in record["media"])
            existing = rows.get(identity)
            if existing and existing != record:
                raise ValueError("Conflicting captions or dates in the export")
            rows[identity] = record
    referenced = {item["path"] for row in rows.values() for item in row["media"]}
    for path, file in files.items():
        if path not in referenced:
            rows[path] = {"text": "", "publishedAt": "", "media": [{"type": "video" if file["mime"].startswith("video/") else "image", "path": path, "alt": ""}]}
    posts = []
    for identity, row in rows.items():
        text = row["text"]
        if len(text) > 20000 or len(row["media"]) > 100:
            raise ValueError("Export row exceeds the product's verified post limits")
        title = text.split("\n")[0][:120] or ("Video arşivi" if row["media"][0]["type"] == "video" else "Fotoğraf arşivi")
        posts.append({"id": hashlib.sha256(("facebook:" + identity).encode()).hexdigest(), "platform": "facebook", "title": title,
                      "text": text, "publishedAt": row["publishedAt"], "sourceUrl": "https://www.facebook.com/0rmanmuhendisi",
                      "media": row["media"], "status": "draft", "revision": 0})
    posts.sort(key=lambda post: (post["publishedAt"], post["id"]), reverse=True)
    return {"posts": posts, "files": files, "coverage": {"records": len(posts), "sourceFiles": len(files), "duplicatePaths": duplicates,
        "withOriginalDate": sum(bool(post["publishedAt"]) for post in posts), "withOriginalCaption": sum(bool(post["text"]) for post in posts),
        "missingMediaFiles": sum(item["path"] not in files for post in posts for item in post["media"]), "exportedAt": "2022-10-06"}}


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--inventory", action="append", required=True)
    cli.add_argument("--html", action="append", required=True)
    cli.add_argument("--output", required=True)
    options = cli.parse_args()
    inventory = [file for path in options.inventory for file in json.loads(Path(path).read_text())]
    result = normalize(inventory, options.html)
    Path(options.output).write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(result["coverage"], ensure_ascii=False))
