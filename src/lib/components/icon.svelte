<script>
	import * as icons from 'obra-icons-svelte'

	/** @type {{icon: string, title?: string, className?: string, size?: number, children?: any}} */
	const {children, icon = '', title = '', className = '', size, ...rest} = $props()

	function toImportName(str, prefix = 'Icon') {
		const parts = str.split('-')
		for (let i = 0; i < parts.length; i++) {
			parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1)
		}
		parts.unshift(prefix)
		return parts.join('')
	}

	const iconName = $derived(toImportName(icon))
	const Icon = $derived(icons[iconName])
</script>

<i class={`icon ${className}`} class:icon {title}>
	{#if Icon}
		<Icon {size} {...rest} />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</i>

<style>
	.icon {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
</style>
