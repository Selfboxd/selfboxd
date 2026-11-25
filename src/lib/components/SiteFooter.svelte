<script lang="ts">
	import tmdbLogo from '#lib/assets/tmdb.svg';
	import { m } from '#lib/paraglide/messages.js';
</script>

<footer>
	<div class="inner">
		<img src={tmdbLogo} alt="TMDB" />
		<p>{m.footer_tmdb()}</p>
		<p class="affiliation">{m.footer_not_affiliated()}</p>
	</div>
</footer>

<style>
	footer {
		margin-top: var(--space-12);
		background: var(--color-panel);
		color: var(--color-text);
		font-size: var(--font-size-small);
	}

	.inner {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
	}

	img {
		height: var(--font-size-body);
	}

	.affiliation {
		margin-inline-start: auto;
		white-space: nowrap;
	}

	@media (max-width: 48rem) {
		.inner {
			flex-direction: column;
			align-items: flex-start;
		}

		.affiliation {
			margin-inline-start: 0;
			white-space: normal;
		}
	}
</style>
