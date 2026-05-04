# Avengers Retirement Home — Design Spec

Retheme the `/subscribers` example with an "Avengers Retirement Home" metaphor. Replace the external JSONPlaceholder data source with a local in-memory array. Only retired Avengers can subscribe; everyone else gets a gentle rejection.

## Tone

Gentle humor. One universal rejection message for non-retirees.

## Data Layer

New file: `src/data/heroes.ts`

```ts
export type Hero = {
  id: number;
  name: string;
  alias: string;
  email: string;
  retiredYear: number;
};
```

Pre-populated roster:

| name              | alias            | email                 | retiredYear |
| ----------------- | ---------------- | --------------------- | ----------- |
| Steve Rogers      | Captain America  | steve@rogers.com      | 2023        |
| Tony Stark        | Iron Man         | tony@stark.com        | 2019        |
| Natasha Romanoff  | Black Widow      | natasha@romanoff.com  | 2019        |
| Clint Barton      | Hawkeye          | clint@barton.com      | 2024        |
| Bruce Banner      | Hulk             | bruce@banner.com      | 2023        |

Export both the array and a derived set of allowed emails.

## API Routes

Same file structure, same signatures. Replace `fetch(USERS_URL)` with local import:

- `GET /api/subscribers/` — returns full heroes array as JSON
- `GET /api/subscribers/[id]` — returns single hero by id

## Action

`src/actions/index.ts`:

- Input: `{ email: z.string().email() }` (unchanged)
- Check email against allowed emails from `src/data/heroes.ts`
- Match: return `{ email, name, message }` with a personalized welcome using the hero's first name (e.g. "Welcome back, Steve! Enjoy your retirement.")
- No match: throw `ActionError({ code: "FORBIDDEN", message: "Sorry, only retired Avengers can join. Come back when you've hung up the cape!" })`

## Subscribers Page

`src/pages/subscribers.astro` (keeps `prerender = false`):

- Title: "Avengers Retirement Home"
- Subtitle: "Hung up the shield? Join the club."
- List shows **alias** (left) and **email** (right) for each hero
- On action success: hero appended to displayed list for that request
- On action error: red message below form
- Back link to home

## Home Page

`src/pages/index.astro`:

- Update link description to "Avengers Retirement Home — API routes & Actions"

## Files Changed

- `src/data/heroes.ts` (new)
- `src/pages/api/subscribers/index.ts` (modify)
- `src/pages/api/subscribers/[id].ts` (modify)
- `src/actions/index.ts` (modify)
- `src/pages/subscribers.astro` (modify)
- `src/pages/index.astro` (modify)
- `CLAUDE.md` (update example description)
- `README.md` (update example description)
