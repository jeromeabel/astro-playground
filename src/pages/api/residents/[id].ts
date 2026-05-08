import type { APIContext, APIRoute } from "astro";
import { heroes } from "../../../data/heroes";

export const prerender = false;

export const GET: APIRoute = ({ params }: APIContext) => {
  const hero = heroes.find((h) => String(h.id) === params.id);
  if (!hero) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(hero), {
    headers: { "Content-Type": "application/json" },
  });
};
