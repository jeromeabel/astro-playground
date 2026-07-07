// src/pages/api/residents/join-json.ts
import type { APIRoute, APIContext } from "astro";
import { heroes, residents } from "@/data/heroes";

export const prerender = false;

type JoinResponse = { ok: boolean; settled?: boolean; msg: string };

export const POST: APIRoute = async ({ request }: APIContext) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");

  const hero = heroes.find((h) => h.email === email);
  if (!hero) {
    return json({ ok: false, msg: `Sorry, ${email} is not on the hero roster.` });
  }

  const firstName = hero.name.split(" ")[0];
  if (residents.find((r) => r.email === email)) {
    return json({ ok: true, settled: true, msg: `${firstName}, you're already settled in!` });
  }

  residents.push(hero);
  return json({ ok: true, settled: false, msg: `Welcome, ${firstName}! Your slippers await.` });
};

function json(body: JoinResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
