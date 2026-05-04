import type { APIContext, APIRoute } from "astro";

export const prerender = false;

const USERS_URL = "https://jsonplaceholder.typicode.com/users";

export const GET: APIRoute = async ({ params }: APIContext) => {
  const response = await fetch(`${USERS_URL}/${params.id}`);
  const data = await response.json();
  return new Response(JSON.stringify(data));
};
