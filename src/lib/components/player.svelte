<script>
	import {pg} from '$lib/db'
	import ChannelAvatar from './channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
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
	<menu>
		<button>
			<IconShuffle />
		</button>
		<button>
			<IconPreviousFill />
		</button>
		<button>
			<IconPlayFill />
		</button>
		<button>
			<IconPause />
		</button>
		<button>
			<IconNextFill />
		</button>
	</menu>
	<label class="volume">
		{#if volume < 1}
			<IconVolumeOffFill />
		{:else if volume < 50}
			<IconVolume1Fill />
		{:else}
			<IconVolume2Fill />
		{/if}
		<input type="range" min="0" max="100" name="volume" onchange={setVolume} />
	</label>
	<aside class="scroller">
		<Tracklist ids={trackIds} />
	</aside>
</article>

<style>
	header {
		display: grid;
		line-height: 1.2;
	}
	menu {
		display: flex;
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
			padding: 0.25rem 0.25rem;

			div {
				display: flex;
				gap: 0.5rem;
			}
		}
		menu {
			gap: 0rem;
		}
		header p:last-of-type,
		aside {
			display: none;
		}
	}

	/* Full overlay */
	:global(footer:has(input:checked) > article) {
		height: 100%;

		@media (min-width: 500px) {
			display: grid;
			grid-template-columns: minmax(240px, 30vw) 1fr;
		}

		header {
			padding-top: 3rem;
			margin: auto 1rem;
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
			margin-bottom: auto;
		}
		.volume {
			margin: auto 0 1rem;
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
		place-items: center;
		place-content: center;
	}
</style>
