import type { APIRoute, APIContext } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }: APIContext) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (email === "steve@rogers.com") {
    return redirect("/newsletter/success", 307);
  }
  return redirect(`/newsletter/failure?message=You are not Steve Rogers`, 307);
};
