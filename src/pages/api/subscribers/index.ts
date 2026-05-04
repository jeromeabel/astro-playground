import type { APIRoute } from "astro";

export const prerender = false;

const URL = "https://jsonplaceholder.typicode.com/users";

export const GET: APIRoute = async () => {
  const response = await fetch(URL);
  const data = await response.json();
  return new Response(JSON.stringify(data));
};
