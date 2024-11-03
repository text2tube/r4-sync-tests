export interface Channel {
	id: string
	created_at: string
	updated_at: string
	name: string
	slug: string
	description?: string
	image?: string
}

export type Track = {
	id: string
	created_at: string
	updated_at: string
	channel_id: string
	url: string
	title: string
	description?: string
	discogs_url?: string
}

export interface AppState {
	id?: number
	playlist_slug?: string
	is_playing?: boolean
	theme?: string
}
