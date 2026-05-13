// App shell: header, nav, tweaks, view switching, modal.
const { useState: useS, useEffect: useE, useRef: useR } = React;

function App() {
  // Tweakable defaults — persisted via host
  const [tweaks, setTweaks] = useS(window.TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useS(false);
  const [tweaksAvailable, setTweaksAvailable] = useS(false);

  const [view, setView] = useS(() => localStorage.getItem('nd.view') || tweaks.defaultView || 'columns');
  useE(() => localStorage.setItem('nd.view', view), [view]);

  const [dashboardIdx, setDashboardIdx] = useS(0);
  const [dashOpen, setDashOpen] = useS(false);
  const [selected, setSelected] = useS(null);
  const [search, setSearch] = useS('');
  const [filterCols, setFilterCols] = useS(new Set());
  const [minPrio, setMinPrio] = useS(1);

  useE(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    setTweaksAvailable(true);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Apply theme
  useE(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.accent = tweaks.accent;
  }, [tweaks.theme, tweaks.accent]);

  const updateTweak = (key, value) => {
    setTweaks(t => {
      const next = { ...t, [key]: value };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*');
      return next;
    });
  };

  const dashboards = [
    { name: 'Nyhetsrummet – dygnet runt', slug: 'main' },
    { name: 'Lokala Göteborg', slug: 'gbg' },
    { name: 'Sportredaktionen', slug: 'sport' },
  ];
  const currentDash = dashboards[dashboardIdx];

  const columns = window.COLUMNS;
  const items = window.ITEMS.filter(i => !search || (i.title + ' ' + (i.description||'') + ' ' + (i.source||'')).toLowerCase().includes(search.toLowerCase()));

  const [now, setNow] = useS(new Date());
  useE(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  return (
    <div className={`app view-${view}`}>
      <TopBar
        now={now} currentDash={currentDash} dashboards={dashboards} dashboardIdx={dashboardIdx} setDashboardIdx={setDashboardIdx} dashOpen={dashOpen} setDashOpen={setDashOpen}
        view={view} setView={setView} search={search} setSearch={setSearch} itemCount={items.length} columnCount={columns.length}
      />
      <div className="stage">
        {view === 'columns' && <window.ColumnsView columns={columns} items={items} density={tweaks.density} showCategoryIcons={tweaks.showCategoryIcons} showLocation={tweaks.showLocation} emphasizePrio={tweaks.emphasizePriority} onOpen={setSelected} />}
        {view === 'pulse' && <window.PulseView columns={columns} items={items} density={tweaks.density} showCategoryIcons={tweaks.showCategoryIcons} showLocation={tweaks.showLocation} emphasizePrio={tweaks.emphasizePriority} onOpen={setSelected} filterCols={filterCols} setFilterCols={setFilterCols} minPrio={minPrio} setMinPrio={setMinPrio} />}
        {view === 'grid' && <window.GridView columns={columns} items={items} showCategoryIcons={tweaks.showCategoryIcons} showLocation={tweaks.showLocation} onOpen={setSelected} />}
      </div>

      {selected && <DetailModal item={selected} columns={columns} onClose={() => setSelected(null)} />}
      {tweaksAvailable && tweaksOpen && <TweaksPanel tweaks={tweaks} update={updateTweak} onClose={() => setTweaksOpen(false)} view={view} setView={setView} />}
    </div>
  );
}

function TopBar({ now, currentDash, dashboards, dashboardIdx, setDashboardIdx, dashOpen, setDashOpen, view, setView, search, setSearch, itemCount, columnCount }) {
  return (
    <header className="top">
      <div className="top-l">
        <a className="brand" href="#">
          <img src="assets/newsdeck-icon.svg" alt="" />
          <div className="brand-t">
            <div className="brand-n">Newsdeck</div>
            <div className="brand-s">Bonnier News</div>
          </div>
        </a>
        <div className="dash-pick">
          <button className="dash-btn" onClick={() => setDashOpen(o => !o)}>
            <div>
              <div className="dash-n">{currentDash.name}</div>
              <div className="dash-s">{columnCount} kolumner · {itemCount} händelser</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dashOpen ? 'rotate(180deg)' : '' }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {dashOpen && (
            <div className="dash-menu" onClick={()=>setDashOpen(false)}>
              <div className="dash-menu-l">Dashboards</div>
              {dashboards.map((d,i) => (
                <button key={d.slug} className={`dash-item ${i===dashboardIdx?'on':''}`} onClick={()=>{setDashboardIdx(i); setDashOpen(false);}}>
                  <span>{d.name}</span>
                  {i===dashboardIdx && <span className="check">✓</span>}
                </button>
              ))}
              <button className="dash-item new">＋ Ny dashboard</button>
            </div>
          )}
        </div>
      </div>

      <div className="top-c">
        <div className="seg">
          <button className={view==='columns'?'on':''} onClick={()=>setView('columns')} title="Kolumnvy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
            Kolumner
          </button>
          <button className={view==='pulse'?'on':''} onClick={()=>setView('pulse')} title="Pulse – kronologisk flöde">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/></svg>
            Pulse
          </button>
          <button className={view==='grid'?'on':''} onClick={()=>setView('grid')} title="Rutnätsvy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Grid
          </button>
        </div>
      </div>

      <div className="top-r">
        <div className="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Sök titel, källa, plats…" value={search} onChange={e=>setSearch(e.target.value)} />
          <kbd>⌘K</kbd>
        </div>
        <div className="status" title="Live-status">
          <span className="live-dot" />
          <span>Live</span>
          <span className="sep">·</span>
          <time>{now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</time>
        </div>
        <button className="icon-btn" title="Notiser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="badge" />
        </button>
        <button className="avatar" title="Anna Lindström">AL</button>
      </div>
    </header>
  );
}

function DetailModal({ item, columns, onClose }) {
  const p = window.prio(item.newsValue);
  const col = columns.find(c => c.flowId === item.workflowId);
  useE(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ '--pc': p.color }}>
        <header>
          <div className="mh-l">
            <span className="mh-col">{col?.title}</span>
            <span className="sep">·</span>
            <span className="mh-src">{item.source}</span>
            <span className="sep">·</span>
            <time>{window.timeExact(item.createdInDb || item.timestamp)}</time>
          </div>
          <div className="mh-r">
            <span className="mh-prio" style={{ background: p.color }}>{p.label} · {p.name}</span>
            <button className="x" onClick={onClose} aria-label="Stäng">✕</button>
          </div>
        </header>
        <div className="m-body">
          <h2>{item.title}</h2>
          {item.description && <p className="m-desc">{item.description}</p>}
          <div className="m-grid">
            {item.location && (
              <div className="m-cell">
                <div className="m-k">Plats</div>
                <div className="m-v">
                  {[item.location.street, item.location.area, item.location.municipality, item.location.county, item.location.country].filter(Boolean).join(', ')}
                </div>
              </div>
            )}
            {item.category && (
              <div className="m-cell">
                <div className="m-k">Kategori</div>
                <div className="m-v"><window.CategoryChip category={item.category} showIcon /></div>
              </div>
            )}
            <div className="m-cell">
              <div className="m-k">Källa</div>
              <div className="m-v">{item.source}{item.url && <> · <a href={item.url} target="_blank" rel="noreferrer">Öppna ↗</a></>}</div>
            </div>
            <div className="m-cell">
              <div className="m-k">Nyhetsvärde</div>
              <div className="m-v">{item.newsValue}/5 — {p.name}</div>
            </div>
          </div>
          <div className="m-map">
            <div className="m-map-ph">
              <span>[ karta — plats visas här om koordinater finns ]</span>
            </div>
          </div>
        </div>
        <footer className="m-foot">
          <button className="btn ghost">Kopiera länk</button>
          <button className="btn ghost">Skapa coverage i Workflows</button>
          <button className="btn primary">Öppna källa ↗</button>
        </footer>
      </div>
    </div>
  );
}

