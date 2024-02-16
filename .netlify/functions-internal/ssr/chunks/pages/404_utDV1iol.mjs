import '@astrojs/internal-helpers/path';
/* empty css                          */
import { A as AstroError, c as InvalidImageService, d as ExpectedImageOptions, E as ExpectedImage, e as createAstro, f as createComponent, g as ImageMissingAlt, r as renderTemplate, m as maybeRenderHead, h as addAttribute, s as spreadAttributes, i as renderSlot, u as unescapeHTML, j as renderComponent, k as renderHead } from '../astro__gLaq_Dw.mjs';
import 'kleur/colors';
import 'clsx';
import 'cssesc';
import { i as isESMImportedImage, a as isLocalService, b as isRemoteImage, D as DEFAULT_HASH_PROPS } from '../astro/assets-service_l_sR8lw9.mjs';
import { getIconData, iconToSVG } from '@iconify/utils';

async function getConfiguredImageService() {
  if (!globalThis?.astroAsset?.imageService) {
    const { default: service } = await import(
      // @ts-expect-error
      '../astro/assets-service_l_sR8lw9.mjs'
    ).then(n => n.s).catch((e) => {
      const error = new AstroError(InvalidImageService);
      error.cause = e;
      throw error;
    });
    if (!globalThis.astroAsset)
      globalThis.astroAsset = {};
    globalThis.astroAsset.imageService = service;
    return service;
  }
  return globalThis.astroAsset.imageService;
}
async function getImage$1(options, imageConfig) {
  if (!options || typeof options !== "object") {
    throw new AstroError({
      ...ExpectedImageOptions,
      message: ExpectedImageOptions.message(JSON.stringify(options))
    });
  }
  if (typeof options.src === "undefined") {
    throw new AstroError({
      ...ExpectedImage,
      message: ExpectedImage.message(
        options.src,
        "undefined",
        JSON.stringify(options)
      )
    });
  }
  const service = await getConfiguredImageService();
  const resolvedOptions = {
    ...options,
    src: typeof options.src === "object" && "then" in options.src ? (await options.src).default ?? await options.src : options.src
  };
  const originalPath = isESMImportedImage(resolvedOptions.src) ? resolvedOptions.src.fsPath : resolvedOptions.src;
  const clonedSrc = isESMImportedImage(resolvedOptions.src) ? (
    // @ts-expect-error - clone is a private, hidden prop
    resolvedOptions.src.clone ?? resolvedOptions.src
  ) : resolvedOptions.src;
  resolvedOptions.src = clonedSrc;
  const validatedOptions = service.validateOptions ? await service.validateOptions(resolvedOptions, imageConfig) : resolvedOptions;
  const srcSetTransforms = service.getSrcSet ? await service.getSrcSet(validatedOptions, imageConfig) : [];
  let imageURL = await service.getURL(validatedOptions, imageConfig);
  let srcSets = await Promise.all(
    srcSetTransforms.map(async (srcSet) => ({
      transform: srcSet.transform,
      url: await service.getURL(srcSet.transform, imageConfig),
      descriptor: srcSet.descriptor,
      attributes: srcSet.attributes
    }))
  );
  if (isLocalService(service) && globalThis.astroAsset.addStaticImage && !(isRemoteImage(validatedOptions.src) && imageURL === validatedOptions.src)) {
    const propsToHash = service.propertiesToHash ?? DEFAULT_HASH_PROPS;
    imageURL = globalThis.astroAsset.addStaticImage(validatedOptions, propsToHash, originalPath);
    srcSets = srcSetTransforms.map((srcSet) => ({
      transform: srcSet.transform,
      url: globalThis.astroAsset.addStaticImage(srcSet.transform, propsToHash, originalPath),
      descriptor: srcSet.descriptor,
      attributes: srcSet.attributes
    }));
  }
  return {
    rawOptions: resolvedOptions,
    options: validatedOptions,
    src: imageURL,
    srcSet: {
      values: srcSets,
      attribute: srcSets.map((srcSet) => `${srcSet.url} ${srcSet.descriptor}`).join(", ")
    },
    attributes: service.getHTMLAttributes !== void 0 ? await service.getHTMLAttributes(validatedOptions, imageConfig) : {}
  };
}

