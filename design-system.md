# Dashboard Design System

## Overview
This design system provides a comprehensive set of components and patterns for building Swedish-style incident monitoring dashboards. The system is optimized for displaying real-time information across multiple categorized columns with consistent visual hierarchy and interaction patterns.

---

## Design Principles

### 1. **Information Density with Clarity**
- Display multiple data streams simultaneously
- Use color coding for quick category recognition
- Maintain clear visual hierarchy within cards

### 2. **Real-time Monitoring**
- Live status indicators
- Timestamp displays
- Notification counters
- Multi-user collaboration indicators

### 3. **Scanability**
- Consistent card layouts
- Category badges at top of cards
- Location information with map pin icons
- Time stamps in consistent positions

---

## Color System

### Category Colors
```css
/* Trafik (Traffic) */
--category-trafik: bg-blue-100 text-blue-700

/* Brand (Fire) */
--category-brand: bg-orange-100 text-orange-700

/* Brott (Crime) */
--category-brott: bg-red-100 text-red-700

/* Kollektivtrafik (Public Transport) */
--category-kollektivtrafik: bg-purple-100 text-purple-700

/* Väder (Weather) */
--category-vader: bg-cyan-100 text-cyan-700

/* Övrigt (Other) */
--category-ovrigt: bg-gray-100 text-gray-700
```

### Incident Type Colors

#### Trafik Types
```css
/* Trafikolycka (Traffic Accident) */
--type-trafikolycka: bg-blue-100 text-blue-700 hover:bg-blue-100

/* Vägarbete (Road Work) */
--type-vagarbete: bg-amber-100 text-amber-700 hover:bg-amber-100

/* Personpåhållning (Person on Track/Road) */
--type-personpahallning: bg-red-100 text-red-700 hover:bg-red-100

/* Kö (Traffic Queue) */
--type-ko: bg-yellow-100 text-yellow-700 hover:bg-yellow-100
```

#### Brand Types
```css
/* Brand (Fire) */
--type-brand: bg-orange-100 text-orange-700 hover:bg-orange-100

/* Explosion */
--type-explosion: bg-red-100 text-red-700 hover:bg-red-100

/* Räddning (Rescue) */
--type-raddning: bg-teal-100 text-teal-700 hover:bg-teal-100

/* Fordonsbrand (Vehicle Fire) */
--type-fordonsbrand: bg-orange-100 text-orange-700 hover:bg-orange-100

/* Skogsbrand (Forest Fire) */
--type-skogsbrand: bg-orange-100 text-orange-700 hover:bg-orange-100

/* Gasläcka (Gas Leak) */
--type-gaslacka: bg-yellow-100 text-yellow-700 hover:bg-yellow-100

/* Kemolycka (Chemical Accident) */
--type-kemolycka: bg-purple-100 text-purple-700 hover:bg-purple-100
```

#### Brott Types
```css
/* Mord (Murder) */
--type-mord: bg-red-100 text-red-700 hover:bg-red-100

/* Mordförsök (Attempted Murder) */
--type-mordforsok: bg-red-100 text-red-700 hover:bg-red-100

/* Misshandel (Assault) */
--type-misshandel: bg-orange-100 text-orange-700 hover:bg-orange-100

/* Skjutning (Shooting) */
--type-skjutning: bg-red-100 text-red-700 hover:bg-red-100

/* Rån (Robbery) */
--type-ran: bg-orange-100 text-orange-700 hover:bg-orange-100

/* Stöld (Theft) */
--type-stold: bg-amber-100 text-amber-700 hover:bg-amber-100

/* Inbrott (Burglary) */
--type-inbrott: bg-amber-100 text-amber-700 hover:bg-amber-100

/* Våldtäkt (Rape) */
--type-valdtakt: bg-red-100 text-red-700 hover:bg-red-100

/* Hot (Threat) */
--type-hot: bg-orange-100 text-orange-700 hover:bg-orange-100
```

#### Kollektivtrafik Types
```css
/* Växelfel (Switch Failure) */
--type-vaxelfel: bg-purple-100 text-purple-700 hover:bg-purple-100

/* Urspårning (Derailment) */
--type-urspårning: bg-red-100 text-red-700 hover:bg-red-100

/* Signalfel (Signal Failure) */
--type-signalfel: bg-purple-100 text-purple-700 hover:bg-purple-100

/* Strömavbrott-tåg (Power Outage - Train) */
--type-stromavbrott-tag: bg-amber-100 text-amber-700 hover:bg-amber-100

/* Inställd-trafik (Cancelled Service) */
--type-installd-trafik: bg-red-100 text-red-700 hover:bg-red-100
```

