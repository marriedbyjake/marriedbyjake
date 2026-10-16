import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { parsePublished } from "./lib/published-loader";
import type { PortableTextProps } from "emdash/ui";
import { z } from "astro/zod";

const publishedFields = {
  cmsId: z.string(),
  updatedAt: z.coerce.date(),
  content: z.custom<PortableTextProps["value"]>(Array.isArray).optional().default([]),
};

function toTitleCase(value: string) {
  return value.replace(
    /\w\S*/g,
    (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
  );
}

const posts = defineCollection({
  loader: file("./content/published/posts.json", { parser: parsePublished }),
  schema: ({ image }) =>
    z.object({
      ...publishedFields,
      title: z.string(),
      pubDate: z.coerce.date(),
      description: z.string(),
      image: z.object({
        url: image(),
        focalX: z.number().nullish(),
        focalY: z.number().nullish(),
        alt: z.string(),
      }),
      tags: z.array(z.string()).optional(),
      youtubeUrl: z.url().optional(),
    }),
});

const infopages = defineCollection({
  loader: file("./content/published/infopages.json", { parser: parsePublished }),
  schema: z.object({
      ...publishedFields,
    page: z.string(),
    pubDate: z.coerce.date(),
  }),
});

const services = defineCollection({
  loader: file("./content/published/services.json", { parser: parsePublished }),
  schema: ({ image }) =>
    z.object({
      ...publishedFields,
      title: z.string(),
      summary: z.string().nullish().transform(value => value || undefined),
      description: z.string().nullish().transform(value => value || undefined),
      order: z.number().nullish().transform(value => value ?? undefined),
      image: z
        .object({
          url: image(),
        focalX: z.number().nullish(),
        focalY: z.number().nullish(),
          alt: z.string(),
        })
        .optional(),
      icon: z.string().nullish().transform(value => value || undefined),
    }),
});

const weddingtestimonials = defineCollection({
  loader: file("./content/published/weddingtestimonials.json", { parser: parsePublished }),
  schema: ({ image }) =>
    z.object({
      ...publishedFields,
      coupleName: z.string(),
      latitude: z.number().nullish().transform(value => value ?? undefined),
      longitude: z.number().nullish().transform(value => value ?? undefined),
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
        focalX: z.number().nullish(),
        focalY: z.number().nullish(),
          alt: z.string().nullable().optional(),
        })
        .optional(),
      featured: z.boolean().optional().default(false),
      rating: z.number().min(1).max(5),
      pubDate: z.coerce.date().optional(),
    }),
});

const readings = defineCollection({
  loader: file("./content/published/readings.json", { parser: parsePublished }),
  schema: z.object({
      ...publishedFields,
    title: z.string(),
    author: z.string().nullish().transform(value => value || undefined),
    order: z.number().nullish().transform(value => value ?? undefined),
  }),
});

const pricing = defineCollection({
  loader: file("./content/published/pricing.json", { parser: parsePublished }),
  schema: z.object({
      ...publishedFields,
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
  readings,
  services,
  weddingtestimonials,
};
