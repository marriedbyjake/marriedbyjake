import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

function toTitleCase(value: string) {
  return value.replace(
    /\w\S*/g,
    (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
  );
}

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      pubDate: z.coerce.date(),
      description: z.string(),
      image: z.object({
        url: image(),
        alt: z.string(),
      }),
      tags: z.array(z.string()).optional(),
      youtubeUrl: z.string().url().optional(),
    }),
});

const infopages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/infopages" }),
  schema: z.object({
    page: z.string(),
    pubDate: z.coerce.date(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional(),
      image: z
        .object({
          url: image(),
          alt: z.string(),
        })
        .optional(),
      icon: z.string().optional(),
    }),
});

const weddingtestimonials = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/weddingtestimonials" }),
  schema: ({ image }) =>
    z.object({
      coupleName: z.string(),
      location: z
        .string()
        .nullable()
        .optional()
        .transform((value: string | null | undefined) => (value ? toTitleCase(value) : value)),
      venue: z
        .string()
        .nullable()
        .optional()
        .transform((value: string | null | undefined) => (value ? toTitleCase(value) : value)),
      image: z
        .object({
          url: image(),
          alt: z.string().nullable().optional(),
        })
        .optional(),
      featured: z.boolean().optional().default(false),
      rating: z.number().min(1).max(5),
      pubDate: z.coerce.date().optional(),
    }),
});

const pricing = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pricing" }),
  schema: z.object({
    australianCeremonies: z.object({
      title: z.string(),
      price: z.string(),
      description: z.string(),
    }),
    internationalCeremonies: z.object({
      title: z.string(),
      price: z.string(),
      description: z.string(),
    }),
    mc: z.object({
      title: z.string(),
      description: z.string(),
      price: z.string(),
    }),
  }),
});

export const collections = {
  infopages,
  posts,
  pricing,
  services,
  weddingtestimonials,
};
