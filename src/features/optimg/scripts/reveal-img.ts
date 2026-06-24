function reveal(container: HTMLElement): void {
  const picture = container.querySelector<HTMLElement>("picture");
  const placeholder = container.querySelector<HTMLImageElement>("img[aria-hidden]");
  const img = container.querySelector<HTMLImageElement>("picture img");
  if (!picture || !img) return;

  const show = () => {
    picture.style.opacity = "1";
    if (placeholder) placeholder.style.opacity = "0";
  };

  // cache guard: a cached-but-broken image reports complete:true with
  // naturalHeight:0, so the stricter check skips the fade correctly and avoids
  // a strobe on back/forward navigation.
  if (img.complete && img.naturalHeight !== 0) {
    show();
    return;
  }

  picture.style.transition = "opacity 1200ms ease";
  if (placeholder) placeholder.style.transition = "opacity 1200ms ease";
  img.addEventListener("load", show, { once: true });
  img.addEventListener("error", show, { once: true }); // never leave it invisible
}

function init(): void {
  document
    .querySelectorAll<HTMLElement>(".reveal-img")
    .forEach(reveal);
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:page-load", init); // VT-safe; harmless without ClientRouter