const $$Astro$c = createAstro();
const $$Image = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$Image;
  const props = Astro2.props;
  if (props.alt === void 0 || props.alt === null) {
    throw new AstroError(ImageMissingAlt);
  }
  if (typeof props.width === "string") {
    props.width = parseInt(props.width);
  }
  if (typeof props.height === "string") {
    props.height = parseInt(props.height);
  }
  const image = await getImage(props);
  const additionalAttributes = {};
  if (image.srcSet.values.length > 0) {
    additionalAttributes.srcset = image.srcSet.attribute;
  }
  return renderTemplate`${maybeRenderHead()}<img${addAttribute(image.src, "src")}${spreadAttributes(additionalAttributes)}${spreadAttributes(image.attributes)}>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/node_modules/astro/components/Image.astro", void 0);

const $$Astro$b = createAstro();
const $$Picture = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$Picture;
  const defaultFormats = ["webp"];
  const defaultFallbackFormat = "png";
  const specialFormatsFallback = ["gif", "svg", "jpg", "jpeg"];
  const { formats = defaultFormats, pictureAttributes = {}, fallbackFormat, ...props } = Astro2.props;
  if (props.alt === void 0 || props.alt === null) {
    throw new AstroError(ImageMissingAlt);
  }
  const optimizedImages = await Promise.all(
    formats.map(
      async (format) => await getImage({ ...props, format, widths: props.widths, densities: props.densities })
    )
  );
  let resultFallbackFormat = fallbackFormat ?? defaultFallbackFormat;
  if (!fallbackFormat && isESMImportedImage(props.src) && specialFormatsFallback.includes(props.src.format)) {
    resultFallbackFormat = props.src.format;
  }
  const fallbackImage = await getImage({
    ...props,
    format: resultFallbackFormat,
    widths: props.widths,
    densities: props.densities
  });
  const imgAdditionalAttributes = {};
  const sourceAdditionaAttributes = {};
  if (props.sizes) {
    sourceAdditionaAttributes.sizes = props.sizes;
  }
  if (fallbackImage.srcSet.values.length > 0) {
    imgAdditionalAttributes.srcset = fallbackImage.srcSet.attribute;
  }
  return renderTemplate`${maybeRenderHead()}<picture${spreadAttributes(pictureAttributes)}> ${Object.entries(optimizedImages).map(([_, image]) => {
    const srcsetAttribute = props.densities || !props.densities && !props.widths ? `${image.src}${image.srcSet.values.length > 0 ? ", " + image.srcSet.attribute : ""}` : image.srcSet.attribute;
    return renderTemplate`<source${addAttribute(srcsetAttribute, "srcset")}${addAttribute("image/" + image.options.format, "type")}${spreadAttributes(sourceAdditionaAttributes)}>`;
  })} <img${addAttribute(fallbackImage.src, "src")}${spreadAttributes(imgAdditionalAttributes)}${spreadAttributes(fallbackImage.attributes)}> </picture>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/node_modules/astro/components/Picture.astro", void 0);

const imageConfig = {"service":{"entrypoint":"astro/assets/services/sharp","config":{}},"domains":[],"remotePatterns":[]};
					new URL("file:///home/jr/dev/learning/astro/codes/astro-playground/dist/");
					const getImage = async (options) => await getImage$1(options, imageConfig);

