<script lang="ts">
	import { tmdbImage } from '#lib/images.js';

	interface Props {
		/** Path of the TMDB backdrop shown behind the header and the top of the page. */
		path: string;
		/** Whether the banner is the shorter one of list pages. */
		short?: boolean;
	}

	let { path, short = false }: Props = $props();
</script>

<div class="backdrop" class:short>
	<img src={tmdbImage(path, 'w1280')} alt="" />
</div>

<style>
	.backdrop {
		position: absolute;
		z-index: -1;
		top: calc(-1 * var(--header-height));
		left: 50%;
		overflow: hidden;
		width: min(100%, var(--backdrop-width));
		height: var(--backdrop-height);
		transform: translateX(-50%);
	}

	.short {
		height: var(--backdrop-short-height);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
	}

	.backdrop::after {
		position: absolute;
		background:
			var(--texture-grain),
			linear-gradient(
				to right,
				var(--color-background),
				var(--color-background-clear) 22%,
				var(--color-background-clear) 78%,
				var(--color-background)
			),
			linear-gradient(
				to bottom,
				var(--color-background-clear) 45%,
				var(--color-background-veil) 75%,
				var(--color-background)
			);
		content: '';
		inset: 0;
	}
</style>
