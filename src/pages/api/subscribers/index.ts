// http://localhost:4321/api/subscribers

// File: ./src/pages/api/subscribers/index.ts
import type { APIRoute } from 'astro';
const URL = 'https://jsonplaceholder.typicode.com/users'

export const GET: APIRoute = async () => {
  const response = await fetch(URL);
  const data = await response.json();
  return new Response(JSON.stringify(data));
};

