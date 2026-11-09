# Frontend Resume Module Guide

## Route Map (`frontend/src/app/resume/`)
| Path | Page | Client | Responsibility |
|------|------|--------|----------------|
| `/resume` | `page.tsx` | `client.tsx` | List of resumes, create (with all items selected), duplicate, delete |
| `/resume/[id]` | `[id]/page.tsx` | `[id]/client.tsx` | Editor: name, fonts (`font-picker.tsx`), column width slider (5% steps), accent colour, select/reorder items (drag handle with insertion line, arrows on mobile), per-CV description override, live preview, PDF export. Autosaves (600ms debounce) |
| `/resume/profile` | `profile/page.tsx` | `profile/client.tsx` | Photo (circle/square), persoonsgegevens, links, skills/languages/hobbies |
| `/resume/experience`, `/resume/education` | `*/page.tsx` | `library.tsx` (shared) | CRUD for the ervaring/opleiding library |

## Key Components & Libraries
- `pdf/resume-pdf-preview.tsx`: live preview. Renders the actual PDF from `buildResumePDFBlob` (debounced 400ms) to canvas pages with `pdfjs-dist`, so it is identical to the download.
- `pdf/resume-pdf.tsx`: `@react-pdf/renderer` layout, the single source for both preview and download (lazy loaded, `downloadResumePDF`). Sizes come from `resumeTheme`/`PAGE` in `resume.ts` (pt units). The photo is loaded through `api.resume.photo`.
- `resume.ts`: date formatting (Dutch months), column snapping, curated fonts (`CURATED_FONTS`, mirrored in the backend; keep both in sync). `resume-fonts.ts`: resolves curated/Google fonts to URLs. `resume.test.ts` covers `resume.ts`.
- API client stays in `lib/api/resume.ts`, translations in `lib/resume-lang.ts`.
- Curated font TTFs are in `public/fonts/resume/` (react-pdf needs TTF, not woff2).
- Entries show the job title/degree in bold first, then organisation and place.