#### Väder Types
```css
/* Översvämning (Flood) */
--type-oversvamning: bg-blue-100 text-blue-700 hover:bg-blue-100

/* Storm */
--type-storm: bg-slate-100 text-slate-700 hover:bg-slate-100

/* Snöoväder (Snow Storm) */
--type-snooväder: bg-cyan-100 text-cyan-700 hover:bg-cyan-100

/* Halka (Slippery Conditions) */
--type-halka: bg-blue-100 text-blue-700 hover:bg-blue-100

/* Värmebölja (Heat Wave) */
--type-varmebolja: bg-orange-100 text-orange-700 hover:bg-orange-100

/* Ras (Landslide) */
--type-ras: bg-amber-100 text-amber-700 hover:bg-amber-100

/* Skyfall (Heavy Rain) */
--type-skyfall: bg-blue-100 text-blue-700 hover:bg-blue-100
```

#### Övrigt Types
```css
/* Strömavbrott (Power Outage) */
--type-stromavbrott: bg-amber-100 text-amber-700 hover:bg-amber-100

/* Vattenläcka (Water Leak) */
--type-vattenlacka: bg-blue-100 text-blue-700 hover:bg-blue-100

/* Olycka (Accident) */
--type-olycka: bg-gray-100 text-gray-700 hover:bg-gray-100

/* Sjukdom (Illness) */
--type-sjukdom: bg-green-100 text-green-700 hover:bg-green-100

/* Djur (Animal) */
--type-djur: bg-green-100 text-green-700 hover:bg-green-100

/* Larm (Alarm) */
--type-larm: bg-yellow-100 text-yellow-700 hover:bg-yellow-100

/* Annan (Other) */
--type-annan: bg-gray-100 text-gray-700 hover:bg-gray-100
```

### Semantic Colors
```css
/* Live status */
--status-live: bg-green-100 text-green-700

/* Notification badge */
--notification: bg-blue-600 text-white

/* Multi-user indicator */
--multi-user: bg-gray-100 text-gray-600
```

---

## Components

### 1. DashboardHeader

**Purpose**: Main application header with live status and user controls

**Structure**:
```tsx
<DashboardHeader />
```

**Features**:
- Application title with dropdown indicator
- Live status badge
- Current date/time display
- Action buttons (RSS, Image export)
- User profile avatar with teal background

**Styling Guidelines**:
- White background with bottom border
- Horizontal padding: 24px (px-6)
- Vertical padding: 16px (py-4)
- Logo/icon size: 40px (size-10)
- Icon container: Blue border (border-2 border-blue-600)

---

### 2. FilterBar

**Purpose**: Search and filter controls for dashboard content

**Structure**:
```tsx
<FilterBar />
```

**Features**:
- Area-based filtering
- Search functionality
- Advanced filter toggle (sliders icon)
- Filter indicator icon on left

**Styling Guidelines**:
- Gray background (bg-gray-50) with bottom border
- Input height: 36px (h-9)
- White input background
- Icons positioned absolutely in input right side

---

### 3. DashboardColumn

**Purpose**: Vertical column container for incident cards

**Props**:
```typescript
interface DashboardColumnProps {
  title: string;
  children: React.ReactNode;
}
```

**Structure**:
```tsx
<DashboardColumn title="Column Title">
  {/* IncidentCard components */}
</DashboardColumn>
```

**Features**:
- Column header with title
- More options menu (three dots)
- Scrollable content area
- Right border separator

**Styling Guidelines**:
- Minimum width: 320px (min-w-[320px])
- White background
- Header padding: 16px horizontal, 12px vertical
- Content padding: 16px (p-4)
- Gap between cards: 12px (gap-3)

---

### 4. IncidentCard

**Purpose**: Display individual incident information

**Props**:
```typescript
interface IncidentCardProps {
  category: string;           // e.g., "POLIS", "SOS ALARM"
  categoryColor: string;       // Tailwind classes for category badge
  type: string;                // e.g., "BRAND", "TRAFIKOLYCKA"
  typeColor: string;           // Tailwind classes for type badge
  title: string;               // Main incident title
  description: string;         // Incident description
  time: string;                // Time display (e.g., "08:28")
  location: string;            // Location string with separators
  notificationCount?: number;  // Optional notification badge count
  multiUser?: boolean;         // Optional multi-user indicator
}
```

