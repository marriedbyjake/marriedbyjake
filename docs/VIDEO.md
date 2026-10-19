# Homepage hero video

The homepage uses Cloudflare Stream with a native HTML video element. It chooses one mobile or desktop MP4; it does not load an iframe, a Stream player bundle, or both videos. The current videos are silent, 16.32-second loops.

Edit **Website → Website sections → Shared · Background videos and posters** in EmDash to replace the published video URLs and their matching poster images. `src/data/hero-video.ts` resolves the committed settings at build time. The desktop Stream video ID is `4a1ba53dd23a1545ed96ead8b4f15829`; the mobile ID is `f8741641ee3f9dcaf868fa8f2675ebfd`. Both are in the Withers Co Cloudflare account. Generated MP4 URLs end in `/downloads/default.mp4`.

## Playback

The responsive WebP poster is preloaded at high priority and remains behind the video as a fallback. The script waits for the selected poster to decode and paint before requesting the video. Muted, inline autoplay then starts immediately, without waiting for visitor interaction or a timer. The video is decorative, with no visible playback controls, picture-in-picture, or remote playback. Reduced-motion and Save-Data visitors receive the still poster. Playback pauses automatically when the hero scrolls out of view or the document is hidden.

## Replace the hero

1. Prepare a short, silent loop and a mobile crop. Keep the opening frame consistent with the poster so the switch to motion is smooth. Remove audio and excess duration before uploading.
2. Upload both files in Cloudflare Stream. Name the videos clearly and allow playback from `marriedbyjake.com` and `www.marriedbyjake.com`. Temporary `localhost` and `127.0.0.1` origins support local preview. Keep unsigned playback enabled for this public background video.
3. Wait for Stream processing to finish, then generate MP4 downloads for both videos. Wait until the downloads are ready. See [Stream's MP4 generation instructions](https://developers.cloudflare.com/stream/viewing-videos/download-videos/).
4. Upload small WebP first-frame posters through EmDash Media. Aim for the current poster budgets: approximately 24 KB mobile and 72 KB desktop. Select the posters and update both video URLs in the same Website section. Their dimensions come from verified media metadata.
5. Save a draft and review its values, then Publish. Hosted Builds run `npm run validate` with supported Node 24 LTS. Preview both breakpoints and confirm autoplay, absence of playback controls, reduced motion, and the still-image fallback. Check that mobile downloads only the mobile video.
6. Wait for confirmed publishing status and run mobile and desktop Lighthouse against the canonical live URL. Verify the active Worker version, actual Stream playback, CMS content, and image URLs. Record repeated scores and timings rather than treating one 100 score as a guarantee.

Stream re-encodes uploads. The current generated files are approximately 1.08 MB mobile and 2.83 MB desktop, compared with the original 0.79 MB and 2.22 MB Worker assets. Hosting on Stream alone therefore does not establish faster playback. Measure the replacement video's startup time and page metrics; keep the poster small and avoid introducing a large player library.

The separate videos below the hero use their existing Mux sources. The homepage's social video metadata points to its existing introduction video; it is separate from the silent hero loop.
