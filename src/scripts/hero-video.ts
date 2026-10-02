export {};

const root = document.querySelector<HTMLElement>("[data-hero-media]");
const video = root?.querySelector<HTMLVideoElement>("[data-hero-video]");
const poster = root?.querySelector<HTMLImageElement>("[data-hero-poster]");

if (root && video && poster) {
  let heroVisible = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const mayAutoplay = () => heroVisible && !document.hidden
    && !reducedMotion.matches && !connection?.saveData;

  const play = async () => {
    if (!video.getAttribute("src")) {
      video.poster = poster.currentSrc;
      video.src = window.matchMedia("(max-width: 767px)").matches
        ? video.dataset.mobileSrc || ""
        : video.dataset.desktopSrc || "";
      video.muted = true;
      video.load();
    }
    try { await video.play(); } catch { /* Keep the poster if autoplay is blocked. */ }
  };

  video.addEventListener("playing", () => {
    video.classList.remove("opacity-0");
  });
  video.addEventListener("error", () => {
    video.classList.add("opacity-0");
  });

  // Decode the selected responsive poster and let it paint before requesting video.
  void (async () => {
    try { await poster.decode(); } catch { /* Keep the native image fallback. */ }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (mayAutoplay()) await play();
  })();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else if (mayAutoplay() && video.src) void play();
  });
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (!heroVisible) video.pause();
    else if (mayAutoplay() && video.src) void play();
  }).observe(root);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) video.pause();
  });
}
