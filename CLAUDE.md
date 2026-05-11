# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start dev server (http://localhost:4321)
- `pnpm build` — type-check (`astro check`) then build
- `pnpm preview` — preview production build

## Architecture

Astro 6 playground — a collection of standalone examples, each exploring a different Astro feature. The home page (`src/pages/index.astro`) is a minimal hub linking to each example.

Astro 6 with Tailwind CSS 4 (via Vite plugin, not Astro integration) and strict TypeScript.

**Rendering mode:** hybrid — pages are static by default; API routes, actions, and any page using `Astro.getActionResult()` must opt out with `export const prerender = false`.

**Two patterns for server logic:**

1. **API Routes** (`src/pages/api/`) — standard REST endpoints exporting `GET`/`POST`/etc. as `APIRoute` functions that return `new Response(...)`. The subscribers routes serve data from a local in-memory heroes array.
2. **Astro Actions** (`src/actions/index.ts`) — form-based mutations using `defineAction` with Zod validation via `astro:schema`. Consumed in pages via `actions` import from `astro:actions` and `Astro.getActionResult()`.

### Residents example (`/residents`)

Demonstrates API routes + Astro Actions with a generic "Heroes Retirement Home" theme. The hero roster lives in `src/data/heroes.ts` (not persisted — in-memory only). Three POST patterns are shown side by side: A (redirect), B (JSON), C (Astro Action). The `join` action only accepts emails from the pre-defined retired heroes list; any other email throws an `ActionError` with a rejection message. On success, a personalized welcome is shown for that request. Nothing is saved across cold starts; it's a demo.

Shared shell: `src/layouts/Layout.astro` provides the HTML head (favicons, theme-color) and a light-by-default body with `dark:` variants that follow `prefers-color-scheme`. Reusable bits live in `src/components/` (`Icon.astro` for inline SVG icons, `HeroPortrait.astro` for portraits with an initial-avatar fallback when `src/assets/heroes/{id}.jpg` is missing).

## Conventions

- Tailwind 4: imported via `@import "tailwindcss"` in `src/styles/global.css`, configured as a Vite plugin in `astro.config.mjs` (not `@astrojs/tailwind`).
- Use `pnpm`, not `npm`.
