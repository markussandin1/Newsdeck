// Layout C — Grid. Dense tiled overview for big newsroom screens.
// Every event is a tile; size/emphasis scales with newsValue.

function GridView({ columns, items, showCategoryIcons, showLocation, onOpen }) {
  // Sort by priority then recency
  const sorted = [...items].sort((a,b) => {
    if (b.newsValue !== a.newsValue) return b.newsValue - a.newsValue;
    return new Date(b.createdInDb||b.timestamp) - new Date(a.createdInDb||a.timestamp);
  });

  return (
    <div className="grid-wrap">
      <div className="grid-bar">
        <span className="gb-label">Översikt</span>
        <div className="gb-stats">
          <Stat label="Totalt" value={items.length} />
          <Stat label="P1" value={items.filter(i=>i.newsValue===5).length} dot="oklch(0.64 0.22 25)" />
          <Stat label="P2" value={items.filter(i=>i.newsValue===4).length} dot="oklch(0.75 0.17 65)" />
          <Stat label="P3" value={items.filter(i=>i.newsValue===3).length} dot="oklch(0.72 0.14 220)" />
          <Stat label="Kolumner" value={columns.length} />
        </div>
      </div>
      <div className="tiles">
        {sorted.map(it => {
          const p = window.prio(it.newsValue);
          const col = columns.find(c => c.flowId === it.workflowId);
          const big = it.newsValue >= 5;
          const mid = it.newsValue === 4;
          return (
            <article key={it.dbId} className={`tile ${big?'big':mid?'mid':''} p${it.newsValue}`} style={{ '--pc': p.color, '--ps': p.soft }} onClick={()=>onOpen && onOpen(it)}>
              <div className="tile-top">
                <span className="tile-col" style={{ '--sw': window.colorFor(col?.id) }}>
                  <span className="sw" /> {col?.title || '—'}
                </span>
                <span className="tile-prio" style={{ background: p.color }}>{it.newsValue}</span>
              </div>
              <h3>{it.title}</h3>
              {big && it.description && <p>{it.description}</p>}
              <div className="tile-foot">
                <span className="tile-src">{it.source}</span>
                <span className="sep">·</span>
                <time>{window.timeAgo(it.createdInDb || it.timestamp)}</time>
                {showLocation && it.location && (
                  <>
                    <span className="sep">·</span>
                    <window.LocationLabel location={it.location} />
                  </>
                )}
                <span className="grow" />
                <window.CategoryChip category={it.category} showIcon={showCategoryIcons} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, dot }) {
  return (
    <span className="stat">
      {dot && <span className="stat-dot" style={{ background: dot }} />}
      <span className="stat-l">{label}</span>
      <span className="stat-v">{value}</span>
    </span>
  );
}

Object.assign(window, { GridView });
