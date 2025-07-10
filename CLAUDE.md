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
/src/lib/services/       -- business logic
/src/lib/migrations/     -- sql migration files
/src/routes/             -- thin ui controllers
```

## Tech Stack

SvelteKit + Svelte 5 runes, PGlite (client-side postgres), @radio4000/sdk, jsdoc and sometimes typescript
