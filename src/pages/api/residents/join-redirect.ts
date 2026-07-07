// src/pages/api/residents/join-redirect.ts
import type { APIRoute, APIContext } from "astro";
import { heroes, residents } from "@/data/heroes";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }: APIContext) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");

  const hero = heroes.find((h) => h.email === email);
  if (!hero) {
    const reason = `${email} is not on the hero roster.`;
    return redirect(`/rejected?reason=${encodeURIComponent(reason)}`, 307);
  }

  const firstName = hero.name.split(" ")[0];
  if (residents.find((r) => r.email === email)) {
    return redirect(`/welcome?name=${encodeURIComponent(firstName)}&already=1`, 307);
  }

  residents.push(hero);
  return redirect(`/welcome?name=${encodeURIComponent(firstName)}`, 307);
};
