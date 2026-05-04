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

1. **API Routes** (`src/pages/api/`) — standard REST endpoints exporting `GET`/`POST`/etc. as `APIRoute` functions that return `new Response(...)`. The subscribers routes proxy JSONPlaceholder as a demo data source.
2. **Astro Actions** (`src/actions/index.ts`) — form-based mutations using `defineAction` with Zod validation via `astro:schema`. Consumed in pages via `actions` import from `astro:actions` and `Astro.getActionResult()`.

### Subscribers example (`/subscribers`)

Demonstrates API routes + Astro Actions. The subscriber list comes from JSONPlaceholder (not persisted). The subscribe action only accepts `steve@rogers.com` — any other email throws an `ActionError`. On success, Steve's email is appended to the displayed list for that request. Nothing is saved; it's a demo.

## Conventions

- Tailwind 4: imported via `@import "tailwindcss"` in `src/styles/global.css`, configured as a Vite plugin in `astro.config.mjs` (not `@astrojs/tailwind`).
- Use `pnpm`, not `npm`.
