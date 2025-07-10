<script>
	import {pg} from '$lib/db'
	import {playTrack} from '$lib/api'
	//import {formatDate} from '$lib/dates'

	const {ids, currentId} = $props()

	/** @type {import('$lib/types').Track[]}*/
	let tracks = $state([])

	$effect(() => {
		// Turn the list of ids into real tracks.
		pg.live.incrementalQuery(
			`
		SELECT * FROM tracks
		WHERE id IN (select unnest($1::uuid[]))
		ORDER BY created_at desc
	`,
			[ids],
			'id',
			(res) => {
				tracks = res.rows
			}
		)
	})
</script>

<ul class="list">
	{#each tracks as item, index (item.id)}
		<li class={item.id === currentId ? 'current' : ''} ondblclick={() => playTrack(item.id)}>
			<span>{index + 1}.</span>
			<div class="title">
				{item.title}
			</div>
			<div class="description">
				<small>{item.description}</small>
			</div>
			<!--<p>{formatDate(item.created_at)}</p>-->
		</li>
	{/each}
</ul>

<style>
	li {
		display: grid;
		grid-template-columns: 3rem auto;
		padding: 0.5rem 0 0.3rem 0;
		line-height: 1.2;
	}
	li > span:first-child {
		grid-row: span 2;
		color: var(--gray-6);
		font-size: var(--font-size-regular);
		text-indent: 0.2em;
	}

	.title {
		font-size: var(--font-size-regular);
	}

	li.current .title {
		color: var(--color-accent);
	}
</style>
