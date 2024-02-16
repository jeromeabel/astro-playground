import { renderers } from './renderers.mjs';
import { manifest } from './manifest_mWm9dB5o.mjs';
import * as serverEntrypointModule from '@astrojs/netlify/ssr-function.js';
import { onRequest } from './_noop-middleware.mjs';

const _page0 = () => import('./chunks/generic_iBGyDE7Y.mjs');
const _page1 = () => import('./chunks/404_MoQHFPaQ.mjs');
const _page2 = () => import('./chunks/about_-M0zwCkm.mjs');
const _page3 = () => import('./chunks/index_Zq7pnAMo.mjs');
const _page4 = () => import('./chunks/_key__dD2sQ-xU.mjs');
const _page5 = () => import('./chunks/index_bmToh9-0.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/about.astro", _page2],
    ["src/pages/api/infos/index.ts", _page3],
    ["src/pages/api/infos/[key].ts", _page4],
    ["src/pages/index.astro", _page5]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    renderers,
    middleware: onRequest
});
const _args = {
    "middlewareSecret": "2f564a25-2520-43aa-90eb-729ae94d6d1b"
};
const _exports = serverEntrypointModule.createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
serverEntrypointModule.start?.(_manifest, _args);

export { __astrojsSsrVirtualEntry as default, pageMap };
