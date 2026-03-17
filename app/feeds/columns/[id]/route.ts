import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAtomFeed } from "@/lib/feeds/atom";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: columnId } = await params;
  const host = request.headers.get("host") ?? "localhost";
  const baseUrl = `https://${host}`;

  const dashboards = await db.getDashboards();
  let columnTitle = "Kolumn";
  for (const dashboard of dashboards) {
    const col = dashboard.columns.find((c) => c.id === columnId);
    if (col) {
      columnTitle = col.title;
      break;
    }
  }

  const items = await db.getColumnData(columnId, 50);

  const xml = buildAtomFeed(items, {
    title: `${columnTitle} — Newsdeck`,
    description: `Nyhetsflöde för kolumnen ${columnTitle}`,
    id: `${baseUrl}/feeds/columns/${columnId}`,
    link: `${baseUrl}/feeds/columns/${columnId}`,
    feedLink: `${baseUrl}/feeds/columns/${columnId}`,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
