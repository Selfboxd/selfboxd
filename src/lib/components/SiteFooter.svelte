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
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.inner {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
		border-top: 1px solid var(--color-border-subtle);
	}

	img {
		height: var(--font-size-body);
		opacity: 0.7;
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