const $$Astro$a = createAstro();
const $$Container = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$Container;
  return renderTemplate`${maybeRenderHead()}<div class="container"> ${renderSlot($$result, $$slots["default"])} </div>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/Container.astro", void 0);

const icons = {"local":{"prefix":"local","lastModified":1708066213,"icons":{"BxBxlLinkedin":{"body":"<circle cx=\"4.983\" cy=\"5.009\" r=\"2.188\" fill=\"currentColor\"/><path fill=\"currentColor\" d=\"M9.237 8.855v12.139h3.769v-6.003c0-1.584.298-3.118 2.262-3.118 1.937 0 1.961 1.811 1.961 3.218v5.904H21v-6.657c0-3.27-.704-5.783-4.526-5.783-1.835 0-3.065 1.007-3.568 1.96h-.051v-1.66H9.237zm-6.142 0H6.87v12.139H3.095z\"/>"},"CarbonArrowRight":{"body":"<path fill=\"currentColor\" d=\"m18 6-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z\"/>","width":32,"height":32},"Fa6BrandsFacebookF":{"body":"<path fill=\"currentColor\" d=\"M80 299.3V512h116V299.3h86.5l18-97.8H196v-34.6c0-51.7 20.3-71.5 72.7-71.5 16.3 0 29.4.4 37 1.2V7.9C291.4 4 256.4 0 236.2 0 129.3 0 80 50.5 80 159.4v42.1H14v97.8z\"/>","width":320,"height":512},"Fa6BrandsXTwitter":{"body":"<path fill=\"currentColor\" d=\"M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z\"/>","width":512,"height":512},"FeYoutube":{"body":"<path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M9.935 14.628v-5.62l5.403 2.82zM21.8 8.035s-.195-1.379-.795-1.986c-.76-.796-1.613-.8-2.004-.847C16.203 5 12.004 5 12.004 5h-.008s-4.198 0-6.997.202c-.391.047-1.243.05-2.004.847-.6.607-.795 1.986-.795 1.986S2 9.653 2 11.272v1.517c0 1.618.2 3.237.2 3.237s.195 1.378.795 1.985c.76.797 1.76.771 2.205.855 1.6.153 6.8.2 6.8.2s4.203-.006 7.001-.208c.391-.047 1.244-.05 2.004-.847.6-.607.795-1.985.795-1.985s.2-1.619.2-3.237v-1.517c0-1.619-.2-3.237-.2-3.237\"/>"},"HeroiconsSolidHeart":{"body":"<path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M3.172 5.172a4 4 0 0 1 5.656 0L10 6.343l1.172-1.171a4 4 0 1 1 5.656 5.656L10 17.657l-6.828-6.829a4 4 0 0 1 0-5.656\" clip-rule=\"evenodd\"/>","width":20,"height":20},"logo":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" d=\"m1.795 15.188 3.452-1.91 5.257-3.702 3.504-1.633 2.504-1.415.641-.762 2.485-3.691M2.855 22.27l3.184-5.194.936-.443 4.735-2.92 2.715-1.7.468-.233.897-.838m-5.14 12.972.952-4.398.984-.902 5.895-4.93 3.21-2.788 1.768-6.309\"/>","width":26.458,"height":26.458},"MdiEmail":{"body":"<path fill=\"currentColor\" d=\"m20 8-8 5-8-5V6l8 5 8-5m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2\"/>"}},"width":24,"height":24}};

const cache = /* @__PURE__ */ new WeakMap();

const $$Astro$9 = createAstro();
const $$Icon = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$Icon;
  class AstroIconError extends Error {
    constructor(message) {
      super(message);
    }
  }
  const req = Astro2.request;
  const { name = "", title, ...props } = Astro2.props;
  const map = cache.get(req) ?? /* @__PURE__ */ new Map();
  const i = map.get(name) ?? 0;
  map.set(name, i + 1);
  cache.set(req, map);
  const includeSymbol = i === 0;
  let [setName, iconName] = name.split(":");
  if (!setName && iconName) {
    const err = new AstroIconError(`Invalid "name" provided!`);
    throw err;
  }
  if (!iconName) {
    iconName = setName;
    setName = "local";
    if (!icons[setName]) {
      const err = new AstroIconError('Unable to load the "local" icon set!');
      throw err;
    }
    if (!(iconName in icons[setName].icons)) {
      const err = new AstroIconError(`Unable to locate "${name}" icon!`);
      throw err;
    }
  }
  const collection = icons[setName];
  if (!collection) {
    const err = new AstroIconError(`Unable to locate the "${setName}" icon set!`);
    throw err;
  }
  const iconData = getIconData(collection, iconName ?? setName);
  if (!iconData) {
    const err = new AstroIconError(`Unable to locate "${name}" icon!`);
    throw err;
  }
  const id = `ai:${collection.prefix}:${iconName ?? setName}`;
  if (props.size) {
    props.width = props.size;
    props.height = props.size;
    delete props.size;
  }
  const renderData = iconToSVG(iconData, { width: "auto", height: "auto" });
  const normalizedProps = { ...renderData.attributes, ...props };
  const normalizedBody = renderData.body;
  return renderTemplate`${maybeRenderHead()}<svg${spreadAttributes(normalizedProps)}${addAttribute(name, "data-icon")}> ${title && renderTemplate`<title>${title}</title>`} ${includeSymbol && renderTemplate`<symbol${addAttribute(id, "id")}>${unescapeHTML(normalizedBody)}</symbol>`} <use ${addAttribute(`#${id}`, "xlink:href")}></use> </svg>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/node_modules/astro-icon/components/Icon.astro", void 0);

