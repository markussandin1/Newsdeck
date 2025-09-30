import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const preferences = await db.getUserPreferences(session.user.email)

    return NextResponse.json({
      success: true,
      preferences: preferences || {
        userId: session.user.email,
        defaultDashboardId: null
      }
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { defaultDashboardId } = body

    // Validate dashboard exists if provided
    if (defaultDashboardId) {
      const dashboard = await db.getDashboard(defaultDashboardId)
      if (!dashboard) {
        return NextResponse.json(
          { error: 'Dashboard not found' },
          { status: 404 }
        )
      }
    }

    const preferences = await db.setUserPreferences(session.user.email, {
      defaultDashboardId: defaultDashboardId || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
