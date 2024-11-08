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
		IconPlayFill,
		IconVolume1Fill,
		IconVolume2Fill,
		IconVolumeOffFill
	} from 'obra-icons-svelte'
	import {playTrack} from '$lib/api'

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	let title = $state('No playlist')
	let image = $state('')
	let description = $state('')

	/** @type {string[]} */
	let trackIds = $state([])

	/** @type {Track|undefined} */
	let track = $state()

	let yt = $state()

	pg.live.query(`select * from app_state where id = 1`, [], async (res) => {
		const tid = res.rows[0].playlist_track
		trackIds = res.rows[0].playlist_tracks

		// Stop if track is loaded.
		if (track && track.id === tid) return

		const {rows} = await pg.sql`select * from tracks where id = ${tid} order by created_at desc`
		const t = rows[0]
		if (!t) {
			console.log('app_state updated, but no track?', res.rows)
			return
		}
		track = t

		const {rows: channels} = await pg.sql`select * from channels where id = ${t.channel_id}`
		const c = channels[0]
		title = c.name
		image = c.image
		description = c.description
	})

	let volume = $state(50)
	async function setVolume(event) {
		volume = Number(event.currentTarget.value)
		await pg.sql`update app_state set volume = ${volume}`
	}

	function previous() {
		const idx = trackIds.indexOf(track.id)
		const prev = trackIds[idx - 1]
		if (prev) playTrack(prev)
	}
	function next() {
		const idx = trackIds.indexOf(track.id)
		const next = trackIds[idx + 1]
		if (next) playTrack(next)
	}
</script>

<article>
	<header>
		<figure>
			<ChannelAvatar id={image} alt={title} />
		</figure>
		<div>
			<h2>{title}</h2>
			<h3>{track?.title}</h3>
			<p>{description}</p>
		</div>
	</header>
	<YoutubePlayer url={track?.url} bind:yt />
	<menu>
		<button>
			<IconShuffle />
		</button>
		<button onclick={previous}>
			<IconPreviousFill />
		</button>
		<button class="play" onclick={() => yt.play()}>
			<IconPlayFill />
		</button>
		<button class="pause" onclick={() => yt.pause()}>
			<IconPause />
		</button>
		<button onclick={next}>
			<IconNextFill />
		</button>
		<div class="volume">
			<media-mute-button mediacontroller="r5"></media-mute-button>
			<media-volume-range mediacontroller="r5"></media-volume-range>
		</div>
	</menu>

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

	<aside class="scroller">
		<Tracklist ids={trackIds} currentId={track?.id} />
	</aside>
</article>

<style>
	header {
		display: grid;
		line-height: 1.2;
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
	h2,
	h3 {
		font-size: var(--font-size-title2);
		font-weight: 400;
	}
	h2 {
		color: var(--color-text-tertiary);
	}
	h3 {
		color: var(--color-text-secondary);
	}

	/* Fixed bottom */
	:global(footer:not(:has(input:checked)) > article) {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		justify-items: center;

		header {
			grid-template-columns: 3rem auto;
			gap: 1rem;
			align-items: center;
			padding-left: 0.25rem;

			div {
				display: flex;
				flex-flow: row wrap;
				gap: 0.25rem;
			}
		}
		menu {
			gap: 0rem;
		}
		header p:last-of-type,
		aside {
			display: none;
		}
		h2,
		h3 {
			font-size: 1rem;
		}
	}

	/* Full overlay */
	:global(footer:has(input:checked) > article) {
		height: 100%;

		@media (min-width: 500px) {
			display: grid;
			grid-template-columns: minmax(320px, 30vw) 1fr;
		}

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
			grid-column: 1;
			/* margin-bottom: auto; */
		}
		.volume {
			/* margin: auto 0 auto; */
		}
		aside {
			grid-column: 2;
			grid-row: 1/3;
			display: initial;
			margin-top: 1rem;
			overflow: auto;
			:global(li) {
				padding-left: 0.5rem;
				padding-right: 0.25rem;
			}
		}
	}

	.volume {
		display: flex;
		flex-flow: row nowrap;
	}
</style>
