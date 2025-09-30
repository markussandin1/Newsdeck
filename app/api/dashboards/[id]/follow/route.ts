import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: dashboardId } = await params

    // Check if dashboard exists
    const dashboard = await db.getDashboard(dashboardId)
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      )
    }

    await db.followDashboard(session.user.email, dashboardId)

    return NextResponse.json({
      success: true,
      message: 'Dashboard followed successfully'
    })
  } catch (error) {
    console.error('Error following dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: dashboardId } = await params

    await db.unfollowDashboard(session.user.email, dashboardId)

    return NextResponse.json({
      success: true,
      message: 'Dashboard unfollowed successfully'
    })
  } catch (error) {
    console.error('Error unfollowing dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
