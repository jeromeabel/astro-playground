import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { heroes } from "../data/heroes";

export const server = {
  subscribe: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: ({ email }) => {
      const hero = heroes.find((h) => h.email === email);
      if (!hero) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Sorry, only retired Avengers can join. Come back when you've hung up the cape!",
        });
      }
      const firstName = hero.name.split(" ")[0];
      return {
        email,
        name: hero.name,
        message: `Welcome back, ${firstName}! Enjoy your retirement.`,
      };
    },
  }),
};
