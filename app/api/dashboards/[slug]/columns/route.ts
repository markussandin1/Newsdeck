import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DashboardColumn } from '@/lib/types'
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth'

async function resolveDashboard(slug: string) {
  // Try direct ID lookup first, then slug
  const byId = await db.getDashboard(slug)
  if (byId) return byId
  return await db.getDashboardBySlug(slug)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  if (!verifyApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const { slug } = await context.params
    const dashboard = await resolveDashboard(slug)

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const columns = (dashboard.columns || [])
      .filter((col: { isArchived?: boolean }) => !col.isArchived)
      .map((col: { id: string; title: string }) => ({ id: col.id, name: col.title }))

    return NextResponse.json({ columns })
  } catch (error) {
    console.error('Error fetching columns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  if (!verifyApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const { slug } = await context.params
    const dashboard = await resolveDashboard(slug)

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const body = await request.json()
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json({ error: 'Column name is required' }, { status: 400 })
    }

    const column: DashboardColumn = {
      id: crypto.randomUUID(),
      title: name,
      order: (dashboard.columns?.length || 0),
      createdAt: new Date().toISOString()
    }

    await db.addColumnToDashboard(dashboard.id, column)

    return NextResponse.json({ id: column.id, name: column.title }, { status: 201 })
  } catch (error) {
    console.error('Error creating column:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
