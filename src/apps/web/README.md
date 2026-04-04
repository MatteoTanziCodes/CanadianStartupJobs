# Canadian Startup Jobs - Web Application

The web application is the client-facing interface for Canadian Startup Jobs, providing a modern, accessible, and performant experience for job seekers to discover and apply to opportunities at Canadian-owned startups.

## Overview

The web app is a Next.js 16 application with React 19, featuring a sophisticated component architecture, context-based state management, and a custom Canadian-themed design system. It provides real-time job browsing, filtering, search, and detailed job information.

### Key Features

- **Next.js 16 App Router**: Modern React framework with server and client components
- **Context-Based State Management**: Centralized state for jobs and filters
- **Client-Side Pagination**: Efficient job browsing with intuitive navigation
- **Advanced Filtering**: Filter by province, industry, role, experience level, and job type
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Canadian Design System**: Custom color palette reflecting Canadian themes
- **Accessibility**: Semantic HTML, ARIA labels, and keyboard navigation
- **Job Detail Pages**: Rich job information with organization details and tags
- **FAQ System**: Modal-based frequently asked questions

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 with custom design system
- **UI Components**: Radix UI primitives (Dialog, Popover, Select, ScrollArea)
- **Data Fetching**: Native fetch with API client abstraction
- **State Management**: React Context API
- **Type Safety**: TypeScript 5 with strict mode
- **Icons**: Lucide React
- **Font**: Custom fonts (Founders Grotesk Mono, Soehne)
- **Build Tool**: Turbopack (Next.js default)

## Project Structure