**Structure**:
```tsx
<IncidentCard
  category="POLIS"
  categoryColor="bg-blue-100 text-blue-700"
  type="BRAND"
  typeColor="bg-orange-100 text-orange-700 hover:bg-orange-100"
  title="Incident title"
  description="Incident description..."
  time="08:28"
  location="City · Municipality · County"
  notificationCount={3}
  multiUser
/>
```

**Card Sections** (top to bottom):

1. **Header Section**:
   - Category label (uppercase, gray)
   - Type badge (colored pill)
   - Time stamp (right aligned)

2. **Content Section**:
   - Title (semibold, dark)
   - Description (smaller, gray)

3. **Footer Section**:
   - Location with map pin icon
   - Multi-user indicator (if applicable)
   - Notification count badge (if applicable)

**Styling Guidelines**:
- Padding: 16px (p-4)
- Border: 1px gray (border-gray-200)
- Hover: Blue border (hover:border-blue-400) and shadow
- Gap between sections: 12px (mb-3)
- Category text: 12px uppercase with wide tracking
- Title: 14px semibold with snug leading
- Description: 12px with relaxed leading
- Location text: 12px gray

**Notification Badge**:
- Size: 24px circle (size-6)
- Background: Blue (bg-blue-600)
- Text: White, 12px, semibold

**Multi-user Indicator**:
- Gray rounded pill (rounded-full bg-gray-100)
- Users icon + count
- Padding: 8px horizontal, 4px vertical

---

## Layout Patterns

### Multi-Column Dashboard Layout

```tsx
<div className="flex h-screen flex-col bg-gray-50">
  <DashboardHeader />
  <FilterBar />
  
  <div className="flex flex-1 overflow-hidden">
    <DashboardColumn title="Column 1">
      {/* Cards */}
    </DashboardColumn>
    
    <DashboardColumn title="Column 2">
      {/* Cards */}
    </DashboardColumn>
    
    {/* More columns... */}
  </div>
</div>
```

**Key Points**:
- Full screen height container (h-screen)
- Gray background (bg-gray-50)
- Flex column for header, filter, content
- Horizontal flex for columns
- Overflow hidden on container, scrolling in columns

---

## Typography

### Font Sizes & Weights

```css
/* Headers */
h1 (Dashboard title): text-lg font-semibold
h2 (Column title): font-semibold

/* Card Content */
Category label: text-xs font-medium uppercase tracking-wide
Type badge: text-xs font-medium
Card title: text-sm font-semibold leading-snug
Card description: text-xs leading-relaxed
Time: text-sm
Location: text-xs
```

### Text Colors

```css
/* Primary text */
text-gray-900 (titles, headings)

/* Secondary text */
text-gray-600 (descriptions, labels)

/* Tertiary text */
text-gray-500 (timestamps, metadata)
```

---

## Icons

### Icon Library
Use **lucide-react** for all icons

### Common Icons
```tsx
import {
  Bell,           // Dashboard/notifications
  ChevronDown,    // Dropdowns
  User,           // User profile
  Rss,            // RSS feeds
  Image,          // Image export
  Filter,         // Filter indicator
  Search,         // Search
  SlidersHorizontal, // Advanced filters
  MapPin,         // Location
  Users,          // Multi-user
  MoreVertical    // More options menu
} from "lucide-react";
```

### Icon Sizes
```css
Small icons: size-3.5 (14px)
Medium icons: size-4 (16px)
Large icons: size-5 (20px)
```

---

## Spacing System

### Component Spacing
```css
/* Container padding */
px-6 (24px horizontal) - Headers, main containers
px-4 (16px horizontal) - Cards, columns
py-3 (12px vertical) - Filter bar, column headers
py-4 (16px vertical) - Main header, cards

/* Gaps */
gap-2 (8px) - Small element groups
gap-3 (12px) - Card stacks, medium groups
gap-4 (16px) - Larger element groups
```

### Card Internal Spacing
```css
mb-2 (8px) - Title to description
mb-3 (12px) - Section separators
```

---

## Interactive States

### Hover States
```css
/* Cards */
hover:border-blue-400 hover:shadow-md

/* Buttons */
hover:bg-teal-700 (for primary actions)
hover:bg-gray-100 (for ghost buttons)
```

### Transitions
```css
transition-all (for cards)
```

---

## Badge Component Pattern

### Category Badge (Text only)
```tsx
<span className="text-xs font-medium uppercase tracking-wide text-gray-600">
  {category}
</span>
```

