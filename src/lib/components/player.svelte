<script>
	import {pg} from '$lib/db'
	import ChannelAvatar from './channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import YoutubePlayer from '$lib/components/youtube-player.svelte'
	import {
		IconShuffle,
		IconPreviousFill,
		IconNextFill,
		IconPause,
		IconPlayFill
		// IconVolume1Fill,
		// IconVolume2Fill,
		// IconVolumeOffFill
	} from 'obra-icons-svelte'
	import {playTrack} from '$lib/api'

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	let autoplay = $state(false)

	let title = $state('')
	let image = $state('')
	let description = $state('')

	/** @type {AppState} */
	let appState = $state({})

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {Track|undefined} */
	let track = $state()
	/*
	let track = $derived.by(async () => {
		const id = appState.playlist_track
		const x = await first(pg.sql`select * from tracks where id = ${id}`)
		console.log(id, x)
		return x
	})
	*/

	let yt = $state()

	/** @type {boolean} */
	let isListeningToBroadcast = $derived(!!appState.listening_to_channel_id)

	pg.live.query(`select * from app_state where id = 1`, [], async (res) => {
		appState = res.rows[0]
		const tid = appState.playlist_track
		setChannelFromTrack(tid)
		if (tid) autoplay = true
	})

	/**
	 * Awaits a query and returns the first row or undefined
	 * @template T
	 * @param {Promise<{rows: T[]}>} query
	 * @returns {Promise<T|undefined>}
	 */
	async function first(query) {
		try {
			const x = await query
			if (x.rows) return x.rows[0]
			return undefined
		} catch (err) {
			console.log('here', err)
		}
	}

	/** @param {string} tid} */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		const t = await first(pg.sql`select * from tracks where id = ${tid} order by created_at desc`)
		const c = await first(pg.sql`select * from channels where id = ${t.channel_id}`)
		if (t && c) {
			track = t
			title = c.name
			image = c.image
			description = c.description
		}
	}

	function toggleShuffle() {
		pg.sql`update app_state set shuffle = ${!appState.shuffle} where id = 1`.then(() => {
			pg.sql`select shuffle from app_state where id = 1`.then(({rows}) => {
				console.log(rows[0])
			})
		})
	}

	function previous() {
		if (!track?.id) return
		const idx = trackIds.indexOf(track.id)
		const prev = trackIds[idx - 1]
		if (prev) playTrack(prev)
	}

	function next() {
		if (!track?.id) return
		const idx = trackIds.indexOf(track.id)
		const next = trackIds[idx + 1]
		if (next) playTrack(next)
	}

	function play() {
		if (!track) {
			console.log('Play called without track')
			return
		}
		yt.play()
		autoplay = true
	}

	function handleError(event) {
		const code = event.target.error.code
		if (code === 150) {
			console.log('YouTube player error 150 -> next()')
			next()
		} else {
			console.warn('Unhandled player error', code)
		}
		//autoplay = true
	}

	function handleEndTrack() {
		console.log('Player ended')
		next()
	}
</script>

<article>
	<header>
		<figure>
			<ChannelAvatar id={image} alt={title} />
		</figure>
		<div>
			<h2>
				{title}
				{#if isListeningToBroadcast}
					<span class="broadcast-indicator">🔴 LIVE</span>
				{/if}
			</h2>
			<h3>{track?.title}</h3>
			<p>{description}</p>
		</div>
	</header>

	<menu>
		<button onclick={toggleShuffle} aria-pressed={appState.shuffle} title="Toggle shuffle">
			<IconShuffle />
		</button>
		<button onclick={previous} title="Go previous track">
			<IconPreviousFill />
		</button>
		<button class="play" onclick={play}>
			<IconPlayFill />
		</button>
		<button class="pause" onclick={() => yt.pause()}>
			<IconPause />
		</button>
		<button onclick={next} title="Go next track">
			<IconNextFill />
		</button>
		<!--
		<div class="volume">
			<media-mute-button mediacontroller="r5"></media-mute-button>
			<media-volume-range mediacontroller="r5"></media-volume-range>
		</div>
	-->
	</menu>

	<YoutubePlayer
		url={track?.url}
		bind:yt
		{autoplay}
		onerror={handleError}
		onended={handleEndTrack}
	/>

	<!-- <label class="volume">
		{#if volume < 1}
			<IconVolumeOffFill />
		{:else if volume < 50}
			<IconVolume1Fill />
		{:else}
			<IconVolume2Fill />
		{/if}
		<input type="range" min="0" max="100" name="volume" onchange={setVolume} />
	</label>
 -->
</article>

<style>
	header {
		display: grid;
	}
	menu {
		display: flex;
		margin: auto;
		padding: 0;
		place-content: center;
	}
	h2,
	h3,
	p,
	figure {
		margin: 0;
	}
	h2 {
		font-weight: 400;
	}
	h3 {
		font-weight: 400;
	}

	/* Fixed bottom */

	:global(footer:not(:has(input:checked))) {
		padding-right: 0.5rem;
	}
	:global(footer:not(:has(input:checked)) > article) {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		/* justify-items: center; */

		header {
			grid-template-columns: 3rem auto;
			gap: 0.5rem;
			align-items: center;

			div {
				display: flex;
				flex-flow: row wrap;
				gap: 0.25rem;
				line-height: 1;
			}
		}
		menu {
			gap: 0rem;
		}
		header p:last-of-type {
			display: none;
		}
		h2,
		h3 {
			font-size: var(--font-size-regular);
		}
	}

	/* Full overlay */
	:global(footer:has(input:checked) > article) {
		height: 100%;
		header {
			margin: 3rem auto auto;
			grid-template-columns: auto;
			place-items: center;
			text-align: center;
		}
		figure {
			margin-bottom: 2vh;
		}
		header p:last-of-type {
			margin-top: 1rem;
			max-width: 80ch;
		}
		menu {
			padding: 0;
			margin-top: 1rem;
		}
		:global(youtube-video) {
			min-height: 300px;
		}
	}

	[aria-pressed='false'] :global(svg) {
		opacity: 0.2;
	}
	.broadcast-indicator {
		color: red;
		font-size: 0.8rem;
		font-weight: bold;
		margin-left: 0.5rem;
	}
</style>
