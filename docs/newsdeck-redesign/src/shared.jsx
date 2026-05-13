// Shared small components + helpers used by all three layout variations.
const { useState, useEffect, useMemo, useRef } = React;

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'nu';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function timeExact(iso) {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

// Priority — uses oklch ramp. 5 = critical, 4 = high, 3 = medium, <=2 = low.
const PRIORITY = {
  5: { label: 'P1', color: 'oklch(0.64 0.22 25)',  soft: 'oklch(0.64 0.22 25 / 0.12)',   name: 'Kritisk' },
  4: { label: 'P2', color: 'oklch(0.75 0.17 65)',  soft: 'oklch(0.75 0.17 65 / 0.12)',   name: 'Hög' },
  3: { label: 'P3', color: 'oklch(0.72 0.14 220)', soft: 'oklch(0.72 0.14 220 / 0.12)',  name: 'Medel' },
  2: { label: 'P4', color: 'oklch(0.60 0.02 250)', soft: 'oklch(0.60 0.02 250 / 0.12)',  name: 'Låg' },
  1: { label: 'P5', color: 'oklch(0.55 0.01 250)', soft: 'oklch(0.55 0.01 250 / 0.10)',  name: 'Låg' },
};
function prio(v) { return PRIORITY[Math.max(1, Math.min(5, Math.round(v || 2)))]; }

function LocationLabel({ location }) {
  if (!location) return null;
  const parts = [location.area || location.street || location.name, location.municipality].filter(Boolean);
  if (!parts.length) return null;
  return (
    <span className="loc">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      {parts.join(' · ')}
    </span>
  );
}

function CategoryChip({ category, showIcon = true }) {
  if (!category) return null;
  const def = window.CATEGORIES[category] || { label: category, icon: '•' };
  return (
    <span className="cat">
      {showIcon && <span className="cat-ico" aria-hidden>{def.icon}</span>}
      <span>{def.label}</span>
    </span>
  );
}

function PriorityPip({ value }) {
  const p = prio(value);
  return <span className="pip" style={{ background: p.color }} title={`${p.name} (${value})`}>{value}</span>;
}

// The main card used in Columns + Grid layouts. Compact, grotesk.
function NewsCard({ item, density = 'comfortable', showCategoryIcons = true, showLocation = true, emphasizePrio = true, onOpen }) {
  const p = prio(item.newsValue);
  const isNew = (Date.now() - new Date(item.createdInDb || item.timestamp).getTime()) < 5 * 60 * 1000;
  return (
    <article
      className={`card ${density} ${isNew ? 'is-new' : ''} ${emphasizePrio && item.newsValue >= 4 ? 'emph' : ''}`}
      style={{ '--pc': p.color, '--ps': p.soft }}
      onClick={() => onOpen && onOpen(item)}
    >
      <span className="ribbon" aria-hidden />
      <header>
        <span className="src">{item.source}</span>
        <span className="dot" aria-hidden>·</span>
        <time className="tm">{timeAgo(item.createdInDb || item.timestamp)}</time>
        {isNew && <span className="ny">NY</span>}
        <span className="right"><PriorityPip value={item.newsValue} /></span>
      </header>
      <h3 className="t">{item.title}</h3>
      {item.description && density !== 'compact' && <p className="d">{item.description}</p>}
      <footer>
        <CategoryChip category={item.category} showIcon={showCategoryIcons} />
        {showLocation && <LocationLabel location={item.location} />}
      </footer>
    </article>
  );
}

Object.assign(window, { timeAgo, timeExact, prio, LocationLabel, CategoryChip, PriorityPip, NewsCard });
