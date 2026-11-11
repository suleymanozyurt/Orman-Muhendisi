"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import type { Language } from "./i18n";
import type { SocialPost } from "./social-archive-model";
import { SocialArchiveCard } from "./social-archive";
export default function SocialArchivePreview({ language, active, onOpen }: { language: Language; active: boolean; onOpen: (id?: string) => void }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  useEffect(() => {
    if (!active) return; const controller = new AbortController();
    void fetch("/api/social", { cache: "no-store", signal: controller.signal }).then(response => response.ok ? response.json() as Promise<{records:SocialPost[]}> : null).then(data => { if (data) setPosts((data.records || []).slice(0, 2)); }).catch(() => {});
    return () => controller.abort();
  }, [active]);
  if (!active || !posts.length) return null;
  return <section className="archive-feed-preview"><button className="archive-feed-link" onClick={() => onOpen()}><span className="archive-mark"><Icon name="tree"/></span><span><strong>Orman Mühendisi</strong><small>{language === "en" ? "Our photographs, videos and nature stories" : "Fotoğraflarımız, videolarımız ve doğa yazılarımız"}</small></span><span aria-hidden="true">↗</span></button>{posts.map(post => <SocialArchiveCard key={post.id} post={post} language={language} onSelect={onOpen}/>)}</section>;
}
