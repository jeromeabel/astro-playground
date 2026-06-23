import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { heroes, residents } from "../data/heroes";

export const server = {
  join: defineAction({
    accept: "form",
    input: z.object({
      email: z.email(),
    }),
    handler: ({ email }) => {
      const hero = heroes.find((h) => h.email === email);
      if (!hero) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: `Sorry, ${email} is not on the hero roster.`,
        });
      }
      const firstName = hero.name.split(" ")[0];
      if (residents.find((r) => r.email === email)) {
        return { email, name: hero.name, settled: true, message: `${firstName}, you're already settled in!` };
      }
      residents.push(hero);
      return {
        email,
        name: hero.name,
        settled: false,
        message: `Welcome, ${firstName}! Your slippers await.`,
      };
    },
  }),
};
