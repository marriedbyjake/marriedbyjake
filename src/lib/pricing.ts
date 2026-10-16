import { getEntry } from "./cms";

/** The published EmDash pricing entry is the only source of current amounts. */
export async function getPricing() {
  const entry = await getEntry("pricing", "index");
  if (!entry) throw new Error("Published pricing data not found");
  return entry.data;
}

export const pricingUrl = "/serviceandprice";

// The CMS owns the complete displayed string, including any qualifications.
// This number is used only in the existing structured-data Offer.
export function extractPrice(value: string): number | null {
  const match = value.match(/\$\s?([\d,]+)/);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}
