import creditBoundaries from "../data/testimonial-credit-boundaries.json" with { type: "json" };
import unavailableUrls from "../data/unavailable-vendor-urls.json" with { type: "json" };
import vendorWebsites from "../data/testimonial-vendors.json" with { type: "json" };

export interface Span {
  _type: string;
  _key?: string;
  text?: string;
  marks?: string[];
  [key: string]: unknown;
}
export interface Block {
  _type: string;
  _key?: string;
  style?: string;
  listItem?: string;
  children?: Span[];
  markDefs?: { _type: string; _key: string; href?: string; [key: string]: unknown }[];
  [key: string]: unknown;
}
export interface Credit { role: string; content: Block[] }
const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const roleNames = "photographer(?:s)?(?:\\s*[/&+]\\s*videographer)?|photography(?:\\s*(?:and|&)\\s*videography)?|photo(?:s)?(?:\\s*(?:and|&)\\s*video)?|videographer|videography|video|(?:brisbane\\s+)?(?:wedding\\s+)?venue|ceremony(?:\\s+(?:venue|music))?|reception(?:\\s+(?:venue|music))?|florist|florals|flowers|cake(?:\\s+maker)?|musician(?:s)?|music(?:\\s+hire)?|dj|band|singer|hair(?:\\s*(?:and|&)\\s*(?:make\\s*up|mua))?|make\\s*up(?:\\s*(?:and|&)\\s*hair)?|hmu|mua|stylist|styling|(?:wedding\\s+)?planner|coordinator|caterer|catering|dress|gown|bridal(?:\\s+gown)?|suit(?:s)?|transport|car(?:s)?|hire|celebrant|rings|jewell?ery|stationery|invitations|instagram|dog\\s+(?:sitter|minder)|pet\\s+(?:sitter|care)|content\\s+creator";
const roles = () => new RegExp(`(?:${roleNames})\\s*[:：–—-]\\s*`, "gi");
const urlKey = (href: string) => href.replace(/\/+$/, "");
const unavailable = new Set(unavailableUrls.map(urlKey));
const blockText = (block: Block) => (block.children || []).map(span => span.text || "").join("");
function sliceBlock(block: Block, start: number, end: number): Block {
  let offset = 0;
  const children = (block.children || []).flatMap((span, index) => {
    const text = span.text || "";
    const from = Math.max(0, start - offset);
    const to = Math.min(text.length, end - offset);
    offset += text.length;
    return to > from ? [{ ...span, _key: `${span._key || index}-${start}`, text: text.slice(from, to) }] : [];
  });
  return { ...block, _key: `${block._key}-${start}`, style: "normal", listItem: undefined, children };
}
function trimBlock(block: Block): Block {
  const text = blockText(block);
  const start = text.length - text.trimStart().length;
  return sliceBlock(block, start, text.trimEnd().length);
}
function creditLink(block: Block): Block {
  const text = blockText(block).trim();
  const websites: Record<string, string> = vendorWebsites;
  const definitions = (block.markDefs || []).filter(def => !def.href || !unavailable.has(urlKey(def.href)));
  const removedMarks = new Set((block.markDefs || []).filter(def => def.href && unavailable.has(urlKey(def.href))).map(def => def._key));
  const children = block.children?.map(span => ({ ...span, marks: span.marks?.filter(mark => !removedMarks.has(mark)) }));
  const handleLink = (name: string) => /^@[a-z0-9._]+$/i.test(name.trim())
    ? `https://www.instagram.com/${name.trim().slice(1)}/` : undefined;
  const fullWebsite = websites[normalizeName(text)] || handleLink(text);
  if (fullWebsite) {
    const key = `${block._key}-website`;
    definitions.push({ _type: "link", _key: key, href: fullWebsite });
    return { ...block, markDefs: definitions, children: children?.map(span => ({ ...span,
      marks: [...(span.marks || []).filter(mark => !definitions.some(def => def._key === mark && def._type === "link")), key],
    })) };
  }
  // Preserve verified existing links; enrich individual names in multi-vendor credits.
  return { ...block, markDefs: definitions, children: children?.map(span => {
    const website = websites[normalizeName(span.text || "")] || handleLink(span.text || "");
    if (!website) return span;
    const key = `${span._key}-website`;
    definitions.push({ _type: "link", _key: key, href: website });
    return { ...span, marks: [...(span.marks || []).filter(mark => !definitions.some(def => def._key === mark && def._type === "link")), key] };
  }) };
}

/** Presentation only: published CMS revisions and all review words stay intact. */
export function formatTestimonial(value: unknown, slug: string, venue = "") {
  const blocks = structuredClone(Array.isArray(value) ? value : []) as Block[];
  for (const block of blocks) for (const span of block.children || []) {
    if (span.text) span.text = span.text.replace(/\+\+/g, "");
  }
  const boundary = (creditBoundaries as Record<string, string[]>)[slug];
  const start = blocks.findIndex(block => {
    const text = blockText(block).replace(/\+\+/g, "").trim();
    const match = roles().exec(text);
    return /^wedding (?:vendors|team)\s*[:：]?/i.test(text) || (match?.index === 0) || boundary?.some(prefix => normalizeName(text).startsWith(prefix))
      || (!!venue && normalizeName(text) === normalizeName(venue));
  });
  const reviewBlocks = start < 0 ? blocks : blocks.slice(0, start);
  // Blank lines and hard line breaks become paragraphs, rather than awkward <br> runs.
  const review = reviewBlocks.flatMap(block => {
    if (block._type !== "block") return [block];
    const text = blockText(block);
    const parts = [...text.matchAll(/[^\n]+/g)];
    return parts.map(part => trimBlock(sliceBlock(block, part.index!, part.index! + part[0].length)))
      .filter(part => blockText(part).trim());
  });
  const credits: Credit[] = [];
  for (const original of start < 0 ? [] : blocks.slice(start)) {
    const block: Block = { ...original, children: original.children?.map(span => ({ ...span, text: span.text?.replace(/\+\+/g, "") })) };
    const text = blockText(block).replace(/^wedding (?:vendors|team)\s*[:：]\s*/i, "");
    if (text !== blockText(block)) block.children = sliceBlock(block, blockText(block).length - text.length, blockText(block).length).children;
    if (!text.trim() || /^wedding team\s*$/i.test(text.trim())) continue;
    const matches = [...text.matchAll(roles())];
    if (!matches.length) {
      for (const part of text.matchAll(/[^\n]+/g)) {
        const unlabelled = trimBlock(sliceBlock(block, part.index!, part.index! + part[0].length));
        const prefix = new RegExp(`^(?:${roleNames})\\s+`, "i").exec(blockText(unlabelled));
        const content = prefix ? trimBlock(sliceBlock(unlabelled, prefix[0].length, blockText(unlabelled).length)) : unlabelled;
        if (blockText(content)) credits.push({ role: prefix?.[0].trim() || "Wedding team", content: [creditLink(content)] });
      }
      continue;
    }
    // Keep any unlabelled leading credit rather than dropping CMS text.
    if (matches[0].index! > 0 && text.slice(0, matches[0].index).trim()) {
      credits.push({ role: "Wedding team", content: [creditLink(trimBlock(sliceBlock(block, 0, matches[0].index!)))] });
    }
    matches.forEach((match, index) => {
      const content = trimBlock(sliceBlock(block, match.index! + match[0].length, matches[index + 1]?.index ?? text.length));
      if (blockText(content)) credits.push({ role: match[0].replace(/\s*[:：–—-]\s*$/, "").trim(), content: [creditLink(content)] });
    });
  }
  return { review, credits, reviewText: review.map(blockText).join("\n\n") };
}
