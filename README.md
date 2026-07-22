# Islamic Covenant Theology — website

Static site. No build step, no dependencies, no framework. Deploys to Vercel as-is.

## Deploy

```bash
npx vercel --prod
```

Run it from inside this folder. When asked for settings, accept the defaults —
`vercel.json` already declares the project as static output with the correct
caching headers. Alternatively, push the folder to a Git repo and import it in
the Vercel dashboard; set **Framework Preset: Other** and leave the build
command empty.

## Run locally

```bash
python -m http.server 8788
```

Then open `http://localhost:8788`. It must be served over HTTP — opening
`index.html` from the filesystem will fail, because the pages `fetch()` their
data and SVGs and `file://` blocks that.

## Structure

```
index.html      landing page
browse.html     all 316 diagrams — search, domain filter, axis filter, lightbox
read.html       the six-chapter Urdu introduction
about.html      method, source hierarchy, axis colour key, limits
app.js          language state, data loading, SVG inlining, grid, lightbox
styles.css      all styling, including the Nastaliq @font-face
data/           diagrams.json (bilingual index), intro.json (chapter prose)
svg/en/         300 English diagrams
svg/ur/         316 Urdu diagrams (300 applications + 16 introduction)
fonts/          Noto Nastaliq Urdu (SIL Open Font License)
```

## Language

The EN/اردو toggle in the header stores a preference in `localStorage`.
A `?lang=ur` or `?lang=en` query parameter overrides and persists it, so you can
link straight into either language:

```
/browse.html?lang=ur&part=4
/read.html?ch=ch3
```

## One implementation note worth knowing

Urdu SVGs are **inlined into the DOM** by `app.js` rather than referenced with
`<img src>`. Chrome refuses to load an external `@font-face` from inside an
`<img>`-referenced SVG, so an `<img>` would silently render the Urdu in a
fallback Naskh instead of Nastaliq. Inlining lets the page's own font apply.
If you refactor the rendering, keep that constraint in mind.

The SVGs carry no embedded font (that would be ~240KB each). The font is
declared once in `styles.css`.

## Licensing / attribution

Noto Nastaliq Urdu is under the SIL Open Font License and is redistributed in
`fonts/`. The diagram and prose content is your own.

## A caution that belongs on the site, not just here

Every applied diagram is an *ijtihādī* application, not a fatwā. This is stated
on the landing page, the browse footer, and the method page — please keep it
there if you restyle.
