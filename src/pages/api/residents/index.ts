import type { APIRoute } from "astro";
import { residents } from "../../../data/heroes";

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(residents), {
    headers: { "Content-Type": "application/json" },
  });
};
