import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAtomFeed } from "@/lib/feeds/atom";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const host = request.headers.get("host") ?? "localhost";
  const baseUrl = `https://${host}`;

  const dashboard = await db.getDashboardBySlug(slug);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const columnIds = dashboard.columns
    .filter((c) => !c.isArchived)
    .map((c) => c.id);

  const columnDataBatch = await db.getColumnDataBatch(columnIds, 50);

  const allItems = Object.values(columnDataBatch)
    .flat()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 50);

  const xml = buildAtomFeed(allItems, {
    title: `${dashboard.name} — Newsdeck`,
    description: dashboard.description ?? `Nyhetsflöde för ${dashboard.name}`,
    id: `${baseUrl}/feeds/dashboards/${slug}`,
    link: `${baseUrl}/dashboard/${slug}`,
    feedLink: `${baseUrl}/feeds/dashboards/${slug}`,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
