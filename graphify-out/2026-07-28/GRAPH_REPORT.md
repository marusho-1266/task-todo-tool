# Graph Report - .  (2026-07-28)

## Corpus Check
- 73 files · ~182,486 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 957 edges · 32 communities (19 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Projects & Tasks Server Actions
- Prepare Tomorrow & Todo Scheduling
- Timeline Rendering & Time Math
- Dashboard Shell & Session Modals
- TypeScript Compiler Config
- Work Session Lifecycle
- Runtime Dependencies & Scripts
- Theme System & Root Layout
- Dev Tooling & Build Deps
- Google Calendar & Domain Types
- Home Page Data Loading
- MVP Database Schema
- Row Level Security Policies
- Login Page & Supabase Client
- Auth Middleware & Session Refresh
- Vercel Deploy Config
- Ad-hoc Sessions Migration
- Landing Page
- Auth Signup Trigger
- Idea Refine Skill Script
- ESLint Config
- Supabase MCP Config
- Next.js Config
- Next Env Types
- PostCSS Config
- Task Priority Migration
- Task Completed-At Migration
- Compact Block Height Constant

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 30 edges
2. `createClient()` - 21 edges
3. `compilerOptions` - 16 edges
4. `DashboardClient()` - 14 edges
5. `Timeline()` - 14 edges
6. `snapMinutes()` - 14 edges
7. `BacklogPanel()` - 13 edges
8. `minutesFromDayStart()` - 13 edges
9. `datetimeFromMinutes()` - 13 edges
10. `Todo` - 13 edges

## Surprising Connections (you probably didn't know these)
- `fetchCalendarEvents()` --calls--> `createClient()`  [EXTRACTED]
  app/actions/google-calendar.ts → lib/supabase/server.ts
- `getAuthedUser()` --calls--> `createClient()`  [EXTRACTED]
  app/actions/prepare-tomorrow.ts → lib/supabase/server.ts
- `getAuthedUser()` --calls--> `createClient()`  [EXTRACTED]
  app/actions/sessions.ts → lib/supabase/server.ts
- `scheduleBacklogTask()` --calls--> `findOverlappingTodo()`  [EXTRACTED]
  app/actions/tasks.ts → lib/overlap.ts
- `scheduleBacklogTask()` --calls--> `snapMinutes()`  [EXTRACTED]
  app/actions/tasks.ts → lib/time.ts

## Import Cycles
- None detected.

## Communities (32 total, 13 thin omitted)

### Community 0 - "Projects & Tasks Server Actions"
Cohesion: 0.08
Nodes (50): signOut(), createProject(), deleteProject(), getAuthedUser(), getProjects(), getProjectsWithTaskCount(), reassignAndDeleteProject(), updateProject() (+42 more)

### Community 1 - "Prepare Tomorrow & Todo Scheduling"
Cohesion: 0.09
Nodes (41): getAuthedUser(), getCarryOverCandidates(), prepareTomorrow(), deleteTodo(), fetchPlacedTodosForDate(), getAuthedUser(), getPlacedTodosForDate(), getTodosForDate() (+33 more)

### Community 2 - "Timeline Rendering & Time Math"
Cohesion: 0.12
Nodes (38): DocumentPointerListeners, Props, SessionBlock(), BlockProps, DocumentPointerListeners, PlacedBlock(), Props, Timeline() (+30 more)

### Community 3 - "Dashboard Shell & Session Modals"
Cohesion: 0.10
Nodes (23): DashboardClient(), Props, GoogleCalendarToggle(), Props, EditTodoScheduleModal(), Props, toLocalInputValue(), ManualSessionModal() (+15 more)

### Community 4 - "TypeScript Compiler Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 5 - "Work Session Lifecycle"
Cohesion: 0.16
Nodes (22): addManualSession(), deleteSession(), editSessionTimes(), getActiveSession(), getAuthedUser(), getInterruptBucketTaskId(), getRecentSessions(), recalculateActualMinutes() (+14 more)

### Community 6 - "Runtime Dependencies & Scripts"
Cohesion: 0.08
Nodes (25): @hello-pangea/dnd, next, dependencies, @hello-pangea/dnd, next, react, react-dom, @supabase/ssr (+17 more)

### Community 7 - "Theme System & Root Layout"
Cohesion: 0.13
Nodes (16): geistMono, geistSans, metadata, getThemeSnapshot(), subscribe(), ThemeContext, ThemeContextValue, ThemeProvider() (+8 more)

### Community 8 - "Dev Tooling & Build Deps"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, eslint-config-prettier, devDependencies, eslint, eslint-config-next, eslint-config-prettier, prettier (+15 more)

### Community 9 - "Google Calendar & Domain Types"
Cohesion: 0.13
Nodes (15): GCalEvent, GCalResponse, CalendarEventBlock(), formatTime(), Props, BACKLOG_SORT_MODES, BACKLOG_STATUSES, BacklogSortMode (+7 more)

### Community 10 - "Home Page Data Loading"
Cohesion: 0.22
Nodes (15): fetchCalendarEvents(), HomePage(), PageProps, DateNav(), Props, parseWorkSession(), parseWorkSessions(), WORK_SESSION_SELECT (+7 more)

### Community 11 - "MVP Database Schema"
Cohesion: 0.33
Nodes (11): profiles_updated_at, projects_updated_at, public.handle_updated_at(), public.profiles, public.projects, public.tasks, public.todos, public.work_sessions (+3 more)

### Community 12 - "Row Level Security Policies"
Cohesion: 0.33
Nodes (5): public.profiles, public.projects, public.tasks, public.todos, public.work_sessions

### Community 14 - "Auth Middleware & Session Refresh"
Cohesion: 0.60
Nodes (3): updateSession(), config, middleware()

### Community 15 - "Vercel Deploy Config"
Cohesion: 0.40
Nodes (4): buildCommand, devCommand, framework, installCommand

## Knowledge Gaps
- **127 isolated node(s):** `idea-refine.sh script`, `supabase`, `GCalEvent`, `GCalResponse`, `geistSans` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Projects & Tasks Server Actions` to `Prepare Tomorrow & Todo Scheduling`, `Timeline Rendering & Time Math`, `Dashboard Shell & Session Modals`, `Work Session Lifecycle`, `Google Calendar & Domain Types`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Projects & Tasks Server Actions` to `Google Calendar & Domain Types`, `Home Page Data Loading`, `Work Session Lifecycle`, `Prepare Tomorrow & Todo Scheduling`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `datetimeFromMinutes()` connect `Timeline Rendering & Time Math` to `Prepare Tomorrow & Todo Scheduling`, `Dashboard Shell & Session Modals`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `idea-refine.sh script`, `supabase`, `GCalEvent` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Projects & Tasks Server Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.08090117767537122 - nodes in this community are weakly interconnected._
- **Should `Prepare Tomorrow & Todo Scheduling` be split into smaller, more focused modules?**
  _Cohesion score 0.08503401360544217 - nodes in this community are weakly interconnected._
- **Should `Timeline Rendering & Time Math` be split into smaller, more focused modules?**
  _Cohesion score 0.12473572938689217 - nodes in this community are weakly interconnected._