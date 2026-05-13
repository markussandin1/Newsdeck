// Layout B — Pulse. Single chronological feed with column filter chips.
// Great on a big newsroom wall when you want the whole river at a glance.

function PulseView({ columns, items, density, showCategoryIcons, showLocation, emphasizePrio, onOpen, filterCols, setFilterCols, minPrio, setMinPrio }) {
  const visible = items
    .filter(i => (filterCols.size === 0 || filterCols.has(i.workflowId)) && (i.newsValue >= minPrio))
    .sort((a,b) => new Date(b.createdInDb||b.timestamp) - new Date(a.createdInDb||a.timestamp));

  // Group by time bucket
  const buckets = [];
  const bucketFor = (iso) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 15) return 'Senaste 15 min';
    if (diff < 60) return 'Senaste timmen';
    if (diff < 180) return 'Senaste 3 timmarna';
    return 'Tidigare idag';
  };
  const grouped = {};
  visible.forEach(it => {
    const b = bucketFor(it.createdInDb || it.timestamp);
    (grouped[b] ||= []).push(it);
  });

  const toggleCol = (id) => {
    const next = new Set(filterCols);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFilterCols(next);
  };

  return (
    <div className="pulse">
      <aside className="pulse-rail">
        <div className="rail-sec">
          <div className="rail-label">Kolumner</div>
          <button className={`rail-chip all ${filterCols.size === 0 ? 'on' : ''}`} onClick={() => setFilterCols(new Set())}>
            <span>Alla</span><span className="n">{items.length}</span>
          </button>
          {columns.map(col => {
            const n = items.filter(i => i.workflowId === col.flowId).length;
            const active = filterCols.has(col.flowId);
            return (
              <button key={col.id} className={`rail-chip ${active ? 'on' : ''}`} onClick={() => toggleCol(col.flowId)}>
                <span className="swatch" style={{ background: colorFor(col.id) }} />
                <span className="name">{col.title}</span>
                <span className="n">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="rail-sec">
          <div className="rail-label">Nyhetsvärde ≥ {minPrio}</div>
          <input type="range" min="1" max="5" value={minPrio} onChange={e=>setMinPrio(+e.target.value)} className="rail-slider" />
          <div className="rail-scale">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
        </div>
      </aside>
      <main className="pulse-main">
        <div className="pulse-axis" aria-hidden />
        {Object.keys(grouped).length === 0 && (
          <div className="pulse-empty">Inga händelser matchar filtret.</div>
        )}
        {Object.entries(grouped).map(([bucket, arr]) => (
          <section key={bucket} className="pulse-bucket">
            <header className="pulse-bhead">
              <h3>{bucket}</h3>
              <span className="count">{arr.length}</span>
            </header>
            <div className="pulse-list">
              {arr.map(it => {
                const col = columns.find(c => c.flowId === it.workflowId);
                const p = window.prio(it.newsValue);
                return (
                  <article key={it.dbId} className={`pulse-row p${it.newsValue}`} onClick={()=>onOpen && onOpen(it)}>
                    <div className="prail" style={{ background: p.color }} />
                    <div className="pmeta">
                      <time>{window.timeExact(it.createdInDb || it.timestamp)}</time>
                      <span className="pago">{window.timeAgo(it.createdInDb || it.timestamp)}</span>
                    </div>
                    <div className="pbody">
                      <div className="ptop">
                        <span className="pcol" style={{ '--sw': colorFor(col?.id) }}>
                          <span className="sw" /> {col?.title || '—'}
                        </span>
                        <span className="psrc">{it.source}</span>
                        <window.CategoryChip category={it.category} showIcon={showCategoryIcons} />
                        {showLocation && <window.LocationLabel location={it.location} />}
                      </div>
                      <h4>{it.title}</h4>
                      {it.description && density !== 'compact' && <p>{it.description}</p>}
                    </div>
                    <div className="pside">
                      <window.PriorityPip value={it.newsValue} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

// Deterministic-ish colors per column
function colorFor(id) {
  const map = {
    breaking: 'oklch(0.64 0.22 25)',
    sthlm: 'oklch(0.72 0.14 220)',
    traffic: 'oklch(0.75 0.17 65)',
    police: 'oklch(0.70 0.14 280)',
    weather: 'oklch(0.76 0.15 180)',
    sport: 'oklch(0.78 0.16 140)',
    world: 'oklch(0.72 0.10 320)',
  };
  return map[id] || 'oklch(0.7 0.05 250)';
}

Object.assign(window, { PulseView, colorFor });
