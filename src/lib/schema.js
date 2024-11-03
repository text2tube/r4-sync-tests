// import * as p from 'drizzle-orm/pg-core'

/* export const channels = p.pgTable('channels', {
	id: p.text('id').primaryKey(),
	name: p.text('name').notNull(),
	slug: p.text('slug').notNull().unique(),
	description: p.text('description'),
	image: p.text('image'),
	created_at: p.timestamp('created_at', {withTimezone: true}).defaultNow(),
	source: p.text('source')
})

export const tracks = p.pgTable('tracks', {
	id: p.text('id').primaryKey(),
	channel_id: p.text('channel_id').references(() => channels.id),
	title: p.text('title').notNull(),
	url: p.text('url').notNull(),
	description: p.text('description'),
	discogs_url: p.text('discogs_url'),
	created_at: p.timestamp('created_at', {withTimezone: true}).defaultNow()
	// tags: jsonb('tags')
})

export const app_state = p.pgTable('app_state', {
	id: p.integer('id').primaryKey(),
	playlist_slug: p.text('current_channel_slug').references(() => channels.slug),
	playlist_tracks: p.jsonb('playlist_tracks'),
	is_playing: p.boolean('is_playing').default(false),
	volume: p.integer('volume').default(70),
	theme: p.text('theme').default('light')
})
 */
