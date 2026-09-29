import type { ResumeFull, ResumeEntry } from "@backend/types/shared";
import { PAGE, scaledTheme, formatPeriod, detailRows, type ResolvedFont } from "@/lib/resume";
import { resolveResumeFont } from "@/lib/resume-fonts";
import { t } from "@/lib/lang";

const registeredFonts = new Set<string>();
const photoCache = new Map<string, Promise<string | null>>();

function photoToDataUrl(path: string): Promise<string | null> {
  let cached = photoCache.get(path);
  if (!cached) {
    cached = fetchPhotoDataUrl(path);
    photoCache.set(path, cached);
    cached.then((v) => { if (!v) photoCache.delete(path); });
  }
  return cached;
}

async function fetchPhotoDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildResumePDFBlob(data: ResumeFull): Promise<Blob> {
  const { pdf, Document, Page, Text, View, Image, Link, Font } = await import("@react-pdf/renderer");
  const { resume, profile, experiences, educations } = data;

  const [titleResolved, textResolved, photo] = await Promise.all([
    resolveResumeFont(resume.titleFont),
    resolveResumeFont(resume.textFont),
    profile.photoPath ? photoToDataUrl(profile.photoPath) : Promise.resolve(null),
  ]);

  const registered = registeredFonts;
  const register = (font: ResolvedFont | null) => {
    if (!font) return "Helvetica";
    if (!registered.has(font.family)) {
      Font.register({
        family: font.family,
        fonts: [
          { src: new URL(font.regular, window.location.origin).href, fontWeight: 400 },
          { src: new URL(font.bold, window.location.origin).href, fontWeight: 700 },
        ],
      });
      registered.add(font.family);
    }
    return font.family;
  };
  const titleFamily = register(titleResolved);
  const textFamily = register(textResolved);
  Font.registerHyphenationCallback((word) => [word]);

  const accent = resume.accentColor;
  const th = scaledTheme(resume);
  const rows = detailRows(profile);
  const bold = (family: string) => (family === "Helvetica" ? { fontFamily: "Helvetica-Bold" } : { fontFamily: family, fontWeight: 700 as const });

  const label = (text: string) => (
    <Text style={{ ...bold(titleFamily), fontSize: th.label, color: accent, textTransform: "uppercase", marginBottom: 3 }}>{text}</Text>
  );

  const entry = (e: ResumeEntry) => (
    <View key={`${e.kind}${e.refId}`} style={{ marginBottom: 11 }} wrap={false}>
      <Text style={{ fontSize: th.entryTitle, lineHeight: 1.3 }}>
        <Text style={bold(titleFamily)}>{e.title}</Text>
        {(e.organization || e.place) ? ` — ${[e.organization, e.place].filter(Boolean).join(", ")}` : ""}
      </Text>
      <Text style={{ fontSize: th.period, color: th.muted, marginTop: 1.5 }}>{formatPeriod(e)}</Text>
      {e.description ? (
        <Text style={{ fontSize: th.body, color: th.muted, marginTop: 4, lineHeight: 1.5 }}>{e.description}</Text>
      ) : null}
    </View>
  );

  const list = (items: string[]) =>
    items.map((item, i) => (
      <Text key={i} style={{ fontSize: th.side, lineHeight: 1.5 }}>{item}</Text>
    ));

  const columnWidth = PAGE.width - PAGE.padding * 2 - PAGE.gap;
  const rightWidth = (columnWidth * (100 - resume.leftWidthPct)) / 100;
  const photoSize = Math.min(150, rightWidth - PAGE.gap / 2 - 0.75);

  const doc = (
    <Document title={resume.name} author={profile.fullName || undefined}>
      <Page size="A4" style={{ padding: PAGE.padding, fontFamily: textFamily, color: th.text, backgroundColor: "#ffffff" }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: `${resume.leftWidthPct}%`, marginRight: PAGE.gap / 2 }}>
            <View style={{ paddingTop: 34, marginBottom: 26 }}>
              <Text style={{ ...bold(titleFamily), fontSize: th.name, lineHeight: 1.1 }}>{profile.fullName || " "}</Text>
              {profile.headline ? <Text style={{ fontSize: th.headline, marginTop: 12 }}>{profile.headline}</Text> : null}
            </View>
            {experiences.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                {label(t("Ervaring"))}
                {experiences.map(entry)}
              </View>
            )}
            {educations.length > 0 && (
              <View>
                {label(t("Opleiding"))}
                {educations.map(entry)}
              </View>
            )}
          </View>

          <View style={{ flex: 1, borderLeftWidth: 0.75, borderLeftColor: accent, borderLeftStyle: "solid", paddingLeft: PAGE.gap / 2 }}>
            {photo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image
                src={photo}
                style={{
                  width: photoSize,
                  height: photoSize,
                  objectFit: "cover",
                  borderRadius: profile.photoShape === "circle" ? photoSize / 2 : photoSize * 0.08,
                  marginBottom: 20,
                }}
              />
            ) : null}

            {(rows.length > 0 || profile.links.length > 0) && (
              <View style={{ marginBottom: 26 }}>
                {label(t("Persoonsgegevens"))}
                {rows.map((r) => (
                  <View key={r.label} style={{ flexDirection: "row", marginBottom: 1 }}>
                    <Text style={{ ...bold(textFamily), fontSize: th.side, lineHeight: 1.5, width: th.sideLabelWidth, paddingRight: 4 }}>{t(r.label)}:</Text>
                    <Text style={{ fontSize: th.side, lineHeight: 1.5, flex: 1 }}>{r.value}</Text>
                  </View>
                ))}
                {profile.links.length > 0 && (
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ ...bold(textFamily), fontSize: th.side, lineHeight: 1.5, width: th.sideLabelWidth, paddingRight: 4 }}>{t("Online")}:</Text>
                    <Text style={{ fontSize: th.side, lineHeight: 1.5, flex: 1 }}>
                      {profile.links.map((l, i) => (
                        <Text key={i}>
                          {i > 0 ? " / " : ""}
                          <Link src={l.url} style={{ color: accent, textDecoration: "underline" }}>{l.label}</Link>
                        </Text>
                      ))}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {profile.skills.length > 0 && (
              <View style={{ marginBottom: 26 }}>{label(t("Vaardigheden"))}{list(profile.skills)}</View>
            )}
            {profile.languages.length > 0 && (
              <View style={{ marginBottom: 26 }}>{label(t("Talen"))}{list(profile.languages)}</View>
            )}
            {profile.hobbies.length > 0 && (
              <View>{label(t("Hobby's"))}{list(profile.hobbies)}</View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );

  return pdf(doc).toBlob();
}

export async function downloadResumePDF(data: ResumeFull) {
  const blob = await buildResumePDFBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(data.resume.name || "cv").replace(/[^a-zA-Z0-9-_ ]+/g, "").trim() || "cv"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
