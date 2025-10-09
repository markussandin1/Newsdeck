'use client'

import { NewsItem as NewsItemType } from '@/lib/types'
import NewsItem from '@/components/NewsItem'
import { useState } from 'react'
import NewsItemModal from '@/components/NewsItemModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, Trash2, Download, Settings } from 'lucide-react'

export default function DemoPage() {
  const [selectedItem, setSelectedItem] = useState<NewsItemType | null>(null)

  const demoItems: NewsItemType[] = [
    {
      id: 'demo-1',
      dbId: '1',
      workflowId: 'workflow-emergency',
      source: 'SOS Alarm',
      timestamp: new Date().toISOString(),
      createdInDb: new Date().toISOString(),
      title: 'Brand i flerfamiljshus i Sundsvall',
      description: 'Räddningstjänst på plats med flera enheter. Kraftig rökutveckling från tredje våningen.',
      newsValue: 5,
      category: 'emergency',
      location: {
        municipality: 'Sundsvall',
        county: 'Västernorrland',
        name: 'Storgatan 45',
        coordinates: [62.3908, 17.3069]
      },
      url: 'https://sosalarm.se',
      isNew: true
    },
    {
      id: 'demo-2',
      dbId: '2',
      workflowId: 'workflow-police',
      source: 'Polisen',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      createdInDb: new Date(Date.now() - 900000).toISOString(),
      title: 'Trafikolycka E4 vid Rotebro',
      description: 'Två bilar inblandade. Långa köer söderut. Vänta med längre restider.',
      newsValue: 4,
      category: 'traffic',
      location: {
        municipality: 'Sollentuna',
        county: 'Stockholm',
        area: 'E4 söderut'
      },
      url: 'https://polisen.se'
    },
    {
      id: 'demo-3',
      dbId: '3',
      workflowId: 'workflow-weather',
      source: 'SMHI',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      createdInDb: new Date(Date.now() - 1800000).toISOString(),
      title: 'Varning för kraftiga vindar',
      description: 'Vindbyar upp till 25 m/s väntas under eftermiddagen. Säkra lösa föremål.',
      newsValue: 3,
      category: 'weather',
      location: {
        county: 'Västerbotten'
      }
    },
    {
      id: 'demo-4',
      dbId: '4',
      workflowId: 'workflow-news',
      source: 'TT Nyhetsbyrån',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      createdInDb: new Date(Date.now() - 3600000).toISOString(),
      title: 'Kommunfullmäktige beslutar om ny budget',
      description: 'Efter långa förhandlingar nåddes en överenskommelse om nästa års budget.',
      newsValue: 2,
      category: 'politics',
      location: {
        municipality: 'Uppsala',
        county: 'Uppsala'
      },
      url: 'https://tt.se'
    },
    {
      id: 'demo-5',
      dbId: '5',
      workflowId: 'workflow-sports',
      source: 'Sportbladet',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      createdInDb: new Date(Date.now() - 7200000).toISOString(),
      title: 'Lokalt lag vinner historisk match',
      newsValue: 1,
      category: 'sports',
      location: {
        municipality: 'Malmö',
        county: 'Skåne'
      }
    },
    {
      id: 'demo-6',
      dbId: '6',
      workflowId: 'workflow-emergency',
      source: 'SOS Alarm',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      createdInDb: new Date(Date.now() - 300000).toISOString(),
      title: 'Räddningstjänst ryckte ut till larm om gasutsläpp',
      description: 'Falsklarm konstaterades efter undersökning av området. Inga skador.',
      newsValue: 3,
      category: 'emergency',
      location: {
        municipality: 'Göteborg',
        county: 'Västra Götaland',
        street: 'Kungsportsavenyen 12'
      }
    },
    {
      id: 'demo-7',
      dbId: '7',
      workflowId: 'workflow-economy',
      source: 'Dagens Industri',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      createdInDb: new Date(Date.now() - 10800000).toISOString(),
      title: 'Börsen stängde på minus',
      description: 'OMXS30 föll 1,2 procent efter svaga rapporter från flera storbolag.',
      newsValue: 2,
      category: 'economy',
      url: 'https://di.se'
    },
    {
      id: 'demo-8',
      dbId: '8',
      workflowId: 'workflow-crime',
      source: 'Polisen',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      createdInDb: new Date(Date.now() - 600000).toISOString(),
      title: 'Inbrott i affärslokal under natten',
      description: 'Okända gärningsmän tog sig in genom bakdörr. Polisen söker vittnen.',
      newsValue: 4,
      category: 'crime',
      location: {
        municipality: 'Linköping',
        county: 'Östergötland',
        area: 'Centrala stan'
      }
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Design System Demo</h1>
          <p className="text-muted-foreground">
            Visar NewsItem-komponenten med nya designsystemet (shadcn/ui + Lucide icons + semantiska färger)
          </p>
        </div>

        {/* Button Component Examples */}
        <div className="mb-8 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Button-komponenten</h2>

          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Varianter</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Storlekar</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Settings className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Med ikoner</h3>
              <div className="flex flex-wrap gap-3">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Lägg till
                </Button>
                <Button variant="secondary" className="gap-2">
                  <Save className="h-4 w-4" />
                  Spara
                </Button>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Ta bort
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Ladda ner
                </Button>
              </div>
            </div>

            {/* Disabled State */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Disabled</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Default Disabled</Button>
                <Button variant="secondary" disabled>Secondary Disabled</Button>
                <Button variant="outline" disabled>Outline Disabled</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Component Examples */}
        <div className="mb-8 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Badge-komponenten</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Alla varianter</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Med ikoner</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="success" className="gap-1.5">
                  <span className="w-2 h-2 bg-success-foreground rounded-full"></span>
                  Aktiv
                </Badge>
                <Badge variant="warning" className="gap-1.5">
                  <span className="w-2 h-2 bg-warning-foreground rounded-full"></span>
                  Väntar
                </Badge>
                <Badge variant="error" className="gap-1.5">
                  <span className="w-2 h-2 bg-error-foreground rounded-full"></span>
                  Fel
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Level Legend */}
        <div className="mb-8 p-4 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-3">Prioritetsnivåer (newsValue)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-8 bg-priority-critical rounded"></div>
              <span className="text-sm text-muted-foreground">5 - Kritisk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-8 bg-priority-high rounded"></div>
              <span className="text-sm text-muted-foreground">4 - Hög</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-8 bg-priority-medium rounded"></div>
              <span className="text-sm text-muted-foreground">3 - Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-8 bg-priority-low rounded"></div>
              <span className="text-sm text-muted-foreground">2 - Låg</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-8 bg-priority-low rounded"></div>
              <span className="text-sm text-muted-foreground">1 - Minimal</span>
            </div>
          </div>
        </div>

        {/* Compact View Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Kompakt vy (Dashboard-layout)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoItems.map((item) => (
              <NewsItem
                key={item.id}
                item={item}
                compact
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>

        {/* Expanded View */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Expanderad vy (Detaljerad)</h2>
          <div className="space-y-4">
            {demoItems.slice(0, 3).map((item) => (
              <NewsItem key={item.id} item={item} compact={false} />
            ))}
          </div>
        </div>

        {/* Color Tokens Reference */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-3">Färgpaletten (semantiska tokens)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded"></div>
              <span className="text-muted-foreground">primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-light rounded"></div>
              <span className="text-muted-foreground">primary-light</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-secondary rounded"></div>
              <span className="text-muted-foreground">secondary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-muted rounded border border-border"></div>
              <span className="text-muted-foreground">muted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded"></div>
              <span className="text-muted-foreground">accent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-destructive rounded"></div>
              <span className="text-muted-foreground">destructive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-success rounded"></div>
              <span className="text-muted-foreground">success</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-warning rounded"></div>
              <span className="text-muted-foreground">warning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedItem && (
        <NewsItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}