```
src/
├── app/                       # Next.js App Router pages
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Homepage (JobList)
│   ├── globals.css              # Global styles
│   ├── favicon.ico             # Custom favicon
│   ├── jobs/
│   │   └── [id]/
│   │       └── page.tsx        # Job detail page
│   └── about/
│       └── page.tsx            # About page
├── components/                 # React components
│   ├── Providers.tsx            # Context providers wrapper
│   ├── ui/                    # Shadcn/Radix UI primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── scroll-area.tsx
│   │   ├── spinner.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   └── ...
│   ├── jobs/                   # Job-related components
│   │   ├── JobCard.tsx          # Job listing card
│   │   ├── JobList/             # Job listing system
│   │   │   ├── index.tsx       # Layout wrapper
│   │   │   ├── Controller.tsx    # State router
│   │   │   ├── List.tsx         # Job cards + pagination
│   │   │   ├── ListPagination.tsx # Page controls
│   │   │   ├── Loading.tsx      # Loading state
│   │   │   ├── Empty.tsx        # Empty state
│   │   │   └── README.md       # Detailed docs
│   │   ├── JobDetail/           # Job detail page
│   │   │   ├── index.tsx       # Main orchestrator
│   │   │   ├── Header.tsx       # Title, company, location
│   │   │   ├── Description.tsx   # Job description
│   │   │   ├── Organization.tsx  # Company info
│   │   │   ├── Tags.tsx         # Job tags
│   │   │   ├── Apply.tsx        # Application buttons
│   │   │   ├── Footer.tsx       # Timestamps
│   │   │   └── README.md       # Detailed docs
│   │   └── Minor/               # Utility badges
│   │       ├── LocationBadge.tsx
│   │       ├── RemoteBadge.tsx
│   │       └── StartupBadge.tsx
│   ├── tools/                  # Search and filter tools
│   │   ├── search/
│   │   │   └── index.tsx        # Search input
│   │   └── filters/
│   │       ├── index.tsx         # Filter container
│   │       ├── provinces/         # Province filter
│   │       ├── industries/        # Industry filter
│   │       ├── roles/            # Role filter
│   │       ├── jobTypes/         # Job type filter
│   │       └── experienceLevels/  # Experience filter
│   ├── layout/                 # Layout components
│   │   └── Sidebar/
│   │       └── index.tsx        # Main sidebar
│   ├── FAQ/                    # FAQ system
│   │   ├── FAQButton.tsx         # FAQ trigger button
│   │   ├── FAQModal.tsx          # FAQ dialog
│   │   └── index.tsx            # FAQ container
│   ├── legacy/                  # Legacy components (being phased out)
│   │   ├── Homepage.tsx
│   │   ├── Sidebar.tsx
│   │   ├── jobs/
│   │   │   ├── filterConfig.ts
│   │   │   ├── jobCard.tsx
│   │   │   ├── jobList.tsx
│   │   │   └── jobsProvider.tsx
│   │   └── layout/
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── ...
│   └── common/                 # Common utility components
│       ├── icon.tsx
│       ├── spinner.tsx
│       └── svg/
│           └── BuildCanada.tsx
├── contexts/                  # React Context providers
│   ├── README.md
│   ├── jobs/
│   │   ├── index.tsx           # JobsContext provider
│   │   ├── types.ts            # Job types
│   │   └── helpers/
│   │       ├── filtering.ts      # Client-side filtering
│   │       ├── mapping.ts        # API to frontend mapping
│   │       └── selection.ts      # Job selection logic
│   └── filters/
│       └── index.tsx           # FiltersContext provider
├── data/                      # Data layer
│   └── api/
│       ├── jobs/
│       │   └── index.ts        # Jobs API client
│       └── tags/
│           └── index.ts        # Tags API client
├── lib/                       # Utilities and helpers
│   ├── api.ts                  # Generic API client
│   └── utils.ts               # Utility functions
├── utils/                     # Utility modules
│   ├── config.ts               # Configuration (API URLs)
│   ├── constants.ts            # Constants (colors, etc.)
│   ├── helpers.ts              # Helper functions
│   ├── styling.ts              # Styling utilities
│   └── types.ts               # Shared types
├── hooks/                     # Custom React hooks
│   ├── use-toast.ts            # Toast notifications
│   ├── usePagination.ts        # Pagination logic
│   └── useResponsive.ts       # Responsive breakpoints
├── styles/                    # Custom styles
│   ├── main.css               # Main stylesheet
│   ├── variables.css          # CSS variables
│   ├── mixins.css             # CSS mixins
│   ├── animations.css         # Animations
│   ├── themes/
│   │   └── main.css          # Theme definitions
│   └── colours/              # Color palette
│       ├── index.ts           # Color exports
│       ├── amethyst.ts        # Purple tones
│       ├── auburn.ts         # Brown/red tones
│       ├── aurora.ts          # Northern lights
│       ├── canada-red.ts     # Canadian flag red
│       ├── cerulean.ts       # Blue tones
│       ├── charcoal.ts       # Grayscale
│       ├── copper.ts         # Metal tones
│       ├── emerald.ts        # Green tones
│       ├── lake.ts           # Blue-green
│       ├── linen.ts          # Neutral beige
│       ├── maritime.ts       # Maritime blue
│       ├── nickel.ts         # Gray metal
│       ├── pine.ts          # Forest green
│       ├── sienna.ts         # Earth tones
│       └── steel.ts         # Metal gray
└── public/                    # Static assets
    ├── fonts/                 # Custom font files
    ├── build_canada.svg       # Logo
    └── ...                   # Other assets
```

## Quick Start

### Prerequisites

