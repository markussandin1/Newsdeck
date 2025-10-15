'use client'

import Link from 'next/link'
import { Globe2 } from 'lucide-react'
import { Button } from './ui/button'

interface ColumnMapButtonProps {
  dashboardSlug: string
  columnId: string
  columnTitle: string
}

export default function ColumnMapButton({ dashboardSlug, columnId, columnTitle }: ColumnMapButtonProps) {
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      title="Öppna kartvy"
    >
      <Link
        href={`/dashboard/${dashboardSlug}/columns/${columnId}/map`}
        aria-label={`Öppna kartvy för ${columnTitle}`}
      >
        <Globe2 className="h-4 w-4" />
      </Link>
    </Button>
  )
}
