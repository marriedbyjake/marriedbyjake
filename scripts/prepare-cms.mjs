import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import sharp from "sharp";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { htmlToPortableText } from "@emdash-cms/gutenberg-to-portable-text";
import { applySeed, validateSeed, MediaRepository, OptionsRepository, handleMediaUsageActivationAdvance, handleMediaUsageRepair } from "emdash";
import { runMigrations } from "emdash/db";
import { createDialect } from "emdash/db/sqlite";
import { Kysely } from "kysely";

const output = path.resolve(".emdash");
await fs.mkdir(output, { recursive: true });
await fs.mkdir("seed", { recursive: true });
const databasePath = path.join(output, "import.db");
// A prepared import is a fresh snapshot; it never connects to production.
for (const suffix of ["", "-wal", "-shm"]) await fs.rm(databasePath + suffix, { force: true });
const db = new Kysely({ dialect: createDialect({ url: `file:${databasePath}` }) });
await runMigrations(db);
const markdown = await createMarkdownProcessor();
const mediaRepository = new MediaRepository(db);
const mediaByPath = new Map();
const mediaManifest = [];
const field = (slug, label, type = "string", extra = {}) => ({ slug, label, type, ...extra });
const textContent = field("content", "Content", "portableText");
const title = field("title", "Title", "string", { required: true });
const date = field("pub_date", "Publication date", "datetime", { indexed: true });
const image = field("featured_image", "Featured image", "image");
const order = field("order", "Order", "integer");
const define = (slug, label, labelSingular, titleField, urlPattern, fields) => ({
  slug, label, labelSingular, titleField, urlPattern, fields,
  supports: ["drafts", "revisions", "scheduling", "seo"],
  commentsEnabled: false,
});
const collections = [
  define("posts", "Blog posts", "Blog post", "title", "/blog/{slug}", [title, { ...date, required: true },
    field("description", "Description", "text", { required: true }), image,
    field("tags", "Tags", "multiSelect"), field("youtube_url", "YouTube URL", "url"), textContent]),
  define("weddingtestimonials", "Wedding testimonials", "Wedding testimonial", "couple_name", "/weddingtestimonials/{slug}", [
    field("couple_name", "Couple name", "string", { required: true }), field("venue", "Venue"), field("location", "Location"),
    image, field("featured", "Featured", "boolean", { defaultValue: false }),
    field("rating", "Star rating", "integer", { required: true, validation: { min: 1, max: 5 } }), date,
    field("latitude", "Map latitude", "number", { validation: { min: -90, max: 90 } }),
    field("longitude", "Map longitude", "number", { validation: { min: -180, max: 180 } }), textContent]),
  define("services", "Services", "Service", "title", "/{slug}", [title, field("summary", "Summary", "text"),
    field("description", "Description", "text"), order, image, field("icon", "Icon"), textContent]),
  define("readings", "Wedding readings", "Wedding reading", "title", "/wedding-readings", [title, field("author", "Author"), order, textContent]),
  define("infopages", "Info pages", "Info page", "page", "/{slug}", [field("page", "Page title", "string", { required: true }), date, textContent]),
  define("pricing", "Pricing", "Pricing", "title", "/serviceandprice", [title,
    ...["australian", "international", "mc"].flatMap((prefix) => [
      field(`${prefix}_title`, `${prefix === "mc" ? "MC" : prefix[0].toUpperCase() + prefix.slice(1)} title`, "string", { required: true }),
      field(`${prefix}_price`, "Price", "string", { required: true }),
      field(`${prefix}_description`, "Description", "text", { required: true }),
    ])]),
];
const seed = {
  version: "1", meta: { name: "Married by Jake", description: "Jake's existing website content model" },
  settings: { title: "Married by Jake", timezone: "Australia/Brisbane" }, collections,
};

