import { useMemo } from "react";
import { t } from "@/lib/lang";
import type { MinorStory } from "@/lib/api";
import { isImageUrl } from "@/app/minor/constants";


export function useSlideStoryContent(story: MinorStory) {
  const presentationData = story.presentationData || {};

  const listStyle = presentationData.listStyle || "bullets";

  const websites = useMemo(() => {
    const rawWebsites = presentationData.websites || presentationData.links || [];
    const list: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();

    for (const w of rawWebsites) {
      if (!w.url?.trim()) continue;
      const url = w.url.trim();
      const title = (w.title || w.name)?.trim() || w.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ url, title });
      }
    }

    if (list.length === 0) {
      if (presentationData.demoUrl?.trim()) {
        const url = presentationData.demoUrl.trim();
        list.push({
          url,
          title: presentationData.demoTitle?.trim() || t("Live Applicatie"),
        });
        seen.add(url.toLowerCase());
      } else {
        const appEvidence = (story.evidence || []).filter(
          (e) =>
            e.type === "app" ||
            (e.type === "link" &&
              (e.title.toLowerCase().includes("live") ||
                e.title.toLowerCase().includes("demo") ||
                e.title.toLowerCase().includes("staging") ||
                e.title.toLowerCase().includes("website") ||
                e.title.toLowerCase().includes("app")))
        );
        for (const ev of appEvidence) {
          if (ev.url?.trim() && !seen.has(ev.url.trim().toLowerCase())) {
            seen.add(ev.url.trim().toLowerCase());
            list.push({ url: ev.url.trim(), title: ev.title.trim() });
          }
        }
      }
    }

    return list;
  }, [
    presentationData.websites,
    presentationData.links,
    presentationData.demoUrl,
    presentationData.demoTitle,
    story.evidence,
  ]);

  const documents = useMemo(() => {
    const rawDocs = presentationData.documents || [];
    const rawImages = presentationData.images || [];

    const list: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();

    for (const d of rawDocs) {
      if (!d.url?.trim()) continue;
      const url = d.url.trim();
      const title = d.title?.trim() || d.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ url, title });
      }
    }

    for (const img of rawImages) {
      if (!img.url?.trim() || isImageUrl(img.url)) continue;
      const url = img.url.trim();
      const title = img.caption?.trim() || img.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ url, title });
      }
    }

    return list;
  }, [presentationData.documents, presentationData.images]);

  const images = useMemo(() => {
    const rawImages = presentationData.images || [];
    const realImages: Array<{ url: string; caption?: string }> = [];

    for (const item of rawImages) {
      if (item.url?.trim() && isImageUrl(item.url)) {
        realImages.push(item);
      }
    }

    if (realImages.length === 0 && (!presentationData.images || presentationData.images.length === 0)) {
      const evidenceImages = (story.evidence || [])
        .filter((e) => isImageUrl(e.url))
        .map((e) => ({ url: e.url, caption: e.title }));
      return evidenceImages;
    }

    return realImages;
  }, [presentationData.images, story.evidence]);

  const primaryWebsite = websites[0] || null;
  const demoUrl = primaryWebsite ? primaryWebsite.url : (presentationData.demoUrl?.trim() || null);
  const demoTitle = primaryWebsite ? primaryWebsite.title : (presentationData.demoTitle?.trim() || t("Bekijk live applicatie"));

  const bullets = useMemo(() => {
    if (presentationData.bullets && presentationData.bullets.length > 0) {
      return presentationData.bullets.filter((b) => b.trim().length > 0);
    }
    const criteriaTexts = (story.criteria || [])
      .filter((c) => c.text.trim())
      .map((c) => c.text.trim());
    return criteriaTexts.slice(0, 5);
  }, [presentationData.bullets, story.criteria]);

  const activeLayout = useMemo(() => {
    const pref = presentationData.layout || "auto";
    if (pref !== "auto") return pref;
    if (images.length >= 2) return "media";
    if (images.length === 1) return "split";
    if (websites.length === 1 && documents.length === 0 && images.length === 0) return "demo";
    if (websites.length > 0 && images.length === 0) return "split";
    if (demoUrl) return "demo";
    if (documents.length >= 2) return "media";
    if (documents.length === 1) return "split";
    return "bullets";
  }, [presentationData.layout, images.length, websites.length, documents.length, demoUrl]);

  return { listStyle, websites, documents, images, demoUrl, demoTitle, bullets, activeLayout };
}
