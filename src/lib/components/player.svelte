<script>
	import {pg} from '$lib/db'
	import ChannelAvatar from './channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	/** @type {AppState }*/
	let appState = $state({})

	let title = $state('No playlist')
	let image = $state('')
	let description = $state('')

	/** @type {Track|undefined} */
	let track = $state()

	// A live query that copies the sqlite data into the component state.
	$effect(() => {
		pg.live.query(`select * from app_state where id = 1`, [], async (res) => {
			appState = res.rows[0]
			await whatever()
		})
	})

	async function whatever() {
		console.log(appState)
		const {rows} = await pg.sql`
				select * from tracks
				where id = ${appState.playlist_track}
				order by created_at desc
			`
		if (!rows.length) throw new Error('Could not find tracks')
		track = rows[0]
		const {rows: channels} = await pg.sql` select * from channels where id = ${track.channel_id} `
		title = channels[0].name
		image = channels[0].image
		description = channels[0].description
	}
</script>

<article>

	{#if appState.playlist_tracks}
		<header>
			{#if image}
				<figure>
					<ChannelAvatar id={image} alt={title} />
				</figure>
			{/if}
			<div>
				{#if track}
					<h3>{track.title}</h3>
				{/if}
				<h2>{title}</h2>
				<!--<p>{description}</p>-->
				<p>
					<small>
						<span>{appState.playlist_tracks?.length} tracks</span>
					</small>
				</p>
			</div>
		</header>
		<aside class="scroller">
			<Tracklist ids={appState.playlist_tracks} />
		</aside>
	{/if}
</article>

<style>
	header {
		display: grid;
		grid-template-columns: 3rem auto;
		gap: 0.5rem;
		align-items: center;
		padding: 0.5rem 0.25rem;
	}

	aside.scroller {
		overflow: auto;
		width: 100%;
		display: none;
	}

	:global(footer:has(input:checked) > article) {
		display: flex;
		height: 100%;
		gap: 1rem;

		header {
			width: 240px;
			margin-top: 3rem;
			grid-template-columns: auto;
			place-items: center;
			text-align: center;
			margin-bottom: auto;
		}
		figure {
			margin-bottom: 1rem;
		}
		h2 {
			font-size: var(--font-size-title2);
		}
		.desc {
			display: block;
			max-width: 80ch;
		}
		aside.scroller {
			display: initial;
		}
	}

	h2,
	p,
	figure {
		margin: 0;
	}
	h2 {
		font-size: var(--font-size-medium);
	}
	.desc {
		margin-top: 1rem;
		display: none;
	}
	small {
		font-size: 1rem;
	}
</style>