function TweaksPanel({ tweaks, update, onClose, view, setView }) {
  return (
    <div className="tw">
      <header>
        <h4>Tweaks</h4>
        <button onClick={onClose} className="x">✕</button>
      </header>
      <div className="tw-b">
        <Row label="Layout">
          <div className="seg sm">
            <button className={view==='columns'?'on':''} onClick={()=>setView('columns')}>Kolumner</button>
            <button className={view==='pulse'?'on':''} onClick={()=>setView('pulse')}>Pulse</button>
            <button className={view==='grid'?'on':''} onClick={()=>setView('grid')}>Grid</button>
          </div>
        </Row>
        <Row label="Tema">
          <div className="seg sm">
            <button className={tweaks.theme==='dark'?'on':''} onClick={()=>update('theme','dark')}>Mörkt</button>
            <button className={tweaks.theme==='light'?'on':''} onClick={()=>update('theme','light')}>Ljust</button>
          </div>
        </Row>
        <Row label="Accentfärg">
          <div className="sw-row">
            {['cyan','amber','violet','green'].map(a => (
              <button key={a} className={`sw ${tweaks.accent===a?'on':''}`} onClick={()=>update('accent', a)} data-accent={a}>
                <span />
              </button>
            ))}
          </div>
        </Row>
        <Row label="Täthet">
          <div className="seg sm">
            <button className={tweaks.density==='comfortable'?'on':''} onClick={()=>update('density','comfortable')}>Bekväm</button>
            <button className={tweaks.density==='compact'?'on':''} onClick={()=>update('density','compact')}>Kompakt</button>
          </div>
        </Row>
        <Row label="Kategoriikoner"><Toggle v={tweaks.showCategoryIcons} onChange={v=>update('showCategoryIcons',v)} /></Row>
        <Row label="Visa plats"><Toggle v={tweaks.showLocation} onChange={v=>update('showLocation',v)} /></Row>
        <Row label="Förstärk prio"><Toggle v={tweaks.emphasizePriority} onChange={v=>update('emphasizePriority',v)} /></Row>
      </div>
    </div>
  );
}
function Row({ label, children }) { return <div className="tw-row"><label>{label}</label>{children}</div>; }
function Toggle({ v, onChange }) { return <button className={`toggle ${v?'on':''}`} onClick={()=>onChange(!v)}><span /></button>; }

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
