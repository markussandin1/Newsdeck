import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Workflow, Code2, Hash, Rss, TestTube2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Dokumentation — Newsdeck',
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground break-all">
      {children}
    </code>
  )
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <pre className="bg-muted/70 border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">
      {language && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          {language}
        </div>
      )}
      <code>{children}</code>
    </pre>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image src="/newsdeck-icon.svg" alt="" width={32} height={32} />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Newsdeck — Dokumentation</h1>
              <p className="text-sm text-muted-foreground">
                Så fungerar inflödet av händelser till dashboardsen.
              </p>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Till Newsdeck
            </Link>
          </Button>
        </div>

        {/* Workflows-integration */}
        <Section icon={Workflow} title="Skicka händelser via Workflows">
          <p>
            Newsdeck matas uteslutande av Bonnier News interna{' '}
            <strong className="text-foreground">Workflows</strong>-system. Du bygger ditt flöde där
            och avslutar med en <strong className="text-foreground">Newsdeck-nod</strong> som
            postar händelserna hit.
          </p>

          <div>
            <p className="mb-2 font-medium text-foreground">Standardupplägget ser ut så här:</p>
            <ol className="space-y-2 pl-5 list-decimal text-foreground/80">
              <li>
                <strong>Källa</strong> — t.ex. SOS Alarm Feed, Polisen, Trafikverket, en
                webhook eller egen integration.
              </li>
              <li>
                <strong>Värdering (valfritt)</strong> — t.ex. personan{' '}
                <Code>BASIC Nyhetsvärderare</Code> som sätter <Code>newsValue</Code> 1–5.
              </li>
              <li>
                <strong>JSON-formattering</strong> — personan{' '}
                <Code>Newsdeck: Events to json light</Code> mappar källans payload till det
                schema Newsdeck förväntar sig (se nästa sektion).
              </li>
              <li>
                <strong>Publicering</strong> — noden <Code>Newsdeck Publisher</Code> postar
                den formaterade händelsen till rätt kolumn via API-nyckel.
              </li>
            </ol>
          </div>

          <p className="text-muted-foreground">
            Använd alltid <Code>Newsdeck Publisher</Code>-noden i Workflows — den hanterar
            auth-headers och retry. Behöver du formatera om JSON kan du börja från
            persona-mallen <Code>Newsdeck: Events to json light</Code> och anpassa den efter
            källan.
          </p>
        </Section>

        {/* JSON-schema */}
        <Section icon={Code2} title="JSON-schemat (NewsItem)">
          <p>
            Varje händelse är ett <Code>NewsItem</Code>. Bara{' '}
            <Code>title</Code>, <Code>source</Code>, <Code>timestamp</Code> och{' '}
            <Code>newsValue</Code> är obligatoriska. Resten är valfritt men ger en bättre
            kortvy.
          </p>

          <CodeBlock language="json">{`{
  "id": "valfritt-källid",
  "title": "Stor brand i Stockholm centrum",
  "source": "SOS Alarm Feed",
  "timestamp": "2026-05-14T19:30:00Z",
  "newsValue": 5,
  "description": "Räddningstjänst på plats med flera enheter.",
  "category": "brand",
  "severity": "Kritisk",
  "location": {
    "name": "Drottninggatan 50",
    "municipality": "Stockholm",
    "county": "Stockholms län",
    "countryCode": "SE",
    "coordinates": [59.33, 18.06]
  },
  "extra": {}
}`}</CodeBlock>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-medium text-foreground mb-1">Obligatoriska fält</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <Code>title</Code> — rubrik
                </li>
                <li>
                  <Code>source</Code> — källans namn (t.ex. &ldquo;Polisen&rdquo;)
                </li>
                <li>
                  <Code>timestamp</Code> — ISO 8601 (UTC rekommenderas)
                </li>
                <li>
                  <Code>newsValue</Code> — 1–5 (5 = kritisk)
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Tips</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <Code>severity</Code> är fri text — ingen enum.
                </li>
                <li>
                  <Code>location</Code> sparas rakt av; geo-koder används inte i UI:t idag.
                </li>
                <li>
                  <Code>id</Code> är källans eget id — inte unikt över system.
                </li>
                <li>
                  Duplicates dedupliceras på <Code>id</Code> per kolumn.
                </li>
              </ul>
            </div>
          </div>

          <p>
            <strong className="text-foreground">newsValue-skalan</strong> styr visuell
            prioritet (ribbon-färg). 5 ger röd ribbon + bakgrundston, 4 amber, 3 cyan, 1–2
            grå.
          </p>
        </Section>

        {/* columnId */}
        <Section icon={Hash} title="Hitta en kolumns columnId">
          <p>
            Varje kolumn har ett unikt <Code>columnId</Code> (UUID). Det är det här id:t
            Workflows postar till. Du hittar det så här:
          </p>
          <ol className="space-y-1 pl-5 list-decimal text-foreground/80">
            <li>Gå till dashboarden i Newsdeck.</li>
            <li>
              Öppna kolumnens <Code>⋮</Code>-meny → <strong>Redigera</strong>.
            </li>
            <li>
              Klicka på kopierings-ikonen bredvid <Code>Kolumn-ID</Code>.
            </li>
          </ol>
          <p className="text-muted-foreground">
            Klistra in id:t i <Code>Newsdeck Publisher</Code>-nodens konfiguration i
            Workflows.
          </p>
        </Section>

        {/* Manuell test */}
        <Section icon={TestTube2} title="Testa en payload manuellt">
          <p>
            Behöver du verifiera en payload utanför Workflows? Posta direkt till{' '}
            <Code>POST /api/workflows</Code> med en API-nyckel.
          </p>
          <CodeBlock language="bash">{`curl -X POST https://newsdeck-389280113319.europe-west1.run.app/api/workflows \\
  -H "Authorization: Bearer $NEWSDECK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "columnId": "1a5465c1-1fa8-4bc0-9fb2-dfb396a64d5a",
    "item": {
      "title": "Testhändelse",
      "source": "manuell test",
      "timestamp": "2026-05-14T19:30:00Z",
      "newsValue": 3
    }
  }'`}</CodeBlock>
          <p className="text-muted-foreground">
            En lyckad post returnerar <Code>200</Code> + ett <Code>dbId</Code>. Händelsen
            dyker upp i kolumnen direkt via realtidsuppdateringen.
          </p>
        </Section>

        {/* RSS */}
        <Section icon={Rss} title="RSS / Atom-feeds">
          <p>
            Varje kolumn och dashboard exponerar en publik Atom-feed med de 50 senaste
            händelserna. Använd dem för bevakning i en RSS-läsare eller andra system.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="font-mono text-xs shrink-0">
                Kolumn
              </Badge>
              <Code>/feeds/columns/&lt;columnId&gt;</Code>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="font-mono text-xs shrink-0">
                Dashboard
              </Badge>
              <Code>/feeds/dashboards/&lt;slug&gt;</Code>
            </li>
          </ul>
          <p className="text-muted-foreground">
            URL:erna går också att kopiera direkt från Newsdeck genom RSS-ikonen i kolumnens
            header eller dashboardens header.
          </p>
        </Section>
      </div>
    </div>
  )
}
