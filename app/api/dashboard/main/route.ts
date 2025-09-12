import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const dashboard = await db.getMainDashboard()
    
    return NextResponse.json({
      success: true,
      dashboard
    })
  } catch (error) {
    console.error('Error fetching main dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    const updatedDashboard = await db.updateDashboard('main-dashboard', body)
    
    return NextResponse.json({
      success: true,
      dashboard: updatedDashboard
    })
  } catch (error) {
    console.error('Error updating main dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}