export {};

const root = document.querySelector<HTMLElement>("[data-hero-media]");
const video = root?.querySelector<HTMLVideoElement>("[data-hero-video]");
const poster = root?.querySelector<HTMLImageElement>("[data-hero-poster]");
const toggle = root?.querySelector<HTMLButtonElement>("[data-hero-toggle]");

if (root && video && poster && toggle) {
  let userPaused = false;
  let heroVisible = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const mayAutoplay = () => !userPaused && heroVisible && !document.hidden
    && !reducedMotion.matches && !connection?.saveData;

  const updateControl = () => {
    const playing = !video.paused;
    toggle.setAttribute("aria-label", playing ? "Pause background video" : "Play background video");
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.querySelector("[data-hero-play]")?.classList.toggle("hidden", playing);
    toggle.querySelector("[data-hero-pause]")?.classList.toggle("hidden", !playing);
  };

  const play = async () => {
    if (!video.getAttribute("src")) {
      video.poster = poster.currentSrc;
      video.src = window.matchMedia("(max-width: 767px)").matches
        ? video.dataset.mobileSrc || ""
        : video.dataset.desktopSrc || "";
      video.muted = true;
      video.load();
    }
    try { await video.play(); } catch { updateControl(); }
  };

  video.addEventListener("playing", () => {
    video.classList.remove("opacity-0");
    updateControl();
  });
  video.addEventListener("pause", updateControl);
  video.addEventListener("error", () => {
    video.classList.add("opacity-0");
    updateControl();
  });
  toggle.addEventListener("click", () => {
    userPaused = !video.paused;
    if (userPaused) video.pause();
    else void play();
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
