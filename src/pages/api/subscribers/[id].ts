// File: ./src/pages/api/subscribers/[id].ts
// GET http://localhost:4321/api/subscribers/2

import type { APIContext, APIRoute } from 'astro';

const URL = 'https://jsonplaceholder.typicode.com/users';

export const GET: APIRoute = async ({ params }: APIContext) => {
  const id = params.id; // Get the params from the request

  const response = await fetch(`${URL}/${id}`);
  const data = await response.json();
  return new Response(JSON.stringify(data));
};
