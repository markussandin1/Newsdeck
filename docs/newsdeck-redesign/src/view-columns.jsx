// Layout A — Columns. The refined mental model from today's Newsdeck.
const { useState: useStateA } = React;

function ColumnsView({ columns, items, density, showCategoryIcons, showLocation, emphasizePrio, onOpen }) {
  return (
    <div className="cols-scroller">
      <div className="cols">
        {columns.map(col => {
          const colItems = items.filter(i => i.workflowId === col.flowId)
            .sort((a,b) => new Date(b.createdInDb||b.timestamp) - new Date(a.createdInDb||a.timestamp));
          return <Column key={col.id} col={col} items={colItems} density={density} showCategoryIcons={showCategoryIcons} showLocation={showLocation} emphasizePrio={emphasizePrio} onOpen={onOpen} />;
        })}
        <button className="col-add" aria-label="Lägg till kolumn">
          <span className="plus">＋</span>
          <span>Lägg till kolumn</span>
          <span className="sub">Koppla från Workflows</span>
        </button>
      </div>
    </div>
  );
}

function Column({ col, items, density, showCategoryIcons, showLocation, emphasizePrio, onOpen }) {
  const [muted, setMuted] = useStateA(false);
  const [menuOpen, setMenuOpen] = useStateA(false);
  const critCount = items.filter(i => i.newsValue >= 4).length;
  return (
    <section className="col">
      <header className="col-h">
        <div className="col-h-main">
          <div className="col-title-row">
            <h2>{col.title}</h2>
            <span className="count">{items.length}</span>
          </div>
          {col.description && <p className="col-desc">{col.description}</p>}
        </div>
        <div className="col-h-actions">
          <span className={`live ${items.length ? 'on' : ''}`} title="Live">
            <span className="dot" /> Live
          </span>
          <button className="ibtn" onClick={() => setMuted(m=>!m)} title={muted ? 'Slå på ljud' : 'Tysta'}>
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            )}
          </button>
          <button className="ibtn" onClick={() => setMenuOpen(o=>!o)} title="Inställningar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
          </button>
        </div>
        {critCount > 0 && <div className="col-crit">{critCount} prioriterade just nu</div>}
      </header>
      <div className="col-body">
        {items.length === 0 ? (
          <div className="empty">
            <div className="empty-ic">◦</div>
            <div className="empty-t">Tom kolumn</div>
            <div className="empty-d">Väntar på händelser från <b>{col.flowId}</b></div>
          </div>
        ) : items.map(it => (
          <window.NewsCard key={it.dbId} item={it} density={density} showCategoryIcons={showCategoryIcons} showLocation={showLocation} emphasizePrio={emphasizePrio} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { ColumnsView });
