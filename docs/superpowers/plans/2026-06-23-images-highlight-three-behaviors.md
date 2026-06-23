# Images Example — Highlight Three Astro Behaviors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make three Astro image behaviors concrete and runnable in the `/images` example: (1) `fit`/`position` props as the correct crop lever vs Tailwind-class cascade collision and `responsiveStyles: false` as the alternative; (2) same-source two-crop producing two distinct build-time output files; (3) Astro v6's hashed-class emission (instead of inline style) making `style="opacity:0"` on `<img>` and `pictureAttributes.style` on `<picture>` both safe.

**Architecture:** Two tasks. Task 1 adds a 6th strategy `cropped` to `DemoImage.astro` that demonstrates items 1 and 2: thumb is 4:3 (640×480), cover is 16:9 (1280×720), both use `fit="cover"`, both crop the same 3:2 source → two distinct hashed output files. A comment block inside the branch teaches the Tailwind-vs-fit-prop tradeoff. Task 2 annotates the existing `lqip` branch with a comment that explains v6's `data-astro-image`/hashed-class emission and why it makes both `style` props safe; a curl smoke-test on the built HTML confirms the attribute is present.

**Tech Stack:** Astro 6.4.8, `astro:assets` `<Picture>`, Tailwind CSS v4 (via `@tailwindcss/vite`), `serve` (already in devDeps for `pnpm preview`).

## Global Constraints

- **Astro pinned to `^6.4.8`.** Do NOT upgrade to 7.x.
- **Package manager is `pnpm`.** No `npm`/`yarn`.
- **No test framework.** Verification by `astro check`, `pnpm build`, and `curl` smoke tests.
- **Imports are relative.** No path aliases.
- **Routes are static.** No `export const prerender = false` on any images route.
- **`responsiveStyles: true` stays in `astro.config.mjs`** — the behaviors being taught depend on it being enabled.

---

### Task 1: `cropped` strategy (items 1 + 2)

Adds a 6th strategy to `DemoImage.astro` that teaches two behaviors in one branch: `fit`/`position` props as the correct lever for object-fit/crop (item 1), and the fact that two `<Picture>` usages of the same source at different dimensions produce two separate hashed output files at build time (item 2).

**Files:**
- Modify: `src/components/DemoImage.astro`
- Modify: `src/pages/images/index.astro` (hub — add `cropped` entry)
- Modify: `src/pages/images/[strategy]/index.astro` (list — add `"cropped"` to `Type Strategy` and `strategies` const)
- Modify: `src/pages/images/[strategy]/[id].astro` (detail — same two additions)

**Interfaces:**
- Consumes: existing `isCover`, `loading`, `fetchpriority`, `autoSizes`, `image`, `item` locals already in `DemoImage.astro`. Does NOT use `width`/`height` locals — uses inline literals to produce a non-3:2 aspect.
- Produces: new strategy branch rendered in list (640×480 thumb) and detail (1280×720 cover); new routes `/images/cropped` and `/images/cropped/[id]`.

- [ ] **Step 1: Add `cropped` branch to `DemoImage.astro`**

In `src/components/DemoImage.astro`, extend the `Props` strategy union and add the new branch. The `Props` interface line becomes:

```ts
strategy: "naive" | "manual" | "auto" | "pixel-perfect" | "lqip" | "cropped";
```

Append the following block after the closing `}` of the `lqip` branch (at the end of the template):

```astro
{
  strategy === "cropped" && image && (
    /* item 1 — fit/position props are the correct lever for object-fit behavior.
       Using a Tailwind class like `object-cover` would be silently overridden:
       Astro's generated responsive styles are declared without @layer, so they
       beat Tailwind's cascade-layered utilities every time. Two valid fixes:
         (a) fit="cover" prop (shown here) — precise, per-component.
         (b) responsiveStyles: false in astro.config.mjs — disables Astro's
             generated styles globally; you then own all object-fit/position CSS.

       item 2 — same source, two <Picture> calls with different dimensions =
       two separate hashed files at build time. Thumb is 640×480 (4:3),
       cover is 1280×720 (16:9). Both crop the same 2400×1600 source via
       fit="cover". Verify after build: dist/_astro/ has more files than
       strategies that use one dimension per source. */
    <Picture
      src={image}
      formats={["avif", "webp"]}
      layout="constrained"
      width={isCover ? 1280 : 640}
      height={isCover ? 720 : 480}
      fit="cover"
      position={isCover ? "top" : "center"}
      sizes={autoSizes}
      loading={loading}
      fetchpriority={fetchpriority}
      alt={item.alt}
      class="block w-full"
    />
  )
}
```

