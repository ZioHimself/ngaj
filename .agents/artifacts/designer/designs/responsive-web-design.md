# Responsive Web Design - Technical Specification

📋 **Decision Context**: [ADR-015](../../../docs/architecture/decisions/015-responsive-web-design.md)

## Overview

Unified mobile-first responsive design system for the entire ngaj frontend. All screens are designed for mobile-first access, as users primarily access the locally-hosted web UI from phones/tablets on the same network.

**Screens Covered:**
1. Login Page (`/login`) - Entry point for mobile users
2. Setup Wizard (`/setup`) - First-time configuration
3. Opportunities Dashboard (`/opportunities`) - Primary daily-use interface

## Breakpoint Strategy

### Tailwind Default Breakpoints (Mobile-First)

```typescript
// Base styles = mobile (< 640px)
// sm: ≥ 640px - Large phones, small tablets
// md: ≥ 768px - Tablets
// lg: ≥ 1024px - Desktop
// xl: ≥ 1280px - Large desktop (rarely needed)
```

### Application Pattern

```tsx
// Mobile-first: base is mobile, add responsive modifiers for larger
<div className="p-4 sm:p-6 lg:p-8">
  <button className="w-full sm:w-auto">Action</button>
</div>
```

---

## Screen Specifications

### 1. Login Page (`/login`)

The login page is the first screen mobile users see. It must be simple, centered, and touch-friendly.

**Mobile Layout**

```
┌─────────────────────────────┐
│                             │
│                             │
│           ngaj              │ ← App title
│                             │
│   Enter your access code    │ ← Subtitle
│      to continue            │
│                             │
│ ┌─────────────────────────┐ │
│ │  XXXX-XXXX-XXXX-XXXX    │ │ ← Large input, monospace
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │         Login           │ │ ← Full-width, h-12
│ └─────────────────────────┘ │
│                             │
│   Find your access code     │ ← Hint text
│   in the terminal where     │
│   ngaj is running           │
│                             │
└─────────────────────────────┘
```

**Desktop Layout**: Same, but constrained to `max-w-md` (448px) and centered.

**Tailwind Implementation**

```tsx
// LoginPage.tsx
export function LoginPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || 'Invalid access code');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ngaj</h1>
        <p className="text-slate-500 mb-8">
          Enter your access code to continue
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="
              w-full px-4 py-4 
              text-xl font-mono text-center tracking-wider
              border-2 border-slate-200 rounded-xl
              focus:border-blue-500 focus:outline-none
              placeholder:text-slate-300 placeholder:tracking-widest
              disabled:bg-slate-100
            "
            autoComplete="off"
            autoFocus
            disabled={isLoading}
          />

          {/* Error message */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="
              w-full h-12 
              bg-blue-500 text-white font-medium rounded-xl
              hover:bg-blue-600 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        {/* Hint */}
        <p className="mt-8 text-sm text-slate-400 leading-relaxed">
          Find your access code in the terminal<br />
          where ngaj is running
        </p>
      </div>
    </div>
  );
}
```

**Key Responsive Behaviors:**
- Input and button are always full-width (simple layout)
- `max-w-md` constrains width on larger screens
- Large touch targets: input `py-4`, button `h-12`
- Centered vertically on all screen sizes

---

### 2. Setup Wizard (`/setup`)

The Setup Wizard already uses Tailwind utilities but needs mobile optimization.

**Current Issues:**
- `max-w-xl` (576px) is good but could be `max-w-lg` (512px) for better mobile fit
- Form inputs need larger touch targets on mobile
- Step navigation could be more thumb-friendly

**Mobile Layout**