### Type Badge (Colored pill)
```tsx
<Badge className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
  {type}
</Badge>
```

### Status Badge (Live indicator)
```tsx
<Badge variant="secondary" className="h-5 bg-green-100 text-green-700 hover:bg-green-100">
  Live
</Badge>
```

---

## Data Formatting

### Time Format
- HH:MM (24-hour format)
- Example: "08:28", "15:13"

### Date Format
- Swedish format: "dag, DD månad"
- Example: "mån, 23 mars 15:33"

### Location Format
- Hierarchical with middle dot separators
- Pattern: "City · Municipality · County"
- Example: "Malmö · Malmö · Skåne län"

---

## Component Dependencies

### Required UI Components
From `/src/app/components/ui/`:
- `button.tsx` - Button component
- `badge.tsx` - Badge component
- `card.tsx` - Card component
- `input.tsx` - Input component
- `scroll-area.tsx` - ScrollArea component

### Required Icons
From `lucide-react`:
- Bell, ChevronDown, User, Image, Rss
- Filter, Search, SlidersHorizontal
- MapPin, Users, MoreVertical

---

## Coding Instructions for AI Agents

### Step 1: Create Component Files
Create the following files in `/src/app/components/`:
1. `DashboardHeader.tsx`
2. `FilterBar.tsx`
3. `DashboardColumn.tsx`
4. `IncidentCard.tsx`

### Step 2: Implement Components
Use the code patterns shown in this design system. Each component should:
- Import required UI components and icons
- Accept typed props interfaces
- Use consistent Tailwind classes as documented
- Follow the structural patterns shown

### Step 3: Build Main Layout
In `/src/app/App.tsx`:
- Import all dashboard components
- Create multi-column flex layout
- Add DashboardColumn components with appropriate titles
- Populate with IncidentCard components using mock data

### Step 4: Mock Data Structure
Create incident cards with varied:
- Categories (POLIS, SOS ALARM, TRAFIKVERKET, WORKFLOWS)
- Types (BRAND, TRAFIKOLYCKA, VÄSKA, OBEKÖRIGA TÅGET, ÄRENDE)
- Notification counts (1-3 or none)
- Multi-user flags (true/false)
- Swedish location strings

### Step 5: Color Application
Apply colors consistently:
- Blue for police and traffic accidents
- Red for SOS and unauthorized access
- Orange for fires
- Purple for traffic authority
- Amber for road incidents
- Teal for specific variants
- Green for live status

---

## Example Usage

### Creating a New Dashboard

```tsx
import { DashboardHeader } from "./components/DashboardHeader";
import { FilterBar } from "./components/FilterBar";
import { DashboardColumn } from "./components/DashboardColumn";
import { IncidentCard } from "./components/IncidentCard";

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <DashboardHeader />
      <FilterBar />
      
      <div className="flex flex-1 overflow-hidden">
        <DashboardColumn title="Category Name">
          <IncidentCard
            category="CATEGORY"
            categoryColor="bg-blue-100 text-blue-700"
            type="TYPE"
            typeColor="bg-orange-100 text-orange-700 hover:bg-orange-100"
            title="Incident Title"
            description="Detailed description of the incident..."
            time="15:33"
            location="City · Municipality · County"
            notificationCount={2}
            multiUser
          />
        </DashboardColumn>
      </div>
    </div>
  );
}
```

---

## Customization Guidelines

### Adding New Categories
1. Define category color in Color System section
2. Use format: `bg-{color}-100 text-{color}-700`
3. Apply to categoryColor prop

### Adding New Incident Types
1. Define type color in Color System section
2. Include hover state: `hover:bg-{color}-100`
3. Apply to typeColor prop

### Extending Columns
- Maintain minimum width of 320px
- Keep consistent header and spacing
- Ensure ScrollArea wraps content

### Modifying Card Layout
- Maintain 3-section structure (header, content, footer)
- Keep category/type badges in header
- Keep location/indicators in footer
- Adjust spacing using documented spacing system

---

## Accessibility Considerations

- Use semantic HTML elements
- Ensure sufficient color contrast
- Provide hover states for interactive elements
- Use descriptive icon labels (sr-only where needed)
- Maintain keyboard navigation support

---

## Performance Notes

- Use ScrollArea for column content to handle large datasets
- Lazy load incident cards if dataset exceeds 50 items per column
- Consider virtualization for columns with 100+ items
- Memoize IncidentCard components if experiencing performance issues

---

## Version History

- v1.0 (March 23, 2026) - Initial design system based on Swedish incident monitoring dashboard