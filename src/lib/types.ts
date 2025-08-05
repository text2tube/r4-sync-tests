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

	latitude?: number
	longitude?: number

	// Link to v1 channel  (locally only channels that did not migrate to v2 will have this field)
	firebase_id?: string

	// for broadcasting
	broadcasting?: boolean
	broadcast_track_id?: string
	broadcast_started_at?: string
	tracks_synced_at?: string

	// local only
	spam?: boolean
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
	// fields below this line do not exist on remote r4 track
	busy?: boolean
	// sometimes we include this, too
	channel_slug?: string
	// when joined with track_meta table
	duration: number
	youtube_data?: object
	musicbrainz_data?: object
}

export interface AppState {
	id: number
	playlist_tracks: string[]
	playlist_tracks_shuffled: string[]
	playlist_track?: string
	is_playing: boolean
	theme: string
	volume: number
	custom_css_variables: Record<string, string>
	counter: number
	channels_display: string
	/** the user's channels */
	channels: string[]
	shuffle: boolean
	broadcasting_channel_id?: string
	listening_to_channel_id?: string
	queue_panel_visible: boolean
	show_video_player: boolean
	player_expanded?: boolean
	shortcuts: Record<string, string>
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

export const PlayReasonStart = {
	USER_CLICK: 'user_click',
	USER_NEXT: 'user_next',
	USER_PREVIOUS: 'user_previous',
	AUTO_NEXT: 'auto_next',
	SHUFFLE_NEXT: 'shuffle_next',
	BROADCAST_SYNC: 'broadcast_sync',
	PLAYLIST_LOAD: 'playlist_load'
} as const

export const PlayReasonEnd = {
	TRACK_COMPLETED: 'track_completed',
	USER_NEXT: 'user_next',
	USER_PREVIOUS: 'user_previous',
	USER_STOP: 'user_stop',
	PLAYLIST_CHANGE: 'playlist_change',
	YOUTUBE_ERROR: 'youtube_error',
	BROADCAST_SYNC: 'broadcast_sync'
} as const

export interface PlayHistory {
	id: string
	track_id: string
	started_at: string
	ended_at?: string
	ms_played: number
	reason_start?: string
	reason_end?: string
	shuffle: boolean
	skipped: boolean
}
