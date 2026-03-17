import { Feed } from "feed";
import { NewsItem } from "@/lib/types";

interface FeedMeta {
  title: string;
  description: string;
  id: string;
  link: string;
  feedLink: string;
}

export function buildAtomFeed(items: NewsItem[], meta: FeedMeta): string {
  const feed = new Feed({
    title: meta.title,
    description: meta.description,
    id: meta.id,
    link: meta.link,
    feedLinks: { atom: meta.feedLink },
    updated: items[0] ? new Date(items[0].timestamp) : new Date(),
    copyright: "",
  });

  for (const item of items) {
    feed.addItem({
      id: item.dbId,
      title: item.title,
      date: new Date(item.timestamp),
      published: item.createdInDb ? new Date(item.createdInDb) : new Date(item.timestamp),
      description: item.description ?? "",
      author: [{ name: item.source }],
      link: item.url ?? "",
      category: [
        ...(item.category ? [{ name: item.category }] : []),
        ...(item.severity ? [{ name: item.severity }] : []),
      ],
      content: buildItemContent(item),
    });
  }

  return feed.atom1();
}

function buildItemContent(item: NewsItem): string {
  const parts: string[] = [];
  if (item.newsValue) parts.push(`Nyhetsvärde: ${item.newsValue}/5`);
  if (item.location?.name) parts.push(`Plats: ${item.location.name}`);
  if (item.location?.municipality) parts.push(`Kommun: ${item.location.municipality}`);
  if (item.location?.county) parts.push(`Län: ${item.location.county}`);
  return parts.join(" | ");
}
