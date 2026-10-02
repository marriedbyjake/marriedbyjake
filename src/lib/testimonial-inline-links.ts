import selections from "../data/testimonial-inline-links.json" with { type: "json" };
import type { Block } from "./testimonial-format";

interface Selection { text: string; href: string }
const allowed = new Set(["/brisbane", "/gold-coast", "/sunshine-coast", "/byron-bay", "/sydney", "/wedding-celebrant", "/elopements", "/master-of-ceremonies"]);
const textOf = (block: Block) => (block.children || []).map(span => span.text || "").join("");

function fallbacks(blocks: Block[]): Selection[] {
  const text = blocks.map(textOf).join("\n");
  const choices: Selection[] = [];
  // New or edited CMS reviews still get links only where the words support them.
  for (const [pattern, href] of [
    [/\bBrisbane\b/i, "/brisbane"], [/\bGold Coast\b/i, "/gold-coast"],
    [/\bSunshine Coast\b/i, "/sunshine-coast"], [/\bByron Bay\b/i, "/byron-bay"], [/\bSydney\b/i, "/sydney"],
    [/\b(?:destination wedding|elopement)s?\b/i, "/elopements"],
  ] as const) {
    const match = text.match(pattern);
    if (match) { choices.push({ text: match[0], href }); break; }
  }
  const mc = text.match(/\b(?:master of ceremonies|MC)\b/i);
  if (mc) choices.push({ text: mc[0], href: "/master-of-ceremonies" });
  if (!choices.length) {
    const match = text.match(/\b(?:(?:marriage|wedding) celebrant|celebrant|wedding ceremony)\b/i);
    if (match) choices.push({ text: match[0], href: "/wedding-celebrant" });
  }
  return choices;
}

/** Insert links in existing words, preserving rich-text marks and existing links. */
export function linkTestimonialReview(value: Block[], slug: string): Block[] {
  const blocks = structuredClone(value);
  const selected = (selections as Record<string, Selection[]>)[slug] || [];
  const matching = selected.filter(selection => blocks.some(block => textOf(block).includes(selection.text)));
  const candidates = matching.length ? matching : fallbacks(blocks);
  const targets = new Set<string>();
  let linked = 0;
  for (const { text: phrase, href } of candidates) {
    if (!phrase || !allowed.has(href) || targets.has(href) || linked >= 2) continue;
    let applied = false;
    for (const [blockIndex, block] of blocks.entries()) {
      if (block._type !== "block") continue;
      const text = textOf(block);
      let start = text.indexOf(phrase);
      while (start !== -1) {
        const end = start + phrase.length;
        const linkMarks = new Set((block.markDefs || []).filter(def => def._type === "link").map(def => def._key));
        let position = 0;
        const existingLink = (block.children || []).some(span => {
          const spanStart = position;
          position += (span.text || "").length;
          return spanStart < end && position > start && span.marks?.some(mark => linkMarks.has(mark));
        });
        const insideWord = /[\p{L}\p{N}]/u.test(phrase[0]) && /[\p{L}\p{N}]/u.test(text[start - 1] || "")
          || /[\p{L}\p{N}]/u.test(phrase.at(-1) || "") && /[\p{L}\p{N}]/u.test(text[end] || "");
        if (existingLink || insideWord) { start = text.indexOf(phrase, start + 1); continue; }
        const key = `${block._key || blockIndex}-review-link-${linked}`;
        position = 0;
        block.children = (block.children || []).flatMap((span, spanIndex) => {
          const spanText = span.text || "";
          const spanStart = position;
          position += spanText.length;
          if (position <= start || spanStart >= end) return [span];
          const from = Math.max(0, start - spanStart);
          const to = Math.min(spanText.length, end - spanStart);
          return [
            ...(from ? [{ ...span, _key: `${span._key || spanIndex}-before`, text: spanText.slice(0, from) }] : []),
            { ...span, _key: `${span._key || spanIndex}-linked`, text: spanText.slice(from, to), marks: [...(span.marks || []), key] },
            ...(to < spanText.length ? [{ ...span, _key: `${span._key || spanIndex}-after`, text: spanText.slice(to) }] : []),
          ];
        });
        block.markDefs = [...(block.markDefs || []), { _type: "link", _key: key, href }];
        targets.add(href);
        linked++;
        applied = true;
        break;
      }
      if (applied) break;
    }
  }
  return blocks;
}
