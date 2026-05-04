# Avengers Retirement Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme the `/subscribers` example as an "Avengers Retirement Home" — replacing JSONPlaceholder with a local heroes array and updating the action to gate subscriptions to known retired Avengers only.

**Architecture:** A new `src/data/heroes.ts` module becomes the single source of truth for all hero data. The two API routes and the action import from it, removing the external network dependency entirely. The Astro page is updated with new copy and layout without changing its render pattern.

**Tech Stack:** Astro 6, Astro Actions, Zod (via `astro:schema`), TypeScript, Tailwind CSS 4

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/data/heroes.ts` | **Create** | Hero type, pre-populated roster array, derived allowed-email set |
| `src/pages/api/subscribers/index.ts` | **Modify** | Replace `fetch(USERS_URL)` with local heroes import |
| `src/pages/api/subscribers/[id].ts` | **Modify** | Replace `fetch(USERS_URL)` with local heroes import |
| `src/actions/index.ts` | **Modify** | Check email against allowed set; personalized welcome or `FORBIDDEN` error |
| `src/pages/subscribers.astro` | **Modify** | Avengers theme, show alias + email, error styling |
| `src/pages/index.astro` | **Modify** | Update link description |
| `CLAUDE.md` | **Modify** | Update subscribers example description |

---

## Task 1: Create the heroes data module

**Files:**
- Create: `src/data/heroes.ts`

- [ ] **Step 1: Create `src/data/heroes.ts` with the Hero type and roster**

```ts
export type Hero = {
  id: number;
  name: string;
  alias: string;
  email: string;
  retiredYear: number;
};

export const heroes: Hero[] = [
  { id: 1, name: "Steve Rogers",     alias: "Captain America", email: "steve@rogers.com",   retiredYear: 2023 },
  { id: 2, name: "Tony Stark",       alias: "Iron Man",        email: "tony@stark.com",     retiredYear: 2019 },
  { id: 3, name: "Natasha Romanoff", alias: "Black Widow",     email: "natasha@romanoff.com", retiredYear: 2019 },
  { id: 4, name: "Clint Barton",     alias: "Hawkeye",         email: "clint@barton.com",   retiredYear: 2024 },
  { id: 5, name: "Bruce Banner",     alias: "Hulk",            email: "bruce@banner.com",   retiredYear: 2023 },
];

export const allowedEmails = new Set(heroes.map((h) => h.email));
```

- [ ] **Step 2: Verify TypeScript is happy**

Run: `pnpm build`
Expected: No type errors. (Build may fail on other things — that's fine for now; we only care about `src/data/heroes.ts` having zero type errors.)

- [ ] **Step 3: Commit**

```bash
git add src/data/heroes.ts
git commit -m "feat: add heroes data module with Avengers roster"
```

---

## Task 2: Update API route — GET /api/subscribers/

**Files:**
- Modify: `src/pages/api/subscribers/index.ts`

- [ ] **Step 1: Replace `fetch` with local import**

Replace the entire file with:

```ts
import type { APIRoute } from "astro";
import { heroes } from "../../data/heroes";

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(heroes));
};
```

Note: `async` is no longer needed — the handler is synchronous now.

- [ ] **Step 2: Manually verify the route**

Run: `pnpm dev`
Open: `http://localhost:4321/api/subscribers/`
Expected: JSON array of 5 heroes with `id`, `name`, `alias`, `email`, `retiredYear` fields.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/subscribers/index.ts
git commit -m "feat: subscribers GET route uses local heroes data"
```

---

## Task 3: Update API route — GET /api/subscribers/[id]

**Files:**
- Modify: `src/pages/api/subscribers/[id].ts`

- [ ] **Step 1: Replace `fetch` with local lookup**

Replace the entire file with:

```ts
import type { APIContext, APIRoute } from "astro";
import { heroes } from "../../data/heroes";

export const prerender = false;

export const GET: APIRoute = ({ params }: APIContext) => {
  const hero = heroes.find((h) => String(h.id) === params.id);
  if (!hero) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(hero));
};
```

- [ ] **Step 2: Manually verify the route**

With `pnpm dev` running:
- Open `http://localhost:4321/api/subscribers/1` → expect Steve Rogers object
- Open `http://localhost:4321/api/subscribers/99` → expect `{"error":"Not found"}` with HTTP 404

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/subscribers/[id].ts
git commit -m "feat: subscribers [id] route uses local heroes data"
```

---

## Task 4: Update the subscribe action

**Files:**
- Modify: `src/actions/index.ts`

- [ ] **Step 1: Replace the handler logic**

Replace the entire file with:

```ts
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { allowedEmails, heroes } from "../data/heroes";