const $$Astro$8 = createAstro();
const $$LogoLink = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$LogoLink;
  return renderTemplate`${maybeRenderHead()}<a href="/" aria-label="Home page" title="Home page" class=""> ${renderComponent($$result, "Icon", $$Icon, { "name": "logo", "class": "h-10 w-10 hover:*:text-green-500" })} <span class="sr-only">Home</span> </a>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/LogoLink.astro", void 0);

const SITE = {
  name: "Astro Playground",
  description: "Play with the Astro framework",
  keywords: "Astro, playground, web, learning",
  icon: "/logo.svg",
  ogImage: {
    src: "/og.png",
    width: 1200,
    height: 630,
    format: "png"
  },
  themeColor: "#fefefe",
  author: "Jérôme Abel",
  twitterAcount: "@jeromeabeldev",
  socials: {
    twitter: "https://twitter.com/",
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    linkedin: "https://www.linkedin.com/"
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" }
  ]
};

const $$Astro$7 = createAstro();
const $$Link = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$Link;
  const { href, ...props } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(href, "href")}${spreadAttributes(props)} class="border-b inline-block hover:text-gray-600 border-black hover:border-gray-600 py-1"> ${renderSlot($$result, $$slots["default"])}</a>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/Link.astro", void 0);

const $$Astro$6 = createAstro();
const $$Nav = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$Nav;
  return renderTemplate`${maybeRenderHead()}<nav> <ul class="flex gap-4 lg:gap-8"> ${SITE.nav.map((link) => renderTemplate`<li> ${renderComponent($$result, "Link", $$Link, { "href": link.href }, { "default": ($$result2) => renderTemplate`${link.label}` })} </li>`)} </ul> </nav>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/Nav.astro", void 0);

const $$Astro$5 = createAstro();
const $$Header = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$Header;
  return renderTemplate`${maybeRenderHead()}<header class="py-4"> ${renderComponent($$result, "Container", $$Container, {}, { "default": ($$result2) => renderTemplate` <div class="flex justify-between"> ${renderComponent($$result2, "LogoLink", $$LogoLink, {})} ${renderComponent($$result2, "Nav", $$Nav, {})} </div> ` })} </header>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/Header.astro", void 0);

const $$Astro$4 = createAstro();
const $$Footer = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Footer;
  return renderTemplate`${maybeRenderHead()}<footer class="py-16 bg-black text-white"> ${renderComponent($$result, "Container", $$Container, {}, { "default": ($$result2) => renderTemplate` <p>${SITE.description}</p> <p>
Made with ${renderComponent($$result2, "Icon", $$Icon, { "name": "HeroiconsSolidHeart", "class": "h-8 inline" })} by ${SITE.author} </p> ` })} </footer>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/Footer.astro", void 0);

