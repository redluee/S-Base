"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeFull, ResumeEntry } from "@backend/types/shared";
import { t } from "@/lib/lang";
import { PAGE, scaledTheme, formatPeriod, fontFaceCss, type ResolvedFont } from "@/lib/resume";

type Theme = ReturnType<typeof scaledTheme>;

interface ResumeDocumentProps {
  data: ResumeFull;
  titleFont: ResolvedFont | null;
  textFont: ResolvedFont | null;
}

export function detailRows(profile: ResumeFull["profile"]) {
  return [
    { label: "Woonplaats", value: profile.residence },
    { label: "Telefoonnummer", value: profile.phone },
    { label: "Email", value: profile.email },
    { label: "Geboortedatum", value: profile.birthDate },
    { label: "Rijbewijs", value: profile.drivingLicense },
  ].filter((r) => r.value);
}

function Entry({ entry, titleFamily, th }: { entry: ResumeEntry; titleFamily: string; th: Theme }) {
  return (
    <div style={{ marginBottom: "11pt" }}>
      <div style={{ fontSize: `${th.entryTitle}pt`, lineHeight: 1.3 }}>
        <span style={{ fontFamily: titleFamily, fontWeight: 700 }}>{entry.title}</span>
        {(entry.organization || entry.place) && (
          <span style={{ fontWeight: 400 }}>
            {" — "}
            {[entry.organization, entry.place].filter(Boolean).join(", ")}
          </span>
        )}
      </div>
      <div style={{ fontSize: `${th.period}pt`, color: th.muted, marginTop: "1.5pt" }}>{formatPeriod(entry)}</div>
      {entry.description && (
        <div style={{ fontSize: `${th.body}pt`, color: th.muted, marginTop: "4pt", lineHeight: 1.5, whiteSpace: "pre-line" }}>
          {entry.description}
        </div>
      )}
    </div>
  );
}

export function ResumeDocument({ data, titleFont, textFont }: ResumeDocumentProps) {
  const { resume, profile, experiences, educations } = data;
  const titleFamily = titleFont ? `'${titleFont.family}', sans-serif` : "sans-serif";
  const textFamily = textFont ? `'${textFont.family}', sans-serif` : "sans-serif";
  const accent = resume.accentColor;
  const th = scaledTheme(resume);
  const rows = detailRows(profile);

  const label = (text: string) => (
    <div style={{ fontFamily: titleFamily, fontWeight: 700, fontSize: `${th.label}pt`, color: accent, textTransform: "uppercase", marginBottom: "3pt" }}>
      {text}
    </div>
  );

  const list = (items: string[]) =>
    items.map((item, i) => (
      <div key={i} style={{ fontSize: `${th.side}pt`, lineHeight: 1.5 }}>{item}</div>
    ));

  return (
    <div
      style={{
        width: `${PAGE.width}pt`,
        minHeight: `${PAGE.height}pt`,
        boxSizing: "border-box",
        padding: `${PAGE.padding}pt`,
        background: "#fff",
        color: th.text,
        fontFamily: textFamily,
      }}
    >
      <div style={{ display: "flex", gap: `${PAGE.gap / 2}pt`, alignItems: "stretch" }}>
      <style>{fontFaceCss([titleFont, textFont].filter((f): f is ResolvedFont => !!f))}</style>

      <div style={{ width: `${resume.leftWidthPct}%`, minWidth: 0 }}>
        <div style={{ paddingTop: "34pt", marginBottom: "26pt" }}>
          <div style={{ fontFamily: titleFamily, fontWeight: 700, fontSize: `${th.name}pt`, lineHeight: 1.1 }}>
            {profile.fullName || " "}
          </div>
          {profile.headline && <div style={{ fontSize: `${th.headline}pt`, marginTop: "12pt" }}>{profile.headline}</div>}
        </div>

        {experiences.length > 0 && (
          <div style={{ marginBottom: "18pt" }}>
            {label(t("Ervaring"))}
            {experiences.map((e) => (
              <Entry key={`e${e.refId}`} entry={e} titleFamily={titleFamily} th={th} />
            ))}
          </div>
        )}

        {educations.length > 0 && (
          <div>
            {label(t("Opleiding"))}
            {educations.map((e) => (
              <Entry key={`o${e.refId}`} entry={e} titleFamily={titleFamily} th={th} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, borderLeft: `0.75pt solid ${accent}`, paddingLeft: `${PAGE.gap / 2}pt` }}>
        {profile.photoPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoPath}
            alt=""
            style={{
              width: "100%",
              maxWidth: "150pt",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: profile.photoShape === "circle" ? "50%" : "8%",
              display: "block",
              marginBottom: "20pt",
            }}
          />
        )}

        {(rows.length > 0 || profile.links.length > 0) && (
          <div style={{ marginBottom: "26pt" }}>
            {label(t("Persoonsgegevens"))}
            {rows.map((r) => (
              <div key={r.label} style={{ fontSize: `${th.side}pt`, lineHeight: 1.5, display: "flex", marginBottom: "1pt" }}>
                <span style={{ fontWeight: 700, width: `${th.sideLabelWidth}pt`, paddingRight: "4pt", flexShrink: 0, boxSizing: "border-box" }}>{t(r.label)}:</span>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{r.value}</span>
              </div>
            ))}
            {profile.links.length > 0 && (
              <div style={{ fontSize: `${th.side}pt`, lineHeight: 1.5, display: "flex", marginBottom: "1pt" }}>
                <span style={{ fontWeight: 700, width: `${th.sideLabelWidth}pt`, paddingRight: "4pt", flexShrink: 0, boxSizing: "border-box" }}>{t("Online")}:</span>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  {profile.links.map((l, i) => (
                    <span key={i}>
                      {i > 0 && " / "}
                      <span style={{ color: accent, textDecoration: "underline" }}>{l.label}</span>
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        {profile.skills.length > 0 && (
          <div style={{ marginBottom: "26pt" }}>
            {label(t("Vaardigheden"))}
            {list(profile.skills)}
          </div>
        )}
        {profile.languages.length > 0 && (
          <div style={{ marginBottom: "26pt" }}>
            {label(t("Talen"))}
            {list(profile.languages)}
          </div>
        )}
        {profile.hobbies.length > 0 && (
          <div>
            {label(t("Hobby's"))}
            {list(profile.hobbies)}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export function ResumePreview(props: ResumeDocumentProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>(0);
  const pagePx = (PAGE.width * 96) / 72;
  const pageHeightPx = (PAGE.height * 96) / 72;

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    const update = () => {
      setScale(Math.min(1, wrap.clientWidth / pagePx));
      setHeight(inner.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [pagePx]);

  const pages = height ? Math.ceil((height - 2) / pageHeightPx) : 1;

  return (
    <div>
      <div ref={wrapRef} className="w-full">
        <div
          className="relative shadow-2xl ring-1 ring-white/10"
          style={{ height: height * scale, width: pagePx * scale, overflow: "hidden" }}
        >
          <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: pagePx }}>
            <ResumeDocument {...props} />
          </div>
        </div>
      </div>
      {pages > 1 && (
        <p className="mt-2 text-xs text-amber-400">
          {t("Dit CV past niet op één pagina ({pages} pagina's in de PDF).", { pages: String(pages) })}
        </p>
      )}
    </div>
  );
}
