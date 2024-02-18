// http://localhost:4321/api/infos

import type { APIRoute } from 'astro';

const INFOS = {
  name: 'Astro & API',
  description: 'Test API endpoints with the Astro framework',
  author: 'Jérôme Abel',
  github: 'https://github.com/jeromeabel/',
  linkedin: 'https://www.linkedin.com/in/jerome-abel/',
};

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(INFOS));
};

// FormData
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email not provided' }), {
      status: 400,
    });
  }
  if (email !== 'steve@rodgers.com') {
    return new Response(
      JSON.stringify({
        msg: `Hey! ${email}, sorry, you're' not Steve Rodgers...`,
      }),
      {
        status: 200,
      }
    );
  }
  return new Response(
    JSON.stringify({ msg: 'Welcome Steve! Subscribed successfully!' }),
    {
      status: 200,
    }
  );
};