- [ ] **Step 2: Add `cropped` to the hub**

In `src/pages/images/index.astro`, append one entry to the `strategies` array:

```ts
const strategies = [
  { id: "naive",         title: "Naive",         blurb: "Plain <img>, full-size, no srcset/sizes/dimensions. The measurement floor." },
  { id: "manual",        title: "Manual",         blurb: "Hand-cut widths + srcset/sizes + baked blur over public/ files. The bash era, done right." },
  { id: "auto",          title: "Auto",           blurb: "<Picture> generates formats, srcset, sizes, and width/height. Toil deleted." },
  { id: "pixel-perfect", title: "Pixel-perfect",  blurb: "sizes computed from layout tokens so the served file lands on the slot." },
  { id: "lqip",          title: "LQIP",           blurb: "Auto plus a getImage() blurred placeholder and a cache-guarded fade-in." },
  { id: "cropped",       title: "Cropped",        blurb: "fit/position props crop the source to 4:3 thumb and 16:9 cover — two distinct build-time outputs from one source." },
];
```

- [ ] **Step 3: Add `cropped` to the list route**

In `src/pages/images/[strategy]/index.astro`, update the `Type Strategy` union and `strategies` const inside `getStaticPaths`:

```ts
type Strategy = "naive" | "manual" | "auto" | "pixel-perfect" | "lqip" | "cropped";

export function getStaticPaths() {
  const strategies = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped"] as const;
  return strategies.map((strategy) => ({ params: { strategy } }));
}
```

- [ ] **Step 4: Add `cropped` to the detail route**

In `src/pages/images/[strategy]/[id].astro`, make the same two changes:

```ts
type Strategy = "naive" | "manual" | "auto" | "pixel-perfect" | "lqip" | "cropped";

export function getStaticPaths() {
  const strategies = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped"] as const;
  return strategies.flatMap((strategy) =>
    gallery.map((item) => ({ params: { strategy, id: item.id }, props: { item } })),
  );
}
```

- [ ] **Step 5: Type-check and build**

Run:

```bash
pnpm exec astro check && pnpm gen:images && pnpm exec astro build
```

Expected: `astro check` reports `0 errors`; build completes; the log shows `cropped` detail pages prerendered (6 strategies × 20 items = 120 detail routes total, up from 100).

Verify routes and two-output-file behavior:

```bash
ls dist/images/cropped/index.html dist/images/cropped/photo-01/index.html
```

Expected: both paths exist.

Then count the distinct hashed files and confirm `cropped` produced more per-source outputs. Check one detail page to see two `<source>` URLs with different suffixes (thumb crop vs cover crop):

```bash
grep -o '_astro/[^"]*\.webp' dist/images/cropped/photo-01/index.html | sort -u
```

