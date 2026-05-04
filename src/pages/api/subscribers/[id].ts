import type { APIContext, APIRoute } from "astro";

export const prerender = false;

const URL = "https://jsonplaceholder.typicode.com/users";

export const GET: APIRoute = async ({ params }: APIContext) => {
  const id = params.id;
  const response = await fetch(`${URL}/${id}`);
  const data = await response.json();
  return new Response(JSON.stringify(data));
};
