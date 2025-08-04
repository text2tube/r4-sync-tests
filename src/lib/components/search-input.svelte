<script>
	import Icon from '$lib/components/icon.svelte'

	let {value = $bindable(''), placeholder = 'Search...', ...restProps} = $props()
</script>

<div class="search-input">
	<Icon icon="search" size={16} />
	<input type="search" {placeholder} bind:value {...restProps} />
</div>

<style>
	.search-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input > :global(.icon) {
		position: absolute;
		left: 0.5rem;
		z-index: 1;
		opacity: 0.5;
	}

	input[type='search'] {
		padding-left: 2rem;
		padding-right: 0.5rem;
		min-width: 180px;
		font-size: var(--font-size-small);
		border: 1px solid var(--gray-6);
		border-radius: var(--border-radius);
		background: var(--gray-1);
	}

	input[type='search']:focus {
		outline: 2px solid var(--blue-7);
		outline-offset: -1px;
	}
</style>
