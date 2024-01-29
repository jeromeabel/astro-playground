import { z, reference, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string().optional(),
    additional: z.array(reference('additional')).optional(),
  }),
});

const additionalCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  additional: additionalCollection,
};
