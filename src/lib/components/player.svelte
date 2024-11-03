<script>
	import {pg} from '$lib/db'
	import ChannelAvatar from './channel-avatar.svelte'

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
		const slug = appState?.playlist_slug || ''
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
	{/if}
</article>

<style>
	article {
		display: grid;
		grid-template-columns: 3rem auto;
		gap: 0.5rem;
		padding: 0.25rem;
		align-items: center;
	}

	h2 {
		font-size: var(--font-size-medium);
	}

	:global(footer:has(input:checked) > article) {
		padding: 3rem 0.5rem 0;
		background: var(--color-background-secondary);
		display: flex;
		flex-flow: column nowrap;
		place-content: center;
		height: 100%;
		gap: 0;
		figure {
			margin-bottom: 1rem;
		}
		h2 {
			font-size: var(--font-size-title2);
		}
		.desc {
			display: block;
		}
	}
	h2,
	p,
	figure {
		margin: 0;
	}
	figure :global(img) {
		border-radius: var(--border-radius);
	}
	.desc {
		margin-top: 1rem;
		display: none;
	}
	small {
		font-size: 1rem;
		color: var(--color-text-tertiary);
	}
</style>
