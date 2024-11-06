export interface Channel {
	id: string
	created_at: string
	updated_at: string
	name: string
	slug: string
	description?: string
	image?: string
	// custom ones
	tracks_outdated?: boolean
	track_count?: number
	busy: boolean
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
	// custom ones
	busy: boolean
}

export interface AppState {
	id?: number
	playlist_tracks?: string[]
	playlist_index?: number
	is_playing?: boolean
	theme?: string
	volume?: number
	counter?: number
	channels_display?: string
}
