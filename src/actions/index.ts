import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  subscribe: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }) => {
      if (email === "steve@rogers.com") {
        return { email, message: "Welcome Steve! Subscribed successfully." };
      }
      throw new ActionError({
        code: "FORBIDDEN",
        message: `Sorry, only steve@rogers.com can subscribe.`,
      });
    },
  }),
};
