# Life of Tad — Game Portfolio Roadmap

Last updated: 2025-10-06
Owner: @tamigore
Status: Draft

## Goals and success criteria

- Purpose: Create a polished portfolio page for “Life of Tad,” a 2D top‑down Zelda‑like game.
- Audience: Players, recruiters, collaborators, press.
- Calls to action: Play a web demo, watch trailer, view screenshots, contact/follow, download (if available).
- Success metrics:
  - Page loads < 2.5s on 4G, Lighthouse perf ≥ 90.
  - A11y score ≥ 90, fully responsive (mobile → desktop).
  - 6+ curated screenshots, 2–3 GIFs, 1 trailer (optional initially).
  - Clear feature list and short pitch; JSON‑LD schema included.

## Assumptions

- Engine/export TBD (Godot/Unity/Phaser/etc.). If web export is not ready, link to a download/itch.io instead.
- Site is hosted via GitHub Pages at `tamigore.github.io`.

## Deliverables

- A dedicated game page under `/games/life-of-tad/` (or `/life-of-tad.html`).
- Media assets: screenshots, GIFs, logo, banner/cover, optional trailer embed.
- Press kit page/section.
- SEO & social cards (Open Graph/Twitter), JSON‑LD `VideoGame` schema.
- Analytics + simple feedback/contact.

## Milestones and timeline (suggested)

1) Discover & content brief (0.5–1 day)
- One‑liner (≤ 12 words) and 50–80 word pitch
- Feature bullets (3–6), platforms, controls, inspirations
- Brand basics: color accents, font pairing
- Acceptance: Copy approved in a Google Doc/Markdown

2) Asset capture & processing (1–2 days)
- Capture 6–10 screenshots (native res, HUD on/off variants)
- Create 2–3 gameplay GIFs (6–8s, ≤ 6MB each)
- Optional: 30–60s trailer draft
- Export logo + key art/banner (social sizes)
- Acceptance: Files optimized and named per spec; quick review pass

3) Wireframes & visual design (0.5 day)
- Mobile‑first wireframe: hero, pitch, features, gallery, CTA, footer
- Choose typography (e.g., Google Fonts) and color tokens
- Acceptance: Wireframe screenshot and style tokens checked in

4) Build portfolio page (1–2 days)
- Create `/games/life-of-tad/` with `index.html`, `styles.css`, `gallery.js`
- Implement responsive layout, lightbox gallery, sticky CTA
- Add controls section, feature grid, credits
- Acceptance: Renders correctly on mobile/desktop, no console errors

5) SEO & social metadata (0.25 day)
- Title/description, canonical, Open Graph/Twitter images
- JSON‑LD `VideoGame` schema block
- Sitemap/robots and alt text pass
- Acceptance: Meta verified via validators; link preview OK

6) Demo integration (optional if not ready) (0.5–1 day)
- Embed web build (iframe) or link to itch.io/Steam
- Add fallback and “Play now” CTA
- Acceptance: Demo loads, basic perf check, instructions visible

7) Press kit (0.5 day)
- Factsheet, about, features, team/credits, contact, downloadables
- Acceptance: Press page accessible and linked in footer

8) Analytics & feedback (0.25 day)
- Add Plausible or GA4
- Contact: mailto or Formspree form
- Acceptance: First page view recorded; test message received

9) Launch & QA (0.25 day)
- Cross‑browser test (Chrome/Firefox/Edge/Safari on iOS)
- Broken links, 404 behavior, image lazy‑load
- Acceptance: Lighthouse ≥ 90 for Perf/A11y/Best/SEO

10) Maintenance loop (ongoing)
- Add devlog entries/screenshots with each game milestone
- Track roadmap, backlog and changelog

## Information architecture (IA)

- Games
  - Life of Tad (current project)
    - Hero: title + short pitch + CTA
    - Features grid
    - Media gallery (images/GIFs/video)
    - Controls & platform
    - Development notes/devlog teasers
    - Credits & contact
    - Press kit link

## Copy templates

- One‑liner: “A fast, explorative top‑down action‑adventure about <hook>.”
- Short pitch: “Explore <biomes/dungeons>, master <mechanic>, and uncover <story hook> in this 2D Zelda‑like. Built with <engine>. Play the web demo or follow development for updates.”
- Features: Verb‑led bullets, e.g. “Explore handcrafted dungeons,” “Master parry‑based combat,” “Collect and combine relics,” “Solve environmental puzzles.”

## Asset specs and naming

- Images: PNG for UI/logo; JPEG/WEBP for screenshots; sizes 1920×1080 primary, 1280×720 secondary
- GIFs: ≤ 6MB, 6–8 seconds, 720p; alt text describes action
- Social cards: 1200×630 (Open Graph), 1600×900 (Twitter)
- Naming: `life-of-tad_<yyyymmdd>_desc.ext` (e.g., `life-of-tad_20251006_boss-arena_01.jpg`)
- Folder: `/assets/life-of-tad/{screenshots,gifs,logos,banners}`

## Technical implementation checklist

- Page
  - Semantic HTML5 with landmarks (header/main/nav/footer)
  - CSS variables for theme; dark mode optional
  - Responsive grid/flex; prefers-reduced-motion respected
  - Lazy‑load images, `srcset`/`sizes` for responsive images
  - Lightweight lightbox (vanilla JS) or no‑JS fallback
- SEO
  - `<title>` ≤ 60 chars, `<meta name=description>` ≤ 160 chars
  - Open Graph/Twitter meta; canonical URL
  - JSON‑LD `VideoGame` schema block
- Performance
  - Preload hero image/font; compress images (oxipng/mozjpeg/squoosh)
  - Minify CSS/JS (if any); inline critical CSS
- Accessibility
  - Color contrast ≥ 4.5:1; focus states visible
  - Alt text on media; keyboard nav through gallery
  - Motion‑reduced animations

## Risks and mitigations

- Web demo not ready → Use trailer/GIFs + itch.io link first
- Heavy media slows page → Optimize and lazy‑load; defer embeds
- Time constraints → Ship MVP page, iterate weekly

## Issue tracker setup (suggested labels)

- `milestone: M1–M9`, `type: content`, `type: code`, `type: asset`, `a11y`, `seo`, `presskit`

## Definition of Done (DoD) per milestone

- Requirements complete; acceptance checks pass
- A11y/SEO/perf checks ≥ target
- Reviewed on mobile + desktop; merged to `master`

---

## Next actions

- Decide the page path: `/games/life-of-tad/` vs `/life-of-tad.html`.
- Gather content for M1 (one‑liner, pitch, features, controls, inspirations).
- Capture 2–3 initial screenshots to unblock layout work.
