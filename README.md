# Astro Playground

A collection of examples exploring Astro 6 features.

Companion repository for the blog post
[Adding API Endpoints to an Astro Project](https://dev.jeromeabel.net/blog/api-endpoints-with-astro).

## Live demo

https://astro-playground-jeromeabel.netlify.app/

## Setup

```sh
pnpm install
pnpm dev
```

## Examples

- **[/residents](./src/pages/residents/index.astro)** — five server-side patterns:
  - `GET /api/residents/` — list residents
  - `GET /api/residents/[id]` — fetch one hero
  - `POST + redirect` (Pattern A) — `pages/residents/join-redirect.astro`
  - `POST + JSON` (Pattern B) — `pages/residents/join-json.astro`
  - `Astro Action` (Pattern C) — `pages/residents/join-action.astro`

The `residents` list lives in memory in `src/data/heroes.ts` and resets on
every cold start — see the blog post for the rationale.
