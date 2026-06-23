function reveal(img: HTMLImageElement): void {
  // cache guard: already-decoded images skip the fade
  if (img.complete && img.naturalHeight !== 0) {
    img.style.opacity = "1";
    return;
  }
  const show = () => {
    img.style.opacity = "1";
  };
  img.addEventListener("load", show, { once: true });
  img.addEventListener("error", show, { once: true }); // never leave it invisible
}

function init(): void {
  document
    .querySelectorAll<HTMLImageElement>("img.reveal-img")
    .forEach(reveal);
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:page-load", init); // VT-safe; harmless without ClientRouter