```
┌─────────────────────────────┐
│ ngaj Setup        Step 1/3  │ ← Sticky header
├─────────────────────────────┤
│ ○───────○───────○           │ ← Progress indicator
├─────────────────────────────┤
│                             │
│    Create Your Profile      │
│                             │
│ Profile Name                │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ Voice                       │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ ... more fields ...         │
│                             │
│ ┌─────────────────────────┐ │
│ │         Next            │ │ ← Full-width, h-12
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**CSS Updates**

Update `index.css` button and input classes:

```css
@layer components {
  .btn {
    @apply px-6 py-3 font-medium rounded-lg transition-colors duration-150;
    @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
    @apply h-12 sm:h-10; /* 48px on mobile, 40px on desktop */
  }

  .input {
    @apply w-full px-4 py-4 sm:py-3 border-2 border-slate-200 rounded-lg;
    @apply focus:outline-none focus:border-blue-500;
    @apply placeholder:text-slate-400;
    @apply transition-colors duration-150;
    @apply text-base; /* Prevents iOS zoom on focus */
  }

  .textarea {
    @apply w-full px-4 py-4 sm:py-3 border-2 border-slate-200 rounded-lg resize-none;
    @apply focus:outline-none focus:border-blue-500;
    @apply placeholder:text-slate-400;
    @apply transition-colors duration-150;
    @apply text-base; /* Prevents iOS zoom on focus */
  }
}
```

**Key Changes:**
- Button height: `h-12` (48px) on mobile, `h-10` (40px) on desktop
- Input padding: `py-4` on mobile, `py-3` on desktop
- `text-base` (16px) prevents iOS auto-zoom on input focus

---

## Component Specifications

### 3. OpportunityCard

**Mobile Layout (< 640px)**

```
┌─────────────────────────────┐
│ @handle • 2.3k followers    │ ← Single line, truncate if needed
│ 15 minutes ago              │
├─────────────────────────────┤
│                             │
│ Post content that wraps     │
│ naturally on narrow...      │
│                             │
├─────────────────────────────┤
│ Score: 87                   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │   Generate Response     │ │ ← Full width, h-12 (48px)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │       Dismiss           │ │ ← Full width, h-12 (48px)
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Desktop Layout (≥ 1024px)**

```
┌──────────────────────────────────────────────────────┐
│ @handle • 2.3k followers        Score: 87 • 15m ago  │
├──────────────────────────────────────────────────────┤
│ Post content with more horizontal space...           │
├──────────────────────────────────────────────────────┤
│              [Generate Response]  [Dismiss]          │
└──────────────────────────────────────────────────────┘
```

**Tailwind Implementation**

```tsx
// OpportunityCard.tsx structure
<article className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
  {/* Header */}
  <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-3">
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-slate-900 truncate">@{handle}</span>
      <span className="text-slate-400">•</span>
      <span className="text-slate-500">{followers} followers</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="hidden sm:inline">Score: {score}</span>
      <span className="sm:hidden">Score: {score} •</span>
      <span>{timeAgo}</span>
    </div>
  </header>

  {/* Content */}
  <div className="text-slate-700 mb-4 leading-relaxed">
    {content}
  </div>

  {/* Score badge (mobile only - shown in header on desktop) */}
  <div className="sm:hidden mb-4">
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      Score: {score}
    </span>
  </div>

  {/* Actions */}
  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
    <button className="btn btn-primary h-12 sm:h-10 w-full sm:w-auto">
      Generate Response
    </button>
    <button className="btn btn-secondary h-12 sm:h-10 w-full sm:w-auto">
      Dismiss
    </button>
  </div>
</article>
```

### 4. Response Editor Modal

**Behavior**: Opens as full-screen modal on mobile when response is generated or being edited.

**Mobile Layout**

```
┌─────────────────────────────┐
│ ← Back          Edit Reply  │ ← Fixed header
├─────────────────────────────┤
│                             │
│ Original post preview       │
│ (collapsed, expandable)     │
│                             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ Your response text      │ │
│ │ area with adequate      │ │
│ │ height for editing...   │ │
│ │                         │ │
│ └─────────────────────────┘ │
│              247/300 chars  │
│                             │
├─────────────────────────────┤
│ [Regenerate]    [Post Now]  │ ← Fixed footer
└─────────────────────────────┘
```

**Desktop Layout**: Same modal but max-width constrained, centered with backdrop.

**Tailwind Implementation**

```tsx
// ResponseModal.tsx
interface ResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityWithAuthor;
  response: Response;
  onPost: () => void;
  onRegenerate: () => void;
  onTextChange: (text: string) => void;
  isPosting: boolean;
  isRegenerating: boolean;
}

// Modal container
<div className={`
  fixed inset-0 z-50 
  ${isOpen ? 'block' : 'hidden'}
