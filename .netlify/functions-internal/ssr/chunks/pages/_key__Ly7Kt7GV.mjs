const INFOS = {
  name: "Astro & API",
  description: "Test API endpoints with the Astro framework",
  author: "Jérôme Abel",
  github: "https://github.com/jeromeabel/",
  linkedin: "https://www.linkedin.com/in/jerome-abel/"
};
const GET = ({ params }) => {
  const key = params.key;
  if (!key || !(key in INFOS)) {
    return new Response(null, {
      status: 404,
      statusText: "Not found, try another query parameter"
    });
  }
  return new Response(JSON.stringify(INFOS[key]), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
};

export { GET };
