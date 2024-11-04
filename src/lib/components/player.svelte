<script>
	import {pg} from '$lib/db'
	import ChannelAvatar from './channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'

	/** @typedef {import('$lib/types').Channel} Channel */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').AppState} AppState */

	/** @type {AppState }*/
	let appState = $state({
		playlist_slug: ''
	})

	/** @type {Channel|undefined} */
	let channel = $state()

	/** @type {Track[]}*/
	let tracks = $state([])

	// A test
	// pg.live.changes('SELECT * FROM app_state where id = 1;', null, 'id', (changes) => {
	// 	console.log('changes', changes)
	// 	appState.playlist_slug = changes[0].playlist_slug
	// })

	// A live query that copies the sqlite data into the component state.
	$effect(() => {
		pg.live.query(`select * from app_state where id = 1`, [], (res) => {
			console.debug('app_state updated')
			appState = res.rows[0]
		})
	})

	// When slug changes, query the channel and tracks.
	$effect(() => {
		const slug = appState?.playlist_slug
		const isDiff = channel?.slug !== slug
		if (!isDiff) return
		console.log('here yo slug', slug, isDiff)
		pg.query(`select * from channels where slug = $1`, [slug]).then((res) => {
			channel = res.rows[0]
			if (channel?.id) {
				pg.query(`select * from tracks where channel_id = $1`, [channel.id]).then((res) => {
					tracks = res.rows
				})
			}
		})
	})
</script>

<article>
	{#if appState?.playlist_slug}
		<header>
			<figure>
				<ChannelAvatar id={channel?.image} alt={channel?.name} />
			</figure>
			<div>
				<h2>{channel?.name}</h2>
				<p>
					<small>
						@{appState.playlist_slug}
						{#if tracks?.length}<span>{tracks.length} tracks</span>{/if}
					</small>
				</p>
				{#if channel?.description}
					<p class="desc">{channel.description}</p>
				{/if}
			</div>
		</header>
		<aside class="scroller">
			<Tracklist channelId={channel?.id} />
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

		header {
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
