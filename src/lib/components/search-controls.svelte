<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	import {IconSearch, IconSort, IconFunnelAscending, IconFunnelDescending} from 'obra-icons-svelte'

	let {search = '', order = 'created', dir = 'desc', onSearchChange, onOrderChange} = $props()

	let searchValue = $state(search)
	let sortField = $state(order)
	let sortDirection = $state(dir)

	// Update internal state when props change
	$effect(() => {
		searchValue = search
		sortField = order
		sortDirection = dir
	})

	function handleSubmit(event) {
		event.preventDefault()
		performSearch()
	}

	function handleSearchBlur() {
		performSearch()
	}

	function handleSortFieldChange(event) {
		sortField = event.target.value
		onOrderChange(sortField, sortDirection)
		updateURL()
	}

	function toggleSortDirection() {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
		onOrderChange(sortField, sortDirection)
		updateURL()
	}

	function performSearch() {
		onSearchChange(searchValue)
		updateURL()
	}

	function updateURL() {
		const params = new URLSearchParams()
		if (searchValue) params.set('search', searchValue)
		if (sortField !== 'created') params.set('order', sortField)
		if (sortDirection !== 'desc') params.set('dir', sortDirection)

		const queryString = params.toString()
		const newUrl = `${$page.url.pathname}${queryString ? `?${queryString}` : ''}`
		goto(newUrl, {replaceState: true})
	}

	function clearSearch() {
		searchValue = ''
		performSearch()
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

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
