// http://localhost:4321/api/subscribers/add2
// File: src/pages/api/subscribers/add2.ts

import type { APIRoute, APIContext } from 'astro';

// Second method: send messages with JSON
export const POST: APIRoute = async ({ request, redirect }: APIContext) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  if (email === 'steve@rogers.com') {
    return new Response(
      JSON.stringify({ msg: 'Welcome Steve! Subscribed successfully!' }),
      { status: 200 }
    );
  }
  return new Response(
    JSON.stringify({
      msg: `Hey! ${email}, sorry, you're' not Steve Rogers...`,
    }),
    { status: 200 }
  );
};