const $$Astro$3 = createAstro();
const $$SEO = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$SEO;
  const {
    page = "Home",
    description = SITE.description,
    image = SITE.ogImage,
    publishedDate = /* @__PURE__ */ new Date()
  } = Astro2.props;
  const title = `${page} - ${SITE.name}`;
  const canonicalWebsiteURL = "";
  const socialImageURL = new URL(image.src, Astro2.url);
  const publishedDateString = publishedDate.toISOString().slice(0, 10);
  return renderTemplate`<meta charset="utf-8"><link rel="icon"${addAttribute(SITE.icon, "href")}><meta name="msapplication-TileColor"${addAttribute(SITE.themeColor, "content")}><meta name="theme-color"${addAttribute(SITE.themeColor, "content")}><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title><meta name="title"${addAttribute(title, "content")}><meta name="description"${addAttribute(description, "content")}><meta name="author"${addAttribute(SITE.author, "content")}><link rel="canonical"${addAttribute(canonicalWebsiteURL, "href")}><meta http-equiv="Cache-control" content="public"><meta http-equiv="Expires" content="259200"><meta name="revisit-after" content="5 days"><meta name="robots" content="index, follow"><meta name="keywords"${addAttribute(SITE.keywords, "content")}><meta property="”article:published_time”"${addAttribute(publishedDateString, "content")}><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site"${addAttribute(canonicalWebsiteURL, "content")}><meta name="twitter:creator"${addAttribute(SITE.twitterAcount, "content")}><meta property="og:site_name"${addAttribute(SITE.name, "content")}><meta property="og:type" content="website"><meta property="og:url"${addAttribute(canonicalWebsiteURL, "content")}><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:image"${addAttribute(socialImageURL, "content")}><meta property="og:image:alt"${addAttribute(title, "content")}><meta property="og:image:width"${addAttribute(image.width.toString(), "content")}><meta property="og:image:height"${addAttribute(image.height.toString(), "content")}>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/SEO.astro", void 0);

const $$Astro$2 = createAstro();
const $$Layout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title, description, publishedDate, image } = Astro2.props;
  return renderTemplate`<html lang="en" class="scroll-smooth"> <head>${renderComponent($$result, "SEO", $$SEO, { "page": title, "description": description, "publishedDate": publishedDate, "image": image })}${renderHead()}</head> <body class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-white text-black"> ${renderComponent($$result, "Header", $$Header, {})} <main class="container"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} </body></html>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/layouts/Layout.astro", void 0);

const $$Astro$1 = createAstro();
const $$H1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$H1;
  return renderTemplate`${maybeRenderHead()}<h1 class="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-wider"> ${renderSlot($$result, $$slots["default"])} </h1>`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/components/base/H1.astro", void 0);

const img404 = new Proxy({"src":"/_astro/404.98DVUepG.png","width":800,"height":439,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "/home/jr/dev/learning/astro/codes/astro-playground/src/assets/images/404.png";
							}
							
							return target[name];
						}
					});

const $$Astro = createAstro();
const $$404 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$404;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Not Found" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "H1", $$H1, {}, { "default": ($$result3) => renderTemplate`Oups!` })} ${maybeRenderHead()}<a href="/">Return to home</a> ${renderComponent($$result2, "Image", $$Image, { "src": img404, "alt": "", "aria-hidden": "true", "loading": "eager" })} ` })}`;
}, "/home/jr/dev/learning/astro/codes/astro-playground/src/pages/404.astro", void 0);

const $$file = "/home/jr/dev/learning/astro/codes/astro-playground/src/pages/404.astro";
const $$url = "/404";

const _404 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

export { $$H1 as $, _404 as _, $$Layout as a, getConfiguredImageService as g, imageConfig as i };
