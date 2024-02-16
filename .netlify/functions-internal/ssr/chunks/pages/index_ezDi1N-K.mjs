const INFOS = {
  name: "Astro & API",
  description: "Test API endpoints with the Astro framework",
  author: "Jérôme Abel",
  github: "https://github.com/jeromeabel/",
  linkedin: "https://www.linkedin.com/in/jerome-abel/"
};
const GET = () => {
  return new Response(JSON.stringify(INFOS));
};

export { GET };