Expected: two distinct `_astro/*.webp` paths for the same source — one for the 640×480 crop (from the list page's `import.meta.glob`) and one for the 1280×720 crop (detail page). (They share the same source file but have different dimension hashes.)

- [ ] **Step 6: Smoke-test the served routes**

```bash
pnpm preview &
PREVIEW_PID=$!
sleep 2
curl -s http://localhost:4321/images | grep -c "Cropped"
curl -s http://localhost:4321/images/cropped | grep -c "picture"
kill $PREVIEW_PID
```

Expected: hub contains "Cropped" (≥1); list page contains `<picture` elements (≥1).

- [ ] **Step 7: Commit**

```bash
git add src/components/DemoImage.astro src/pages/images/index.astro src/pages/images/\[strategy\]/index.astro src/pages/images/\[strategy\]/\[id\].astro
git commit -m "feat(images): add cropped strategy (fit/position props + two-output-file demo)"
```

---

### Task 2: v6 emission annotation on the LQIP branch (item 3)

Adds a comment block to the `lqip` branch in `DemoImage.astro` explaining the Astro v6 emission detail: `responsiveStyles: true` emits a hashed CSS class + `data-astro-image`/`data-astro-fit`/`data-astro-pos` attributes on the `<img>` — **not** inline `style="object-fit:cover"`. This makes two things safe that would otherwise look risky: (a) `style="opacity:0;transition:..."` on `<Picture>` (→ `<img>`) is never overwritten by Astro's responsive output; (b) `pictureAttributes={{ style: "background-image:..." }}` targets the `<picture>` wrapper (a different element), so no cascade collision.

The curl smoke-test on the built HTML confirms `data-astro-image` is present on the output `<img>`, making the v6 behavior observable without reading source code.

**Files:**
- Modify: `src/components/DemoImage.astro` (comment only, no logic change)

**Interfaces:**
- No interface changes. Comment replaces the existing terse `/* auto + getImage placeholder... */` comment on the `lqip` branch with a richer explanation.

- [ ] **Step 1: Replace the lqip branch comment**

In `src/components/DemoImage.astro`, find the `lqip` branch. Its current opening comment is:

```astro
    /* auto + getImage placeholder + opacity:0 fade (reveal-img.ts), cache-guarded */
```

Replace the entire `lqip` block's JSX comment with:

```astro
    /* v6 emission detail — responsiveStyles: true makes Astro emit a hashed CSS
       class (e.g. class="astro-XXXXXXXX") and data-astro-image="constrained" on
       the <img>. It does NOT inject inline style="object-fit:…" on <img>.
       Two consequences that otherwise look risky:

       (a) style="opacity:0;transition:…" on <Picture> (→ the <img> element)
           is never overwritten by Astro's responsive output — Astro's object-fit
           rule lives in a generated stylesheet, not in an inline style attribute.

       (b) pictureAttributes={{ style: "background-image:url(…);…" }} targets
           the <picture> wrapper element, not <img> — zero cascade collision.

       Run: curl http://localhost:4321/images/lqip/photo-01 | grep data-astro-image
       to see the attribute emitted in the built HTML. */
```

After replacement the full `lqip` block reads:

```astro
{
  strategy === "lqip" && image && (
    /* v6 emission detail — responsiveStyles: true makes Astro emit a hashed CSS
       class (e.g. class="astro-XXXXXXXX") and data-astro-image="constrained" on
       the <img>. It does NOT inject inline style="object-fit:…" on <img>.
       Two consequences that otherwise look risky:

       (a) style="opacity:0;transition:…" on <Picture> (→ the <img> element)
           is never overwritten by Astro's responsive output — Astro's object-fit
           rule lives in a generated stylesheet, not in an inline style attribute.

       (b) pictureAttributes={{ style: "background-image:url(…);…" }} targets
           the <picture> wrapper element, not <img> — zero cascade collision.

       Run: curl http://localhost:4321/images/lqip/photo-01 | grep data-astro-image
       to see the attribute emitted in the built HTML. */
    <Picture
      src={image}
      formats={["avif", "webp"]}
      layout="constrained"
      width={width}
      sizes={autoSizes}
      loading={loading}
      fetchpriority={fetchpriority}
      alt={item.alt}
      class="reveal-img block w-full"
      style="opacity:0;transition:opacity .4s ease"
      pictureAttributes={{
        style: `background-image:url(${placeholder});background-size:cover`,
      }}
    />
  )
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm exec astro check
```

Expected: `0 errors`. (Comment-only change; this confirms the surrounding template still type-checks.)

- [ ] **Step 3: Build and verify `data-astro-image` in the emitted HTML**

```bash
pnpm exec astro build
pnpm preview &
PREVIEW_PID=$!
sleep 2
curl -s http://localhost:4321/images/lqip/photo-01 | grep -o 'data-astro-image="[^"]*"' | head -1
kill $PREVIEW_PID
```

Expected output: `data-astro-image="constrained"` — the v6 attribute the comment describes, visible in the actual built HTML.

- [ ] **Step 4: Commit**

```bash
git add src/components/DemoImage.astro
git commit -m "docs(images): annotate lqip branch with v6 emission detail"
```

---

## Self-Review Notes

- **Item 1 (fit/position props):** Taught via the comment in the `cropped` branch (Step 1) — names both the correct fix (`fit` prop) and the alternative (`responsiveStyles: false`), and explains why Tailwind's `object-cover` class loses (cascade layer).
- **Item 2 (two output files):** Made observable via the `grep '_astro/…webp'` check in Task 1 Step 5 — the two distinct paths for the same source at different crop dimensions confirm the two-file behavior.
- **Item 3 (v6 emission):** Taught via the comment in Task 2, confirmed observable via the `grep data-astro-image` smoke-test in Task 2 Step 3.
- **No new routes, data files, or dependencies** — both tasks are additive with zero new infrastructure.
- **No test framework** — verification via `astro check`, `pnpm build`, artifact inspection, and `curl` smoke-tests (per project constraint).
