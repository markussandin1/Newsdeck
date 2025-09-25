import { NextResponse } from 'next/server'

export function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Use POST /api/news-items instead.'
    },
    { status: 410 }
  )
}