async function importImage(source, alt) {
  if (!source) return undefined;
  const filename = source.startsWith("/src/") ? path.resolve(source.slice(1)) : path.resolve("src/images", source);
  if (!filename.startsWith(path.resolve("src/images") + path.sep)) throw new Error(`Image outside src/images: ${source}`);
  if (mediaByPath.has(filename)) return { ...mediaByPath.get(filename), alt: alt || "" };
  const bytes = await fs.readFile(filename);
  const metadata = await sharp(bytes).metadata();
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const extension = path.extname(filename).toLowerCase();
  const storageKey = `import-${contentHash}${extension}`;
  const mimeType = `image/${metadata.format === "jpg" ? "jpeg" : metadata.format}`;
  const item = await mediaRepository.create({
    filename: path.basename(filename), storageKey, contentHash, mimeType,
    size: bytes.length, width: metadata.width, height: metadata.height, alt: alt || "",
  });
  const value = { id: item.id, provider: "local", filename: item.filename, mimeType,
    width: metadata.width, height: metadata.height, alt: alt || "", meta: { storageKey } };
  mediaByPath.set(filename, value);
  mediaManifest.push({ file: filename, key: storageKey, mimeType, sha256: contentHash, size: bytes.length });
  return value;
}

const locationCache = JSON.parse(await fs.readFile("src/data/locations.json", "utf8"));
const content = {};
for (const collection of collections) {
  content[collection.slug] = [];
  const directory = `src/content/${collection.slug}`;
  for (const file of (await fs.readdir(directory)).filter((file) => file.endsWith(".md")).sort()) {
    const { data: fm, content: body } = matter(await fs.readFile(path.join(directory, file), "utf8"));
    const data = { ...fm };
    if (fm.pubDate) data.pub_date = new Date(fm.pubDate).toISOString();
    delete data.pubDate;
    delete data.image;
    if (fm.image?.url) data.featured_image = await importImage(fm.image.url, fm.image.alt);
    if (fm.coupleName) { data.couple_name = fm.coupleName; delete data.coupleName; }
    for (const key of ["venue", "location"]) if (!data[key]) delete data[key];
    if (fm.youtubeUrl || fm.youtubeURL) data.youtube_url = fm.youtubeUrl || fm.youtubeURL;
    delete data.youtubeUrl;
    delete data.youtubeURL;
    if (collection.slug === "weddingtestimonials") {
      const location = locationCache[[fm.venue, fm.location].filter(Boolean).join(", ")];
      if (typeof location?.lat === "number") { data.latitude = location.lat; data.longitude = location.lon; }
    }
    if (collection.slug === "pricing") {
      data.title = "Service prices";
      for (const [oldKey, prefix] of [["australianCeremonies", "australian"], ["internationalCeremonies", "international"], ["mc", "mc"]]) {
        for (const key of ["title", "price", "description"]) data[`${prefix}_${key}`] = fm[oldKey][key];
        delete data[oldKey];
      }
    } else {
      const rendered = await markdown.render(body);
      data.content = htmlToPortableText(rendered.code);
      const rewriteImages = async (value) => {
        if (Array.isArray(value)) { for (const item of value) await rewriteImages(item); return; }
        if (!value || typeof value !== "object") return;
        if (value._type === "image" && value.asset?.url?.startsWith("/src/images/")) {
          const image = await importImage(value.asset.url, value.alt);
          value.asset = { _type: "reference", _ref: image.id, provider: "local" };
          value.width = image.width; value.height = image.height;
        }
        for (const child of Object.values(value)) await rewriteImages(child);
      };
      await rewriteImages(data.content);
    }
    content[collection.slug].push({ id: `${collection.slug}:${file}`, slug: file.slice(0, -3), status: "published", data });
  }
}
const fullSeed = { ...seed, content };
const validation = validateSeed(fullSeed);
if (!validation.valid) throw new Error(JSON.stringify(validation.errors));
await fs.writeFile("seed/seed.json", JSON.stringify(seed, null, 2) + "\n");
const result = await applySeed(db, fullSeed, { includeContent: true, onConflict: "error" });
if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
await fs.writeFile(path.join(output, "media-manifest.json"), JSON.stringify(mediaManifest, null, 2));
await new OptionsRepository(db).set("emdash:seed_complete", true);
for (let attempt = 0; attempt < 10; attempt++) {
  const activation = await handleMediaUsageActivationAdvance(db, { writersDrained: true });
  if (!activation.success) throw new Error(JSON.stringify(activation.error));
  if (activation.data.outcome === "active") break;
  if (attempt === 9) throw new Error("Media usage initialization did not complete");
}
const usage = await handleMediaUsageRepair(db, { scope: "all" });
if (!usage.success || usage.data.status !== "complete") throw new Error(JSON.stringify(usage));
await db.destroy();
console.log(JSON.stringify({ collections: Object.fromEntries(Object.entries(content).map(([key, value]) => [key, value.length])), media: mediaManifest.length, databasePath }, null, 2));
