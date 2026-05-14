import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      }
    })
  } catch (error) {
    logger.error('api.auth.session.error', { error })
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
