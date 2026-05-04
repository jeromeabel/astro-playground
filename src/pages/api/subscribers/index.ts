import type { APIRoute } from "astro";
import { heroes } from "../../../data/heroes";

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(heroes));
};