export const server = {
  subscribe: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }) => {
      const hero = heroes.find((h) => h.email === email);
      if (!hero || !allowedEmails.has(email)) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Sorry, only retired Avengers can join. Come back when you've hung up the cape!",
        });
      }
      const firstName = hero.name.split(" ")[0];
      return {
        email,
        name: hero.name,
        message: `Welcome back, ${firstName}! Enjoy your retirement.`,
      };
    },
  }),
};
```

- [ ] **Step 2: Verify TypeScript**

Run: `pnpm build`
Expected: No type errors in `src/actions/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/actions/index.ts
git commit -m "feat: subscribe action gates on retired Avengers email list"
```

---

## Task 5: Retheme the subscribers page

**Files:**
- Modify: `src/pages/subscribers.astro`

- [ ] **Step 1: Replace the page**

Replace the entire file with:

```astro
---
export const prerender = false;

import { actions } from "astro:actions";
import { GET } from "./api/subscribers/index.ts";
import { type Hero } from "../data/heroes";
import "../styles/global.css";

const response = await GET(Astro);
const heroes: Hero[] = await response.json();
const result = Astro.getActionResult(actions.subscribe);

if (result && !result.error) {
  const newHero = heroes.find((h) => h.email === result.data.email);
  if (!newHero) {
    heroes.push({
      id: heroes.length + 1,
      name: result.data.name,
      alias: "?",
      email: result.data.email,
      retiredYear: new Date().getFullYear(),
    });
  }
}
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Avengers Retirement Home — Astro Playground</title>
  </head>
  <body class="min-h-screen bg-zinc-950 text-zinc-100">
    <main class="max-w-2xl mx-auto px-6 py-16 space-y-12">

      <a href="/" class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">&larr; Back</a>

      <section class="space-y-2">
        <h1 class="text-2xl font-semibold">Avengers Retirement Home</h1>
        <p class="text-zinc-400 text-sm">Hung up the shield? Join the club.</p>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-medium">Current Residents</h2>
        <ul class="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          {heroes.map((h) => (
            <li class="flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-900 transition-colors">
              <span class="font-medium">{h.alias}</span>
              <span class="text-zinc-400">{h.email}</span>
            </li>
          ))}
        </ul>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-medium">Request Admission</h2>
        <form method="POST" action={actions.subscribe} class="flex gap-3">
          <label class="sr-only" for="email">Email address</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            class="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            class="bg-zinc-100 text-zinc-950 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            Join
          </button>
        </form>
        {result && !result.error && (
          <p class="text-sm text-emerald-400">{result.data.message}</p>
        )}
        {result?.error && (
          <p class="text-sm text-red-400">{result.error.message}</p>
        )}
      </section>

    </main>
  </body>
</html>
```

- [ ] **Step 2: Test the full golden path manually**

With `pnpm dev` running, open `http://localhost:4321/subscribers`:

1. **List renders**: 5 heroes shown with alias on left, email on right.
2. **Valid submission**: Enter `tony@stark.com` → submit → green message "Welcome back, Tony! Enjoy your retirement." → Tony already in list (no duplicate).
3. **Invalid submission**: Enter `thor@asgard.com` → submit → red message "Sorry, only retired Avengers can join. Come back when you've hung up the cape!"
4. **Invalid email format**: Enter `notanemail` → browser native validation blocks submission.

- [ ] **Step 3: Commit**

```bash
git add src/pages/subscribers.astro
git commit -m "feat: retheme subscribers page as Avengers Retirement Home"
```

---

## Task 6: Update home page and CLAUDE.md

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the home page link description**

In `src/pages/index.astro`, find:

```ts
{ href: "/subscribers", title: "Subscribers", description: "API endpoints & Astro Actions" },
```

Replace with:

```ts
{ href: "/subscribers", title: "Avengers Retirement Home", description: "API routes & Actions" },
```

- [ ] **Step 2: Update CLAUDE.md — subscribers example section**

In `CLAUDE.md`, find the `### Subscribers example` section:

```markdown
### Subscribers example (`/subscribers`)

Demonstrates API routes + Astro Actions. The subscriber list comes from JSONPlaceholder (not persisted). The subscribe action only accepts `steve@rogers.com` — any other email throws an `ActionError`. On success, Steve's email is appended to the displayed list for that request. Nothing is saved; it's a demo.
```

Replace with:

```markdown
### Subscribers example (`/subscribers`)

Demonstrates API routes + Astro Actions with an "Avengers Retirement Home" theme. The hero roster lives in `src/data/heroes.ts` (not persisted — in-memory only). The subscribe action only accepts emails from the pre-defined retired Avengers list; any other email throws an `ActionError` with a humorous rejection message. On success, a personalized welcome is shown for that request. Nothing is saved; it's a demo.
```

- [ ] **Step 3: Verify the home page**

Open `http://localhost:4321/` → card should read "Avengers Retirement Home" with "API routes & Actions".

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro CLAUDE.md
git commit -m "docs: update home page and CLAUDE.md for Avengers Retirement Home"
```

---

## Task 7: Final build verification

- [ ] **Step 1: Run production build**

```bash
pnpm build
```

Expected: `astro check` passes (zero type errors), build completes successfully.

- [ ] **Step 2: Preview production build**

```bash
pnpm preview
```

Open `http://localhost:4321/` and repeat the manual tests from Task 5 Step 2 against the production build.

- [ ] **Step 3: Final commit (if any loose files remain)**

```bash
git status
# If anything unstaged, add and commit. Otherwise, done.
```
