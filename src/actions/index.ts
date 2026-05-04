import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
  subscribe: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }) => {
      if (email === "steve@rogers.com") {
        return { success: true, message: "Welcome Steve! Subscribed successfully!" };
      }
      return { success: false, message: `Sorry ${email}, you're not Steve Rogers.` };
    }
  })
};
