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
