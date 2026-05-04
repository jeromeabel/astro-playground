import type { APIRoute, APIContext } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }: APIContext) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (email === "steve@rogers.com") {
    return new Response(
      JSON.stringify({ msg: "Welcome Steve! Subscribed successfully!" }),
      { status: 200 },
    );
  }
  return new Response(
    JSON.stringify({ msg: `Sorry ${email}, you're not Steve Rogers.` }),
    { status: 200 },
  );
};
