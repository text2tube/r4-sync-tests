<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/state'
	import {IconSearch} from 'obra-icons-svelte'

	let {search = '', order = 'created', dir = 'desc', onSearchChange, onOrderChange} = $props()

	let searchValue = $state(search)

	// Update internal state when props change
	$effect(() => {
		searchValue = search
	})

	function handleSubmit(event) {
		event.preventDefault()
		performSearch()
	}

	function handleSearchBlur() {
		performSearch()
	}

	function performSearch() {
		onSearchChange(searchValue)
		updateURL()
	}

	function updateURL() {
		const params = new URLSearchParams()
		if (searchValue) params.set('search', searchValue)
		if (order !== 'created') params.set('order', order)
		if (dir !== 'desc') params.set('dir', dir)

		const queryString = params.toString()
		const newUrl = `${page.url.pathname}${queryString ? `?${queryString}` : ''}`
		goto(newUrl, {replaceState: true})
	}
</script>

<form onsubmit={handleSubmit}>
	<IconSearch />
	<input
		type="search"
		placeholder="Search tracks..."
		bind:value={searchValue}
		onblur={handleSearchBlur}
	/>
	<!--<button type="button" onclick={clearSearch}>Search</button>-->

	<!--<label>
		<IconSort />
		<select bind:value={sortField}>
			<option value="created">Created</option>
			<option value="updated">Updated</option>
			<option value="title">Title</option>
		</select>
	</label>
	<button type="button" onclick={toggleSortDirection}>
		{#if sortDirection === 'asc'}
			<IconFunnelAscending />
		{:else}
			<IconFunnelDescending />
		{/if}
	</button>-->
</form>

<style>
	form {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	input[type='search'] {
		margin-left: -0.5rem;
		flex: 1;
	}
</style>
