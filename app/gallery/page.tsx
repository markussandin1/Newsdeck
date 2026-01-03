'use client'

import { useState, useEffect } from 'react'
import { GlobalHeader } from '@/components/GlobalHeader'
import { GalleryGrid } from '@/components/GalleryGrid'
import NewsItemModal from '@/components/NewsItemModal'
import { NewsItem } from '@/lib/types'

export default function GalleryPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // Fetch user session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        if (session?.user) {
          setUserName(session.user.name || session.user.email?.split('@')[0] || null)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
      }
    }
    fetchSession()
  }, [])

  // Initial load
  useEffect(() => {
    const fetchInitialItems = async () => {
      try {
        const response = await fetch('/api/gallery?limit=50&offset=0')
        const data = await response.json()

        if (data.success) {
          setItems(data.items)
          setHasMore(data.hasMore)
          setOffset(data.nextOffset || 0)
        }
      } catch (error) {
        console.error('Failed to fetch gallery items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialItems()
  }, [])

  // Load more function for infinite scroll
  const loadMore = async () => {
    if (isFetching || !hasMore) return

    setIsFetching(true)
    setLoadingMore(true)
    try {
      const response = await fetch(`/api/gallery?limit=50&offset=${offset}`)
      const data = await response.json()

      if (data.success) {
        setItems(prev => [...prev, ...data.items])
        setHasMore(data.hasMore)
        setOffset(data.nextOffset || offset)
      }
    } catch (error) {
      console.error('Failed to load more items:', error)
    } finally {
      setLoadingMore(false)
      setIsFetching(false)
    }
  }

  const handleLogout = () => {
    window.location.href = '/api/auth/signout'
  }

  const pageContext = (
    <div className="px-4 py-2">
      <h1 className="text-xl font-display font-semibold text-foreground">
        Trafikbilder
      </h1>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
        <span>{items.length} bilder</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader
        contextContent={pageContext}
        userName={userName}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 text-6xl">📸</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Inga trafikbilder tillgängliga
            </h3>
            <p className="text-muted-foreground">
              Nya bilder visas här när trafikkameror laddar upp händelser.
            </p>
          </div>
        ) : (
          <GalleryGrid
            items={items}
            onItemClick={setSelectedItem}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
          />
        )}
      </div>

      {selectedItem && (
        <NewsItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}
