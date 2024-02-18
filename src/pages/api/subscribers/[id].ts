// http://localhost:4321/api/infos/name
// http://localhost:4321/api/infos/description

import type { APIContext, APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }: APIContext) => {
  const id = params.id;

  const result = await fetch(
    `https://jsonplaceholder.typicode.com/users/${id}`
  ).then((response) => response.json());

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// import type { APIRoute } from 'astro';

// const INFOS = {
//   name: 'Astro & API',
//   description: 'Test API endpoints with the Astro framework',
//   author: 'Jérôme Abel',
//   github: 'https://github.com/jeromeabel/',
//   linkedin: 'https://www.linkedin.com/in/jerome-abel/',
// };

// export const GET: APIRoute = ({ params }) => {
//   //context: APIContext
//   const key = params.key as keyof typeof INFOS;

//   if (!key || !(key in INFOS)) {
//     return new Response(null, {
//       status: 404,
//       statusText: 'Not found, try another query parameter',
//     });
//   }

//   return new Response(JSON.stringify(INFOS[key]), {
//     status: 200,
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   });
// };
