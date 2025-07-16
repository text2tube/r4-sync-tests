# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It's called claude.md so it picks up automatically without mentioning it, but really it's sound guidance
for anyone working on this project.

# R5 - Local-First Music Player

A local-first music player for radio4000.

SvelteKit + Svelte 5 runes, PGlite (client-side postgres), @radio4000/sdk, jsdoc and sometimes typescript

## File Organization

```
/src/lib/db.ts         -- local db, schema
/src/lib/migrations/   -- sql migration files
/src/lib/api.js        -- reusable data operations
/src/lib/sync.js       -- local/remote data synchronization
/docs 				   -- more documentation
```

## Database and state

The app works with two databases:

1 .the local PostgreSQL in the browser, client-side only via `import pg from $lib/db`. 2. the remote PostgreSQL in the Supabase cloud via @radio4000/sdk. You can access supabase directly via `sdk.supabase`.

- Database is state. All app state lives in local `app_state` table. Minimal component state, no stores.
- Avoid component-level state for app data
- Live queries propagate changes to UI automatically
- Avoid server-side code, prefer client side for loading data as well

The local schema can be updated at any time, be generous with migrations:

1. Update existing mgirations or create a new one in `/src/lib/migrations/`
2. Add to list in `db.ts`

```sql
app_state    -- single row with id 1, all application state
channels     -- radio stations (id, name, slug, description, image)
tracks       -- music tracks (id, channel_id, url, title, tags, mentions)
```

## Debugging

- `window.r5.pg` - direct database access
- `window.r5.sdk` - radio4000 api client
- inspect `app_state` table in devtools for current state

### Player Operations

The player.svelte watches app_state for changes.

- Modify `playlist_tracks` array for queue changes
- Set `playlist_track` for current track

### Using pglite

```js
pg.query(query, params, callback) // one-off query
pg.exec(query, params, callback) // good for multiple queries, migrations
pg.live.query(query, params, callback) // reactive ui
```

## API

In `/src/lib/api.js` you can find reusable functions for data operations.

## Svelte 5 syntax

```js
let items = $state([])
let filtered = $derived(items.filter((item) => !item.hidden))
$effect(() => {
	items.push({hidden: false})
})
```

## Domain separation

Library has channels and tracks (like albums + songs)
Player has playlist_tracks (queue) and playlist_track (now playing)

in other words:

Library → Playlist → Player flow
playChannel() → setPlaylist() + playTrack()

## HTML/CSS

- Semantic HTML over divs
- Rely existing global styles over new classes
- Only create CSS classes when really needed
- Use CSS custom property variables from variables.css (colors, font-sizing)
- Use semantic elements like header menu instead

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
- Use domain-specific verbs that match user mental models
- Single responsibility no complex availability checking
- Optimistic execution - trust in methods, let errors throw
- Less defensive

## Debug Tricks

Ask me to perform queries for you, if it helps: `(await window.r5.pg.sql`select \* from app_state where id = 1`).rows[0]`
