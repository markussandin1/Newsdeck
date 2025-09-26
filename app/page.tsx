'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main dashboard
    router.push('/dashboard/main')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mb-4 mx-auto">
          <Image
            src="/newsdeck-icon.svg"
            alt="Newsdeck logo"
            width={64}
            height={64}
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <div className="text-slate-600">Laddar Newsdeck...</div>
      </div>
    </div>
  )
}