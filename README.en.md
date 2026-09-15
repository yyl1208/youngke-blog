<div align="center">

# youngke

**Using AI to keep expanding the edges of my ability**

Youngke's personal blog · fully static · black & white dual theme

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-000000?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-000000?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-000000?style=flat-square)](./LICENSE)

[Live site](https://yyl1208.github.io/youngke-blog/) · [中文](./README.md)

</div>

---

## What this is

No database, no backend, no accounts — the Markdown files under `content/` are the entire data source.

It serves two purposes at once:

- **A blog** — long-form writing I only publish once I've actually thought it through
- **A knowledge base** — the pitfalls I ran into at work, filed by domain so I can find them again instead of stepping in them twice

## Features

- **Fully static** — `next build` emits 17 HTML files. Drop them on any static host; there is no runtime backend whatsoever.
- **Content is just files** — publishing a post means committing a `.md`. No CMS, no draft states, no hidden fields: if the file is there, the page is there.
- **Two themes, black and white** — no accent color anywhere. With color tension driven to zero, hierarchy comes entirely from typography: inverted blocks for focus, a wide type scale for depth, three levels of grey for text.
- **Client-side search** — hit `⌘K`. The index is generated at build time and shipped with the page, so the browser makes zero extra requests and pulls in no search library.
- **Highlighting at build time** — Shiki colors code into static HTML, with separate light and dark palettes. The browser downloads no highlighting scripts.
- **RSS** — `/rss.xml` is a build artifact too.
- **Zero web fonts** — a CJK web font runs several megabytes and is the single biggest performance killer for a Chinese-language site, so there are none. System font stacks plus `letter-spacing` / `line-height` tuning instead.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | `output: 'export'` for a fully static build; Server Components turn Markdown into HTML at build time |
| UI | React 19 | Mostly Server Components — only genuinely interactive pieces are pushed down to the client |
| Styling | Hand-written CSS + CSS variables | The stylesheet is small, and variables handle two themes with more control and one less dependency than a framework |
| Content | Markdown + unified | remark-parse → remark-gfm → remark-rehype → rehype-slug |
| Highlighting | Shiki (dual theme) | Done at build time, so it costs the browser nothing, with separate palettes per theme |
| Icons | lucide-react | Tree-shaken — only the handful actually used end up in the bundle |

**The only runtime dependencies are Next and React.** Markdown parsing, syntax highlighting, and search indexing all happen on the build machine; the browser receives plain static HTML.

## Getting started

```bash
npm install
npm run dev              # dev server at http://localhost:3000
npm run build            # static output goes to out/
npm run typecheck        # type check
```

Previewing a production build (the output is fully static — no backend involved):

```bash
python3 -m http.server 4173 --directory out
# → http://localhost:4173/
```

> Only GitHub Pages deployments carry a `/youngke-blog` prefix on asset URLs (see Deployment). That is the one case where you need to simulate an extra path segment.

## Writing content

**The core rule: the Git repository is the only data source.**

```
content/
├── posts/        one file per article; the filename becomes the URL
└── knowledge/    knowledge entries, grouped by domain
```

Three ways to publish, depending on where you are:

**1. CLI scaffold (from a computer)**

```bash
npm run new:post "Vite 插件的 resolveId 踩坑"   # → content/posts/vite-插件的-resolveid-踩坑.md
npm run new:knowledge "Turf 几何校验"           # → content/knowledge/turf-几何校验.md
```

The generated file already has its frontmatter skeleton filled in (title and date included) — just write the body.

**2. New file on github.com (from a phone)**

Open the repo → go to `content/posts/` → Add file → paste the frontmatter below and write → Commit. The commit triggers the build and the site updates a minute or two later.

**3. By hand, locally**

````markdown
---
title: 文章标题
date: 2026-09-15
tags: [react, vite]
summary: 一句话摘要，选填
---

正文从这里开始。支持 GFM 表格、任务列表、删除线。

```ts
const a = 1
```
````

**Frontmatter fields**

| Field | Required | Purpose |
|---|---|---|
| `title` | yes | Post title; falls back to the filename |
| `date` | yes | Drives sorting and archive grouping. **Don't quote it** — date parsing already handles both forms |
| `tags` | no | Feeds the tag cloud on the archive page |
| `summary` | no | List-page excerpt and RSS description |
| `domain` / `project` | knowledge entries | Domain (for grouping) and source project, in place of `tags` |

Reading time is computed automatically at 300 characters per minute for mixed Chinese/English text — no need to fill it in.

**Publishing**

```bash
git add content/
git commit -m "post: 新文章标题"
git push
```

Pushing to `main` triggers GitHub Actions, which builds and deploys automatically.

## Site structure

| Route | Section | Source |
|---|---|---|
| `/` | Home | Manifesto + recent posts + recent notes + a condensed résumé timeline + section links |
| `/posts` | Posts | `content/posts/` |
| `/posts/[slug]` | Post detail | Same, rendered at build time |
| `/knowledge` | Knowledge base | `content/knowledge/`, grouped by `domain` |
| `/journey` | Journey | `lib/journey.ts`, hand-maintained structured data |
| `/archive` | Archive | Every post indexed by year and by tag |
| `/about` | About | Inline in `app/about/page.tsx` |
| `/rss.xml` | RSS | Generated at build time |

## Design notes

**Theme**: black and white, two of them (pure white for light, near-black for dark). Once color tension is removed, "not monotonous" has to come from typographic contrast — inverted blocks for focus, type scale for depth, card borders for volume.

Three rules to keep when changing styles:

1. **Only two ways to focus attention**: an inverted block (`.mark`, black on white and vice versa) and a jump in type size. There is no accent color.
2. **Use the inverted block sparingly.** It stops being valuable the moment it's everywhere.
3. **Never load a web font.** Tune the system font stack with `letter-spacing` and `line-height` instead.

### Details that are easy to miss

| Detail | Implementation |
|---|---|
| Aligned figures | `.tnum` → `font-variant-numeric: tabular-nums`, so dates line up in a column |
| Tightened large type | The 40px manifesto carries `letter-spacing: -0.035em` — the bigger the type, the tighter it should be |
| Three levels of grey | `--fg` / `--fg-2` / `--fg-3`; hierarchy from greyscale, not from color |
| Subtle hover | Cards lift 2px over 200ms; past 3px it starts to feel cheap |
| No flash on load | An inline script in `layout.tsx` sets the theme before styles apply; the toggle icons are driven by `[data-theme]` in CSS, so they're already correct before hydration |
| Grid texture | `--grid` stays within a hair of the background (`#f1f1f1` / `#171717`) — any stronger and it looks dirty |

### Color tokens

Both themes share one set of variable names; switching only changes `<html data-theme>`:

| Token | light | dark |
|---|---|---|
| `--bg` | `#ffffff` | `#0a0a0a` |
| `--fg` | `#000000` | `#ffffff` |
| `--fg-2` | `#666666` | `#999999` |
| `--fg-3` | `#9b9b9b` | `#666666` |
| `--line` | `#e6e6e6` | `#232323` |
| `--inverse-bg` | `#000000` | `#ffffff` |

## Project layout

```
youngke-blog/
├── app/                     # routes (App Router)
│   ├── page.tsx             # home
│   ├── layout.tsx           # header / footer / anti-flash theme script
│   ├── template.tsx         # route transition animation
│   ├── posts/               # post list + detail
│   ├── knowledge/           # knowledge base list + detail
│   ├── journey/             # journey (timeline)
│   ├── archive/             # archive
│   ├── about/               # about
│   ├── rss.xml/route.ts     # RSS generated at build time
│   └── globals.css          # all styles; design tokens live here
├── components/
│   ├── Header.tsx           # sticky header (adds a divider once scrolled)
│   ├── Nav.tsx              # active-link highlighting
│   ├── SearchBox.tsx        # ⌘K search panel
│   ├── ThemeToggle.tsx      # theme switch (sun/moon cross-fade)
│   └── icons.tsx            # GitHub icon (lucide 1.x dropped brand icons)
├── content/
│   ├── posts/               # post sources
│   └── knowledge/           # knowledge entry sources
├── lib/
│   ├── posts.ts             # Markdown reading + rendering
│   ├── knowledge.ts         # knowledge base grouping by domain
│   ├── journey.ts           # résumé data
│   └── site.ts              # site constants (domain / repo name / contact)
└── scripts/new.mjs          # dependency-free content scaffold
```

## Deployment

`out/` is plain HTML/CSS/JS — it runs on any static host. The live site is hosted on **Tencent Cloud EdgeOne Pages** behind a custom domain.

### Primary: EdgeOne Pages + custom domain

Zero cost: 50 GB of traffic per month, unlimited builds, automatic HTTPS certificates, and edge nodes inside mainland China. Connect the GitHub repo once and every push builds and deploys — no manual uploads.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `out` |
| Node version | 22 |
| Environment variable | `SITE_URL=https://your-domain` |

Then add the custom domain in the console and create the CNAME record it asks for.

### Alternative: GitHub Pages

The repo keeps `.github/workflows/deploy.yml`, but it is now **manual-trigger only** (`workflow_dispatch`), so the default site doesn't generate failing runs. Use it for a GitHub Pages mirror; its build automatically adds the `/youngke-blog` subpath prefix. On first use, set **Settings → Pages → Source** to **GitHub Actions**.

### Where the path prefix comes from

One codebase has to serve both a domain root and a GitHub Pages subpath, so `lib/site.ts` carries a single switch:

| Deployment | `basePath` |
|---|---|
| Custom domain (default, site at the root) | `''` |
| GitHub Pages (`DEPLOY_TARGET=github-pages`) | `/youngke-blog` |

The absolute site URL (used by RSS and metadata) comes from the `SITE_URL` environment variable; when unset, the GitHub Pages form falls back to `https://yyl1208.github.io/youngke-blog`.

Changing domains means changing an environment variable or `lib/site.ts` — nothing else.

## Deliberate trade-offs

- **Search matches titles only**, not full text. That's plenty at this scale, and a real index would conflict with the zero-dependency goal. Worth revisiting past a hundred posts.
- **No comments** — a personal site doesn't need them, and it avoids third-party scripts plus moderation overhead.
- **No analytics** — keeps the site truly static, with no backend and no tracking. If needed, a third-party service is a one-line script.
- **No pagination** — the archive page fits on one screen at this volume.

## License

[MIT](./LICENSE)