`}>
  {/* Backdrop (visible on desktop) */}
  <div 
    className="hidden sm:block fixed inset-0 bg-black/50"
    onClick={onClose}
  />
  
  {/* Modal content */}
  <div className="
    fixed inset-0 sm:inset-auto 
    sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
    sm:max-w-lg sm:w-full sm:max-h-[90vh]
    bg-white sm:rounded-xl
    flex flex-col
  ">
    {/* Header */}
    <header className="
      flex items-center justify-between 
      px-4 py-3 
      border-b border-slate-200
      shrink-0
    ">
      <button 
        onClick={onClose}
        className="flex items-center gap-2 text-slate-600 h-10 px-2 -ml-2"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="sm:hidden">Back</span>
      </button>
      <h2 className="font-semibold text-slate-900">Edit Reply</h2>
      <div className="w-10" /> {/* Spacer for centering */}
    </header>

    {/* Scrollable content */}
    <div className="flex-1 overflow-y-auto p-4">
      {/* Original post preview */}
      <details className="mb-4">
        <summary className="text-sm text-slate-500 cursor-pointer">
          Replying to @{opportunity.author.handle}
        </summary>
        <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          {opportunity.content.text}
        </p>
      </details>

      {/* Response textarea */}
      <textarea
        value={response.text}
        onChange={(e) => onTextChange(e.target.value)}
        className="
          w-full min-h-[200px] p-4
          border-2 border-slate-200 rounded-lg
          focus:border-blue-500 focus:outline-none
          resize-none
          text-base leading-relaxed
        "
        placeholder="Write your response..."
        maxLength={300}
      />
      <div className="text-right text-sm text-slate-500 mt-1">
        {response.text.length}/300
      </div>
    </div>

    {/* Footer actions */}
    <footer className="
      flex gap-3 p-4 
      border-t border-slate-200
      shrink-0
    ">
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="btn btn-secondary h-12 flex-1"
      >
        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
      </button>
      <button
        onClick={onPost}
        disabled={isPosting || response.text.length === 0}
        className="btn btn-primary h-12 flex-1"
      >
        {isPosting ? 'Posting...' : 'Post Now'}
      </button>
    </footer>
  </div>
</div>
```

### 5. FilterBar

**Mobile**: Horizontal scrollable tabs
**Desktop**: Static tabs, potentially with counts

