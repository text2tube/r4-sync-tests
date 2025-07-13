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
	firebase_id?: string
	// for broadcasting
	broadcasting?: boolean
	broadcast_track_id?: string
	broadcast_started_at?: string
	tracks_synced_at?: string
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
	// sometimes we join and add this to the track
	channel_slug?: string
}

export interface AppState {
	id?: number
	playlist_tracks?: string[]
	playlist_track?: string
	is_playing?: boolean
	theme?: string
	volume?: number
	counter?: number
	channels_display?: string
	// the user's channels
	channels?: string[]
	shuffle?: boolean
	broadcasting_channel_id?: string
	listening_to_channel_id?: string
	queue_panel_visible?: boolean
	key_bindings?: Record<string, string>
}

export type KeyBindingsConfig = Record<string, string>

export interface Broadcast {
	channel_id: string
	track_id: string
	track_played_at: string
}

export interface BroadcastWithChannel extends Broadcast {
	channels: {
		id: string
		name: string
		slug: string
		image?: string
		description?: string
	}
}

export interface Ok<T> {
	ok: true
	value: T
}

export interface Error<E> {
	ok: false
	error: E
}

export function ok<T>(value: T): Ok<T> {
	return {
		ok: true,
		value
	}
}

export function err<T>(error: T): Error<T> {
	return {
		ok: false,
		error
	}
}
