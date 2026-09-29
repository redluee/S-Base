"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeFull } from "@backend/types/shared";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { buildResumePDFBlob } from "@/components/resume-pdf";
import { t } from "@/lib/lang";

const DEBOUNCE_MS = 400;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

export function ResumePdfPreview({ data }: { data: ResumeFull }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const generation = useRef(0);
  const [width, setWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [renderedData, setRenderedData] = useState<ResumeFull | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const versionData = useRef<ResumeFull | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => setWidth(Math.floor(wrap.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const gen = ++generation.current;
    const timer = setTimeout(async () => {
      try {
        const [pdfjs, blob] = await Promise.all([loadPdfjs(), buildResumePDFBlob(data)]);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (gen !== generation.current) return;
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (gen !== generation.current) {
          void doc.loadingTask.destroy();
          return;
        }
        const previous = docRef.current;
        docRef.current = doc;
        setPageCount(doc.numPages);
        setError(false);
        setRendering(true);
        setVersion((v) => v + 1);
        versionData.current = data;
        if (previous) void previous.loadingTask.destroy();
      } catch {
        if (gen === generation.current) {
          setError(true);
          setRendering(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    const doc = docRef.current;
    const container = pagesRef.current;
    if (!doc || !container || !width || !version) return;
    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;

    (async () => {
      const canvases: HTMLCanvasElement[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width / base.width) * dpr });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        canvas.style.display = "block";
        canvas.style.background = "#fff";
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled || docRef.current !== doc) return;
        canvases.push(canvas);
      }
      if (cancelled || docRef.current !== doc) return;
      container.replaceChildren(...canvases);
      setRenderedData(versionData.current);
      setRendering(false);
    })().catch(() => {
      if (!cancelled && docRef.current === doc) {
        setError(true);
        setRendering(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [version, width]);

  useEffect(() => {
    const gen = generation;
    return () => {
      gen.current++;
      void docRef.current?.loadingTask.destroy();
      docRef.current = null;
    };
  }, []);

  const busy = rendering || renderedData !== data;

  return (
    <div>
      <div ref={wrapRef} className="w-full">
        <div ref={pagesRef} className="flex flex-col gap-3" />
      </div>
      <p className="mt-2 text-xs text-white/60" role="status">
        {error
          ? t("Voorbeeld kon niet worden geladen.")
          : busy
            ? t("Voorbeeld bijwerken…")
            : pageCount > 1
              ? t("Dit CV past niet op één pagina ({pages} pagina's in de PDF).", { pages: String(pageCount) })
              : t("Exact zoals de PDF-download.")}
      </p>
    </div>
  );
}
