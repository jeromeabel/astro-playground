/* empty css                          */
import { e as createAstro, f as createComponent, r as renderTemplate, j as renderComponent } from '../astro__gLaq_Dw.mjs';
import 'kleur/colors';
import 'clsx';
import 'cssesc';
import { $ as $$H1, a as $$Layout } from './404_utDV1iol.mjs';

const $$Astro = createAstro();
const $$About = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$About;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {}, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "H1", $$H1, {}, { "default": ($$result3) => renderTemplate`About` })} ` })}`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/pages/about.astro", void 0);

const $$file = "/home/jr/dev/learning/astro/codes/astro-playground/src/pages/about.astro";
const $$url = "/about";

export { $$About as default, $$file as file, $$url as url };
