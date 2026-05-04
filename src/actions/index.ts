import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  subscribe: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }) => {
      if (email === "steve@rogers.com") {
        return { message: "Welcome Steve! Subscribed successfully." };
      }
      return { message: `Sorry ${email}, you're not Steve Rogers.` };
    },
  }),
};
