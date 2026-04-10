import { getCollection } from "astro:content";

export const prerender = true;

export async function GET() {
  const [posts, infopages, services, testimonials] = await Promise.all([
    getCollection("posts"),
    getCollection("infopages"),
    getCollection("services"),
    getCollection("weddingtestimonials"),
  ]);

  const items = [
    ...posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      url: `/blog/${post.id}`,
      section: "Blog",
    })),
    ...services.map((service) => ({
      title: service.data.title,
      description: service.data.summary ?? service.data.description ?? "",
      url: `/${service.id}`,
      section: "Service",
    })),
    ...testimonials.map((testimonial) => ({
      title: testimonial.data.coupleName,
      description:
        [testimonial.data.venue, testimonial.data.location].filter(Boolean).join(" · ") || "",
      url: `/weddingtestimonials/${testimonial.id}/`,
      section: "Testimonial",
    })),
    ...infopages.map((page) => ({
      title: page.data.page,
      description: "",
      url: `/${page.id}`,
      section: "Info Page",
    })),
  ];

  return new Response(JSON.stringify({ items }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
