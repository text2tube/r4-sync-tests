<script>
	import {pg} from '$lib/db'

	const {channelId} = $props()

	/** @type {import('$lib/types').Track[]}*/
	let tracks = $state([])

	$effect(() => {
		if (!channelId) return
		pg.live.incrementalQuery(
			`
		SELECT *
		FROM tracks
		where channel_id = $1
		ORDER BY created_at desc
	`,
			[channelId],
			'id',
			(res) => {
				console.log('Tracks query update', res)
				tracks = res.rows
			}
		)
	})
</script>

<ul class="list">
	{#each tracks as item, index}
		<li>
			<span>{index + 1}.</span>
			<h3>{item.title}</h3>
			<p><small>{item.description}</small></p>
		</li>
	{/each}
</ul>

<style>
	li {
		display: grid;
		grid-template-columns: 2rem auto;
		padding: 0.5rem 0 0.3rem 0.5rem;
		line-height: 1.2;
	}
	li > span:first-child {
		grid-row: span 2;
	}
	h3 {
		font-size: var(--font-size-regular);
		font-weight: initial;
		margin: 0;
	}
	p {
		margin: 0;
		grid-column: 2;
	}
</style>