```tsx
// FilterBar.tsx
<nav className="
  flex gap-2 
  overflow-x-auto 
  pb-2 -mb-2  /* Hide scrollbar on mobile */
  scrollbar-hide
">
  {filters.map((filter) => (
    <button
      key={filter.value}
      onClick={() => onFilterChange(filter.value)}
      className={`
        shrink-0 px-4 py-2 rounded-full text-sm font-medium
        transition-colors
        ${currentFilter === filter.value
          ? 'bg-blue-500 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }
      `}
    >
      {filter.label}
    </button>
  ))}
</nav>
```

### 6. Load More Pagination

Replaces numbered pagination with a simple load-more pattern.

```tsx
// LoadMoreButton.tsx
interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  totalCount: number;
}

<div className="flex flex-col items-center gap-3 py-6">
  {hasMore ? (
    <button
      onClick={onLoadMore}
      disabled={isLoading}
      className="btn btn-secondary h-12 px-8"
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Spinner className="w-4 h-4" />
          Loading...
        </span>
      ) : (
        'Load More'
      )}
    </button>
  ) : (
    <p className="text-sm text-slate-500">
      Showing all {totalCount} opportunities
    </p>
  )}
  <p className="text-xs text-slate-400">
    {loadedCount} of {totalCount} loaded
  </p>
</div>
```

### 7. Error State (Server Unreachable)

Prominent full-screen error when API is unavailable.

```tsx
// ErrorState.tsx
<div className="
  min-h-screen 
  flex flex-col items-center justify-center 
  p-6 text-center
  bg-slate-50
">
  <div className="
    w-16 h-16 mb-6 
    rounded-full bg-red-100 
    flex items-center justify-center
  ">
    <ExclamationIcon className="w-8 h-8 text-red-500" />
  </div>
  
  <h1 className="text-xl font-bold text-slate-900 mb-2">
    Connection Lost
  </h1>
  
  <p className="text-slate-600 mb-6 max-w-sm">
    Unable to reach the ngaj server. Make sure the backend is running 
    and you're connected to the same network.
  </p>
  
  <button
    onClick={onRetry}
    className="btn btn-primary h-12 px-8"
  >
    Try Again
  </button>
</div>
```

### 8. Dashboard Layout

```tsx
// OpportunitiesDashboard.tsx
<div className="min-h-screen bg-slate-50">
  {/* Header */}
  <header className="
    sticky top-0 z-10
    bg-white border-b border-slate-200
    px-4 py-3 sm:px-6 sm:py-4
  ">
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">
        Opportunities
      </h1>
      <FilterBar
        currentFilter={filter}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
      />
    </div>
  </header>

  {/* Main content */}
  <main className="px-4 py-4 sm:px-6 sm:py-6">
    <div className="max-w-3xl mx-auto space-y-4">
      {opportunities.map((opp) => (
        <OpportunityCard
          key={opp._id}
          opportunity={opp}
          onGenerateResponse={handleGenerateResponse}
          onDismiss={handleDismiss}
          // ... other props
        />
      ))}
      
      <LoadMore
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={handleLoadMore}
        loadedCount={opportunities.length}
        totalCount={total}
      />
    </div>
  </main>

  {/* Response Modal */}
  <ResponseModal
    isOpen={!!selectedOpportunity}
    onClose={() => setSelectedOpportunity(null)}
    opportunity={selectedOpportunity}
    response={currentResponse}
    // ... other props
  />
</div>
```

## CSS Utilities Update

Update `packages/frontend/src/index.css` to add scrollbar-hide utility:

```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

## Button Classes Update

Update existing button component classes for touch targets:

```css
@layer components {
  .btn {
    @apply px-6 py-3 font-medium rounded-lg transition-colors duration-150;
    @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
    @apply min-h-[48px] sm:min-h-[40px]; /* Touch-friendly on mobile */
  }
  
  /* ... rest unchanged */
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `packages/frontend/src/index.css` | Add scrollbar-hide utility, update .btn/.input min-height and padding |
| `packages/frontend/src/pages/LoginPage.tsx` | Create with Tailwind utilities (replaces CSS class design) |
| `packages/frontend/src/pages/SetupWizard.tsx` | Minor responsive tweaks |
| `packages/frontend/src/pages/OpportunitiesDashboard.tsx` | Refactor to Tailwind utilities, add modal state |
| `packages/frontend/src/components/wizard/StepProfile.tsx` | Already uses Tailwind, verify touch targets |
| `packages/frontend/src/components/wizard/StepAccount.tsx` | Already uses Tailwind, verify touch targets |
| `packages/frontend/src/components/wizard/StepDiscovery.tsx` | Already uses Tailwind, verify touch targets |
| `packages/frontend/src/components/dashboard/OpportunityCard.tsx` | Refactor to Tailwind utilities |
| `packages/frontend/src/components/dashboard/FilterBar.tsx` | Refactor to Tailwind utilities |
| `packages/frontend/src/components/dashboard/Pagination.tsx` | Replace with LoadMore component |
| `packages/frontend/src/components/dashboard/ResponseEditor.tsx` | Convert to modal (ResponseModal) |
| `packages/frontend/src/App.tsx` | Add `/login` route |

## New Components

| Component | Purpose |
|-----------|---------|
| `LoginPage.tsx` | Token-based login page (mobile-optimized) |
| `ResponseModal.tsx` | Full-screen modal for editing responses |
| `LoadMore.tsx` | Load more button with progress indicator |
| `ErrorState.tsx` | Full-screen error display |

## Open Questions

1. **Keyboard handling**: Should we add `inputmode="text"` attributes for mobile keyboards?
2. **Pull-to-refresh**: Should we add pull-to-refresh on the dashboard? (Deferred - can add later)
3. **Haptic feedback**: Should buttons provide haptic feedback on mobile? (Deferred - browser support varies)
