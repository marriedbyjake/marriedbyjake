import rss from '@astrojs/rss';
import { getCollection } from '@/lib/cms';
export async function GET(context) {
  const posts = await getCollection('posts');
  return rss({
    title: 'Married by Jake',
    description: 'Wedding advice and stories from Jake Smith, marriage celebrant.',
    site: context.site,
    items: posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()).map((post) => ({
      title: post.data.title, description: post.data.description,
      pubDate: post.data.pubDate, link: `/blog/${post.id}`,
    })),
  });
}
