// http://localhost:4321/api/subscribers

// File: ./src/pages/api/subscribers/index.ts
import type { APIRoute } from 'astro';

// export const GET: APIRoute = async () => {
//   const result = await fetch('https://jsonplaceholder.typicode.com/users').then(
//     (response) => response.json()
//   );
//   return new Response(JSON.stringify(result));
// };

export const GET: APIRoute = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users');
  const data = await response.json();
  return new Response(JSON.stringify(data));
};
/*

import { fetchJson } from '@/services';

  const result = await fetch('https://jsonplaceholder.typicode.com/users');
  if (!result.ok) {
    console.error(result);
  }

  const shopItems: ShopItem[] = await result.json();

  */
// const data = await fetchJson('https://jsonplaceholder.typicode.com/users');

/*
const INFOS = {
  name: 'Astro & API',
  description: 'Test API endpoints with the Astro framework',
  author: 'Jérôme Abel',
  github: 'https://github.com/jeromeabel/',
  linkedin: 'https://www.linkedin.com/in/jerome-abel/',
};
*/

// // FormData
// export const POST: APIRoute = async ({ request }) => {
//   const formData = await request.formData();
//   const email = formData.get('email') as string;
//   if (!email) {
//     return new Response(JSON.stringify({ error: 'Email not provided' }), {
//       status: 400,
//     });
//   }
//   if (email !== 'steve@rodgers.com') {
//     return new Response(
//       JSON.stringify({
//         msg: `Hey! ${email}, sorry, you're' not Steve Rodgers...`,
//       }),
//       {
//         status: 200,
//       }
//     );
//   }
//   return new Response(
//     JSON.stringify({ msg: 'Welcome Steve! Subscribed successfully!' }),
//     {
//       status: 200,
//     }
//   );
// };
