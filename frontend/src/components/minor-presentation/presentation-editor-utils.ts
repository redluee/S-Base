import {
  type MinorStoryPresentationData,
  type MinorStoryPresentationDocument,
  type MinorStoryPresentationLink,
} from "@/lib/api";
import { isImageUrl } from "@/lib/minor-constants";

export type PresentationLayout = "auto" | "split" | "media" | "bullets" | "demo";
export type PresentationListStyle = "bullets" | "steps";
export type PresentationImage = { url: string; caption?: string };
export type EditorBlockKey = "bullets" | "websites" | "documents" | "images";

export interface PresentationEditorState {
  enabled: boolean;
  layout: PresentationLayout;
  listStyle: PresentationListStyle;
  bullets: string[];
  websites: MinorStoryPresentationLink[];
  documents: MinorStoryPresentationDocument[];
  images: PresentationImage[];
}

export function buildInitialWebsites(initialData: MinorStoryPresentationData): MinorStoryPresentationLink[] {
  const list: MinorStoryPresentationLink[] = [];
  const seen = new Set<string>();

  const rawWebsites = initialData.websites || initialData.links || [];
  for (const w of rawWebsites) {
    if (w.url?.trim()) {
      const url = w.url.trim();
      if (!seen.has(url.toLowerCase())) {
        seen.add(url.toLowerCase());
        list.push({ title: w.title || w.name || "", url });
      }
    }
  }

  if (list.length === 0 && initialData.demoUrl?.trim()) {
    list.push({
      title: initialData.demoTitle?.trim() || "",
      url: initialData.demoUrl.trim(),
    });
  }

  return list;
}

export function buildInitialDocuments(initialData: MinorStoryPresentationData): MinorStoryPresentationDocument[] {
  const docs: MinorStoryPresentationDocument[] = [];
  if (initialData.documents && initialData.documents.length > 0) {
    for (const d of initialData.documents) {
      if (d.url?.trim()) docs.push({ title: d.title || "", url: d.url });
    }
  }
  if (initialData.images && initialData.images.length > 0) {
    for (const img of initialData.images) {
      if (img.url?.trim() && !isImageUrl(img.url) && !docs.some((d) => d.url === img.url)) {
        docs.push({ title: img.caption || "", url: img.url });
      }
    }
  }
  return docs;
}

export function buildInitialImages(initialData: MinorStoryPresentationData): PresentationImage[] {
  return (initialData.images || []).filter((img) => isImageUrl(img.url));
}

export function buildPresentationPayload(state: PresentationEditorState): MinorStoryPresentationData {
  const { enabled, layout, listStyle, bullets, websites, documents, images } = state;
  const cleanWebsites: MinorStoryPresentationLink[] = [
    ...websites
      .map((w) => ({
        title: (w.title || w.name || "").trim(),
        url: w.url.trim(),
      }))
      .filter((w) => w.url.length > 0)
      .map((w) => ({
        title: w.title || w.url,
        url: w.url,
      })),
  ];

  const cleanImages: Array<{ url: string; caption?: string }> = [];
  const cleanDocs: MinorStoryPresentationDocument[] = [
    ...documents
      .map((d) => ({ title: d.title.trim() || d.url.trim(), url: d.url.trim() }))
      .filter((d) => d.url.length > 0),
  ];

  for (const img of images) {
    const trimmed = img.url.trim();
    if (!trimmed) continue;
    if (isImageUrl(trimmed)) {
      cleanImages.push({ url: trimmed, caption: img.caption?.trim() || undefined });
    } else {
      // If a PDF or web URL was entered into images, route it to documents
      cleanDocs.push({ title: img.caption?.trim() || trimmed, url: trimmed });
    }
  }

  return {
    enabled,
    layout,
    listStyle,
    bullets: bullets.map((b) => b.trim()).filter(Boolean),
    websites: cleanWebsites,
    links: cleanWebsites,
    demoUrl: cleanWebsites[0]?.url || undefined,
    demoTitle: cleanWebsites[0]?.title || undefined,
    documents: cleanDocs,
    images: cleanImages,
  };
}

export function hasPresentationChanges(
  initialData: MinorStoryPresentationData,
  state: PresentationEditorState
): boolean {
  const { enabled, layout, listStyle, bullets, websites, documents, images } = state;
  const origEnabled = initialData.enabled !== false;
  if (enabled !== origEnabled) return true;

  const origLayout = initialData.layout || "auto";
  if (layout !== origLayout) return true;

  const origListStyle = initialData.listStyle || "bullets";
  if (listStyle !== origListStyle) return true;

  const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);
  const origBullets = (initialData.bullets || []).map((b) => b.trim()).filter(Boolean);
  if (JSON.stringify(cleanBullets) !== JSON.stringify(origBullets)) return true;

  const cleanWebsites = websites
    .map((w) => ({ title: (w.title || w.name || "").trim(), url: w.url.trim() }))
    .filter((w) => w.url.length > 0);
  const origWebsites = (initialData.websites || initialData.links || [])
    .map((w) => ({ title: (w.title || w.name || "").trim(), url: w.url.trim() }))
    .filter((w) => w.url.length > 0);
  if (origWebsites.length === 0 && initialData.demoUrl?.trim()) {
    origWebsites.push({
      title: initialData.demoTitle?.trim() || "",
      url: initialData.demoUrl.trim(),
    });
  }
  if (JSON.stringify(cleanWebsites) !== JSON.stringify(origWebsites)) return true;

  const cleanDocs = documents
    .map((d) => ({ title: d.title.trim(), url: d.url.trim() }))
    .filter((d) => d.url.length > 0);
  const origDocs = (initialData.documents || [])
    .map((d) => ({ title: d.title.trim(), url: d.url.trim() }))
    .filter((d) => d.url.length > 0);
  if (JSON.stringify(cleanDocs) !== JSON.stringify(origDocs)) return true;

  const cleanImages = images
    .map((i) => ({ url: i.url.trim(), caption: i.caption?.trim() || "" }))
    .filter((i) => i.url.length > 0);
  const origImages = (initialData.images || [])
    .map((i) => ({ url: i.url.trim(), caption: i.caption?.trim() || "" }))
    .filter((i) => i.url.length > 0);
  if (JSON.stringify(cleanImages) !== JSON.stringify(origImages)) return true;

  return false;
}