- Node.js 20+ or Bun
- npm or bun
- Backend server running (http://localhost:3050)

### Development

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Application will run on http://localhost:3000
```

### Production Build

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## Environment Variables

Required environment variables:

```bash
# API URL (default: http://localhost:3050)
NEXT_PUBLIC_API_URL=http://localhost:3050

# Base URL for metadata (default: https://buildcanada.com)
NEXT_PUBLIC_BASE_URL=https://buildcanada.com

# Base path (for subdirectory deployments)
NEXT_PUBLIC_BASE_PATH=
```

## Pages & Routing

### Homepage (`/`)

**Route**: `app/page.tsx`

Displays main job listing with:
- JobList component with pagination
- Sidebar with search and filters
- FAQ button

**Features**:
- Real-time job browsing
- Client-side filtering
- Server-side pagination (10 jobs/page)
- Loading and empty states

### Job Detail Page (`/jobs/[id]`)

**Route**: `app/jobs/[id]/page.tsx`

Displays comprehensive job information:
- Job title, company, location
- Job description
- Organization details
- Job tags (province, experience, industry, role, job type)
- Application buttons (Apply Now, View Job Board)
- Posted and updated timestamps

**Server Component**:
- Fetches job data server-side
- Includes organization and tags
- Returns 404 if job not found

### About Page (`/about`)

**Route**: `app/about/page.tsx`

Project information and mission statement.

## Context System

### JobsContext

**Location**: `contexts/jobs/index.tsx`

Provides job state and pagination management:

**State**:
```typescript
{
  jobsById: Record<string, Job>;        // Jobs keyed by ID
  jobIds: string[];                  // Job ID order
  isLoading: boolean;                 // Loading state
  totalPages: number;                 // Total pages
  currentPage: number;                 // Current page
  totalJobs: number;                  // Total job count
  filteredJobs: Job[];               // Client-side filtered jobs
  searchTerm: string;                 // Search query
  filters: FilterState;               // Active filters
}
```

**Methods**:
```typescript
{
  goToPage(page: number): void;        // Navigate to page
  nextPage(): void;                   // Next page
  prevPage(): void;                   // Previous page
  setSearchTerm(term: string): void;   // Update search
}
```

**Data Flow**:
1. Component mounts or filters change
2. `useEffect` triggers API fetch with `skip/take` and filter params
3. API returns jobs for page + total count
4. Context updates `jobsById` with new jobs
5. Components re-render with updated data

### FiltersContext

**Location**: `contexts/filters/index.tsx`

Manages filter state for job listings:

**Filters**:
```typescript
{
  province: number | undefined;
  industry: number | undefined;
  role: number | undefined;
  jobType: number | undefined;
  experience: number | undefined;
}
```

**Integration**:
- Filter changes trigger JobsContext refetch
- Server-side filtering via API query params
- Client-side filtering for search term

## API Integration

### Jobs API Client

**Location**: `data/api/jobs/index.ts`

Type-safe API client for jobs:

**Methods**:
```typescript
jobsApi.list(skip, take, filters)  // List jobs with pagination
jobsApi.getRichById(id)            // Get single job with rich data
```

**Types**:
```typescript
type Job = {
  id: number;
  title: string;
  city: string;
  province: string;
  remoteOk: boolean;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  company: string;
  jobBoardUrl?: string;
  postingUrl?: string;
  isAtAStartup?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type JobWithRichData = Job & {
  organization: Organization | null;
  tags: {
    provinces: Province[];
    experienceLevels: ExperienceLevel[];
    industries: Industry[];
    jobTypes: JobType[];
    roles: Role[];
  };
};
```

### Tags API Client

**Location**: `data/api/tags/index.ts`

Fetches tag/filter options:

**Methods**:
```typescript
tagsApi.provinces()           // Get all provinces
tagsApi.industries()         // Get all industries
tagsApi.roles()              // Get all roles
tagsApi.jobTypes()           // Get all job types
tagsApi.experienceLevels()    // Get all experience levels
tagsApi.raisingStages()      // Get company raising stages
tagsApi.teamSizes()          // Get company team sizes
```

## Component Architecture

### Design Patterns

#### State-Based Rendering
Components route to appropriate UI based on state:

```tsx
// Example from JobList Controller
if (isLoading) return <Loading />;
if (isEmpty) return <Empty />;
return <List />;
```

**Benefits**:
- Clear separation of concerns
- Each state component is independent
- Easy to add new states

#### Composition Pattern
Complex components are composed of smaller, focused sub-components:

```tsx
// Example from JobDetail
<JobDetail job={job}>
  <Header {...headerProps} />
  <Description {...descProps} />
  <Organization {...orgProps} />
  <Tags {...tagsProps} />
  <Apply {...applyProps} />
  <Footer {...footerProps} />
</JobDetail>
```

**Benefits**:
- Single Responsibility Principle
- Reusable sub-components
- Easier testing
- Clear data flow

#### Context Consumer Pattern
Components consume context via custom hooks:

```tsx
const { jobsById, isLoading, currentPage, goToPage } = useJobsContext();
```

**Benefits**:
- No prop drilling
- Single source of truth
- Shared state across components

### Component Examples

#### JobCard

**Location**: `components/jobs/JobCard.tsx`

Displays job summary in listing:
- Title, company, location
- Remote and startup badges
- Truncated description

#### JobList

**Location**: `components/jobs/JobList/`

Modular job listing system with:
- State router (Controller)
- Loading and empty states
- Pagination controls
- Scrollable job cards

**Documentation**: See `components/jobs/JobList/README.md`

#### JobDetail

**Location**: `components/jobs/JobDetail/`

Composed job detail component with:
- Header (title, company, location, badges)
- Description (formatted job text)
- Organization (company details)
- Tags (categorized badges)
- Apply buttons
- Footer (timestamps)

**Documentation**: See `components/jobs/JobDetail/README.md`

## Styling System

### Color Palette

Canadian-themed colors with named exports:

**Primary Colors**:
- `canada-red` (#8b2332) - Brand red, used for links and primary actions
- `linen` (#f5f5f0) - Neutral background
- `charcoal` (#1a1a1a) - Dark text

**Thematic Colors**:
- `aurora` - Northern lights theme
- `amethyst` - Purple tones
- `auburn` - Brown/red tones
- `cerulean` - Blue tones
- `emerald` - Green tones
- `lake` - Blue-green
- `maritime` - Maritime blue
- `pine` - Forest green
- `nickel` - Gray metal
- `steel` - Metal gray
- `copper` - Metal tones
- `sienna` - Earth tones

### Tailwind Configuration

**Location**: `tailwind.config.ts`

Custom configuration includes:
- Color palette imports
- Custom utilities
- Font families
- Responsive breakpoints

### CSS Variables

**Location**: `styles/variables.css`

Global CSS variables for:
- Colors
- Spacing
- Typography
- Borders

### Custom Styles

**Location**: `styles/`

- `main.css` - Main application styles
- `mixins.css` - Reusable CSS mixins
- `animations.css` - Custom animations
- `themes/main.css` - Theme definitions

## Filtering & Search

### Filter Components

Located in `components/tools/filters/`:

**Filter Types**:
1. **Provinces** - Filter by Canadian province
2. **Industries** - Filter by industry (tech, marketing, etc.)
3. **Roles** - Filter by job role (developer, designer, etc.)
4. **Job Types** - Filter by employment type (full-time, contract, etc.)
5. **Experience Levels** - Filter by experience (junior, senior, etc.)

**Implementation**:
- Each filter is a separate component
- Uses Radix UI Select
- Updates FiltersContext
- Triggers server-side fetch with filter params

### Search

**Location**: `components/tools/search/index.tsx`

Text-based job search:
- Real-time search updates
- Client-side filtering of fetched results
- Integrated with JobsContext

### Filter Workflow

```
1. User selects filter (e.g., Industry: Technology)
2. FiltersContext updates filter state
3. JobsContext detects filter change
4. useEffect triggers API fetch with filter param
5. API returns filtered jobs for current page
6. Context updates jobsById
7. UI re-renders with filtered jobs
```

## Layout Architecture

### Root Layout

**Location**: `app/layout.tsx`

Application layout structure:
- HTML5 semantic structure
- Providers wrapper (JobsContext, FiltersContext)
- Sidebar + main content grid
- Footer component
- Toaster for notifications

**Grid Layout**:
```
┌─────────────────────────────────────┐
│ Sidebar (280px) │ Main Content │
│                  │              │
│                  │              │
└─────────────────────────────────────┘
```

**Responsive Breakpoints**:
- Mobile: Stacked layout
- Tablet: Stacked layout
- Desktop (lg+): Grid with 280px sidebar

### Sidebar

**Location**: `components/layout/Sidebar/index.tsx`

Main sidebar containing:
- Page title
- Search input
- Filter components
- FAQ button

**Styling**:
- Fixed width on desktop (280px)
- Full width on mobile
- Scrollable content area

## Accessibility

### Semantic HTML

- `<article>` for job details
- `<section>` for logical sections
- `<header>` and `<footer>` for document structure
- `<button>` for interactive elements
- ARIA labels and roles

### Keyboard Navigation

- Tab order follows visual layout
- Focus states visible
- Keyboard shortcuts (when implemented)

### Screen Reader Support

- Descriptive link text
- ARIA labels for icons
- Semantic headings hierarchy

## Performance Considerations

### Pagination

- Server-side pagination (10 jobs/page)
- Reduces initial payload
- Improves time to interactive

### Client-Side Filtering

- Filters processed on server (reduces data transfer)
- Search processed on client (instant feedback)
- Efficient array operations

### Code Splitting

- Next.js automatic code splitting
- Dynamic imports for heavy components
- Reduced bundle size

### Image Optimization

- Next.js Image component (when using images)
- Responsive image serving
- Lazy loading

## Development Patterns

### Adding New Pages

1. Create file in `app/[route]/page.tsx`
2. Make server or client component as needed
3. Fetch data or use context
4. Render components
5. Update navigation if needed

### Adding New Filters

1. Create filter component in `components/tools/filters/[filter]/`
2. Create index.tsx with Select control
3. Create control.tsx with Popover implementation
4. Add filter type to FiltersContext
5. Add API endpoint (if server-side)
6. Add to filter container in `components/tools/filters/index.tsx`

### Adding New Components

1. Create component file in appropriate folder
2. Follow existing patterns (composition, state-based)
3. Use TypeScript with proper types
4. Add documentation for complex components
5. Export from index file if in folder

### Using UI Components

UI components from Radix UI (in `components/ui/`):

```tsx
import { Button, Dialog, Select, ScrollArea } from "@/components/ui";
```

Available components:
- Button, Card, Dialog, Popover
- Select, ScrollArea, Separator
- Empty, Item, Spinner
- Toast, Toaster, Pagination

## FAQ System

### FAQ Components

**Location**: `components/FAQ/`

- **FAQButton**: Trigger button in sidebar
- **FAQModal**: Dialog with FAQ content
- **index.tsx**: FAQ container

### FAQ Content

Modal displays frequently asked questions about:
- Platform purpose
- Job posting process
- Canadian startup verification
- Application process

### Customization

Edit FAQ content in `components/FAQ/FAQModal.tsx` to update questions.

## Deployment

### Environment Setup

1. Set environment variables
2. Configure base URL for production
3. Update CORS origins on server

### Build Process

```bash
# Production build
bun run build

# Output: .next/ directory with optimized code
```

### Static Export (Optional)

If using static hosting:

**next.config.ts**:
```typescript
output: 'export'
```

### Deployment Platforms

**Vercel**:
- Connect GitHub repository
- Set environment variables
- Automatic builds and deployments

**Render**:
- Connect repository
- Set build command: `bun run build`
- Set start command: `bun run start`

**Docker**:
- Build Next.js app
- Serve with Node.js
- Use nginx reverse proxy

## Troubleshooting

### Common Issues

**API connection errors**:
- Verify NEXT_PUBLIC_API_URL is correct
- Check server is running on port 3050
- Verify CORS configuration on server

**Build errors**:
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm bun.lockb && bun install`
- Check TypeScript errors

**Styling issues**:
- Verify Tailwind classes are correct
- Check color palette imports
- Clear browser cache

**State not updating**:
- Check context provider wrapping
- Verify useEffect dependencies
- Check for stale closures

### Debug Mode

Next.js provides debugging in development:
- React DevTools for component inspection
- Source maps for debugging
- Error overlay for runtime errors

## Performance Optimization

### Current Optimizations

- Server-side pagination
- Code splitting
- Image optimization (when using images)
- Efficient re-renders with useCallback/useMemo

### Future Optimizations

- Virtual scrolling for large lists
- Service worker for offline support
- Request caching
- Bundle size optimization
- Lazy load components

## Contributing

### Code Style

- TypeScript strict mode
- Functional components with hooks
- Descriptive component names
- Proper TypeScript typing
- Semantic HTML

### Testing

Manual testing for components:
- Test responsive behavior
- Verify accessibility
- Check filtering logic
- Test pagination

### Documentation

Add README.md for complex components:
- Overview and purpose
- Component hierarchy
- Usage examples
- Props documentation
- Design patterns

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Planned features:
- Advanced search (boolean operators, filters)
- Job bookmarks and saved searches
- Email alerts for new jobs
- Mobile app (React Native)
- Dark mode
- Job application tracking
- Company reviews and ratings
- Salary insights and trends

## Support

For issues or questions:
- Check component README files in `components/jobs/`
- Review context documentation in `contexts/`
- Test API endpoints directly
- Check browser console for errors

---

**Default Port**: 3000
**API URL**: http://localhost:3050
**Page Size**: 10 jobs
**Framework**: Next.js 16
**Runtime**: React 19
**Styling**: Tailwind CSS 4
