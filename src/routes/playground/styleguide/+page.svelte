<script>
	const baseColors = [
		'--color-lavender',
		'--color-light-gray',
		'--color-light-blue',
		'--color-slate',
		'--color-green',
		'--color-red',
		'--color-orange',
		'--color-tan'
	]

	const grayScale = [
		'--gray-1',
		'--gray-2',
		'--gray-3',
		'--gray-4',
		'--gray-5',
		'--gray-6',
		'--gray-7',
		'--gray-8',
		'--gray-9',
		'--gray-10',
		'--gray-11',
		'--gray-12'
	]

	const accentColors = ['--color-accent']

	const fontSizes = [
		'--font-size-micro',
		'--font-size-mini',
		'--font-size-small',
		'--font-size-regular',
		'--font-size-large',
		'--font-size-title3',
		'--font-size-title2',
		'--font-size-title1'
	]
</script>

<div class="styleguide">
	<h1>Styleguide</h1>

	<section>
		<h2>Base Colors</h2>
		<div class="color-grid">
			{#each baseColors as colorVar (colorVar)}
				<div class="color-item">
					<div class="color-swatch" style="background-color: var({colorVar})"></div>
					<div class="color-info">
						<code>{colorVar}</code>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Gray Scale (1-12)</h2>
		<div class="gray-scale">
			{#each grayScale as grayVar (grayVar)}
				<div class="gray-item">
					<div class="gray-swatch" style="background-color: var({grayVar})"></div>
					<div class="gray-info">
						<code>{grayVar}</code>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Accent Color</h2>
		<div class="color-grid">
			{#each accentColors as colorVar (colorVar)}
				<div class="color-item">
					<div class="color-swatch" style="background-color: var({colorVar})"></div>
					<div class="color-info">
						<code>{colorVar}</code>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Font Sizes</h2>
		<div class="variable-grid">
			{#each fontSizes as sizeVar (sizeVar)}
				<div class="variable-item">
					<div class="variable-demo" style="font-size: var({sizeVar})">Sample text</div>
					<div class="variable-info">
						<code>{sizeVar}</code>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.styleguide {
		padding: 1rem;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.variable-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	h2 {
		margin-top: 3rem;
		margin-bottom: 0.5rem;
	}
	.color-item {
		border: 1px solid var(--gray-4);
		border-radius: var(--border-radius);
		overflow: hidden;
		background: var(--gray-2);
	}

	.color-swatch {
		height: 80px;
		width: 100%;
	}

	.color-info {
		padding: 0.75rem;
	}

	.color-info code {
		font-size: 12px;
	}

	.gray-scale {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.gray-item {
		flex: 1;
		min-width: 80px;
		border: 1px solid var(--gray-4);
		border-radius: var(--border-radius);
		overflow: hidden;
		background: var(--gray-2);
	}

	.gray-swatch {
		height: 60px;
		width: 100%;
	}

	.gray-info {
		padding: 0.5rem;
		text-align: center;
	}

	.gray-info code {
		font-size: 10px;
	}

	.variable-item {
		border: 1px solid var(--gray-4);
		border-radius: var(--border-radius);
		overflow: hidden;
		background: var(--gray-2);
	}

	.variable-demo {
		padding: 1rem;
		background: var(--gray-1);
		border-bottom: 1px solid var(--gray-4);
	}

	.variable-info {
		padding: 0.75rem;
	}

	.variable-info code {
		font-size: 12px;
	}
</style>
