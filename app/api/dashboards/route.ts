import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get('mine') === 'true'

    const dashboards = await db.getDashboards()

    // Filter dashboards based on query (skip in development)
    let filteredDashboards = dashboards
    if (mine && session?.user?.email && process.env.NODE_ENV !== 'development') {
      // Get dashboards created by user OR followed by user
      const userId = session.user.email
      try {
        const following = await db.getUserDashboardFollows(userId)
        const followingIds = new Set(following.map(f => f.dashboardId))

        filteredDashboards = dashboards.filter(d =>
          d.createdBy === userId || followingIds.has(d.id)
        )
      } catch (error) {
        // Ignore follow errors in development but log for diagnostics
        console.log('Skipping user follows in development', error)
      }
    }

    // Add follower count and isFollowing for current user (skip in development)
    const enrichedDashboards = await Promise.all(
      filteredDashboards.map(async dashboard => {
        let followerCount = 0
        let isFollowing = false

        if (process.env.NODE_ENV !== 'development') {
          try {
            const followers = await db.getDashboardFollowers(dashboard.id)
            followerCount = followers.length
            isFollowing = session?.user?.email
              ? followers.some(f => f.userId === session.user.email)
              : false
          } catch (error) {
            // Ignore follower errors in development but log for diagnostics
            console.log('Skipping followers in development', error)
          }
        }

        return {
          ...dashboard,
          columnCount: dashboard.columns.filter((col: { isArchived?: boolean }) => !col.isArchived).length,
          followerCount,
          isFollowing
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: enrichedDashboards.length,
      dashboards: enrichedDashboards
    })
  } catch (error) {
    console.error('Error fetching dashboards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, columns } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Dashboard name is required' },
        { status: 400 }
      )
    }

    const createdBy = session.user.email
    const createdByName = session.user.name || session.user.email.split('@')[0]

    const newDashboard = await db.createDashboard(
      name.trim(),
      description?.trim(),
      createdBy,
      createdByName
    )

    // If columns were provided, add them to the dashboard
    if (columns && Array.isArray(columns) && columns.length > 0) {
      const updatedDashboard = await db.updateDashboard(newDashboard.id, { columns })

      return NextResponse.json({
        success: true,
        message: 'Dashboard created successfully',
        dashboard: updatedDashboard
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard created successfully',
      dashboard: newDashboard
    })

  } catch (error) {
    console.error('Error creating dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
