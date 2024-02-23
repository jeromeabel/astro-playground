// http://localhost:4321/api/subscribers/add
// File: src/pages/api/subscribers/add.ts

import type { APIRoute, APIContext } from 'astro';

// First method: redirections
export const POST: APIRoute = async ({ request, redirect }: APIContext) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  if (email === 'steve@rogers.com') {
    return redirect('/newsletter/success', 307);
  }
  return redirect(
    '/newsletter/failure?message=So bad, you are not Steve Rogers!',
    307
  );
};
