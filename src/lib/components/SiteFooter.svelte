<script lang="ts">
	import tmdbLogo from '#lib/assets/tmdb.svg';
	import { m } from '#lib/paraglide/messages.js';
</script>

<footer>
	<p class="tmdb">
		<img src={tmdbLogo} alt="TMDB" />
		<span>{m.footer_tmdb()}</span>
	</p>
	<p>{m.footer_not_affiliated()}</p>
</footer>

<style>
	footer {
		margin-top: var(--space-12);
		padding: var(--space-8) 0;
		background: var(--color-panel);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	p {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 0 var(--space-4);
	}

	.tmdb {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.tmdb img {
		height: var(--font-size-large);
	}
</style>
