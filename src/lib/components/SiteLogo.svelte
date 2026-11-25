<script lang="ts">
	import logo from '#lib/assets/logo.svg';
</script>

<span class="logo">
	<img src={logo} alt="" />
	<span>Selfboxd</span>
</span>

<style>
	.logo {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-heading);
		font-size: var(--font-size-wordmark);
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.03em;
	}

	.logo img {
		width: 1.6em;
		height: 1.6em;
	}
</style>
