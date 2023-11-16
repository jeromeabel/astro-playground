import type { APIContext } from "astro";
import { db, likes } from "../../../db";
import { eq } from "drizzle-orm";

export const prerender = false;

export async function GET(context: APIContext) {
  const { slug } = context.params;
  console.log("GET", context.params)

  // No slug
  if (!slug) return new Response('Bad Request', { status: 400 });

  // Read
  const entry = db.select().from(likes).where(eq(likes.slug, slug)).get();

  // No entry
  if (!entry) return new Response('Not found', { status: 404 });

  // Send back the entry from the database
  return new Response(JSON.stringify(entry), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}


export async function POST(context: APIContext) {
  const { slug } = context.params;

  if (!slug) {
    return new Response('Bad Request', { status: 400 });
  }

  const entry = db.select().from(likes).where(eq(likes.slug, slug)).get();

  if (!entry) {
    // Create new entry
    const inserted = db
      .insert(likes)
      .values({ slug, likes: 1 })
      .returning()
      .get();

    return new Response(JSON.stringify(inserted), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const updated = db
    .update(likes)
    .set({ likes: (entry.likes ?? 0) + 1 }) // Type null
    .where(eq(likes.slug, slug))
    .returning()
    .get();

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}