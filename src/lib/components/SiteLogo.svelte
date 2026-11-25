<script lang="ts">
	import logo from '#lib/assets/logo.svg';

	interface Props {
		/** Size of the wordmark next to the mark. */
		size?: 'regular' | 'large';
	}

	let { size = 'regular' }: Props = $props();
</script>

<span class="logo" class:large={size === 'large'}>
	<img src={logo} alt="" />
	<span>Selfboxd</span>
</span>

<style>
	.logo {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-heading);
		font-size: var(--font-size-large);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.logo img {
		width: 1.6em;
		height: 1.6em;
	}

	.large {
		font-size: var(--font-size-title);
	}
</style>
