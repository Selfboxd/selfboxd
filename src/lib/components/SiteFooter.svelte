<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<footer>
	<p>{m.footer_not_affiliated()}</p>
</footer>

<style>
	footer {
		margin-top: var(--space-12);
		padding: var(--space-8) var(--space-4);
		background: var(--color-panel);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	p {
		max-width: var(--content-width);
		margin: 0 auto;
	}
</style>
