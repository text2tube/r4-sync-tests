# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It's called claude.md so it picks up automatically without mentioning it, but really it's sound guidance
for anyone working on this project.

# R5 - Local-First Music Player

## State changes

Database is state. All app state lives in the `app_state` table. Minimal component state, no stores.

- Ideally through `app_state` table updates
- Avoid component-level state for app data
- Live queries propagate changes to UI automatically
- Avoid server-side code, prefer client side for loading data as well

## Debugging

- `window.r5.pg` - direct database access
- `window.r5.sdk` - radio4000 api client
- inspect `app_state` table in devtools for current state

### Adding Features

1. **Migration first** - `/src/lib/migrations/` then add to `db.ts` array
2. **UI second** - thin routes, live queries for reactivity

### Player Operations

- Modify `playlist_tracks` array for queue changes
- Set `playlist_track` for current track
- Let live queries handle UI updates

## Database tables

See src/lib/migrations/\*.sql for everything.

```sql
app_state    -- single row, all application state
channels     -- radio stations (id, name, slug, description, image)
tracks       -- music tracks (channel_id, url, title)
```

### Migrations

- Create migrations in `/src/lib/migrations/` as SQL files
- Add to `/src/lib/db.ts` migrations array

### Patterns

```js
// reactive ui
pg.live.query('SELECT * FROM app_state', [], (result) => {
	state = result.rows[0]
})

// state mutation
pg.sql`UPDATE app_state SET playlist_tracks = ${trackIds} WHERE id = 1`
```

## Real-time Features

### Supabase Real-time Patterns

For real-time functionality (like broadcasting), use Supabase channels (not to be confused with our own `channels` table) and presence:

**Pattern: Local-first, remote-sync**

1. **Update local state immediately** for responsive UI
2. **Sync to remote** in background
3. **Handle failures gracefully**

```js
// Update local state first for immediate UI response
await pg.sql`UPDATE app_state SET some_field = ${value} WHERE id = 1`

// Then sync to remote (can fail without breaking UI)
try {
	const {error} = await sdk.supabase.from('table').upsert({data})
	if (error) console.error('Sync failed:', error)
} catch (error) {
	// Handle gracefully, local state already updated
}
```

### Service Organization

**Services in `/src/lib/services/`** for complex features:

- Handle real-time subscriptions and cleanup
- Manage external state (like Supabase channels)
- Export focused, single-purpose functions

**Reusable functions in `/src/lib/api.js`**:

- General data operations (sync, play, etc.)
- Functions used across multiple services
- Bridge between local database and remote API

## Component Guidelines

### Svelte 5 Runes

```js
let items = $state([])
let filtered = $derived(items.filter((item) => !item.hidden))
$effect(() => {
	// side effects when dependencies change
})
```

### HTML/CSS

- Semantic HTML over divs
- Use existing global styles over new classes
- CSS custom properties for theming
- Only create CSS classes when really needed
- Use semantic elements like header menu instead. it's obvious. and call the button label "Add to queue"

## Code Style

- Direct property access: Avoid getters/setters when direct property access works
- Minimal abstraction: Keep code paths direct and clear without unnecessary layers
- Focus on next actions, not recaps
- Self-documenting code: Use clear naming that makes comments unnecessary
- Zero non-essential comments: Do not comment on what the code does - only explain WHY when not obvious
- Exports: Prefer named exports over default exports
- Types: Prefer jsdoc, don't obsess over typescript
- Pass primitives directly, avoid wrapper objects around simple data
- Use literal objects directly, avoid helper functions for basic object creation
- Meaningful methods: Methods should do something meaningful beyond simple delegation

## File Organization

```
/src/lib/db.ts           -- schema + migrations
/src/lib/api.js          -- reusable data operations
/src/lib/services/       -- complex features with real-time/external state
/src/lib/sync.js         -- local/remote data synchronization
/src/lib/migrations/     -- sql migration files
/src/routes/             -- thin ui controllers
```

## Tech Stack

SvelteKit + Svelte 5 runes, PGlite (client-side postgres), @radio4000/sdk, jsdoc and sometimes typescript