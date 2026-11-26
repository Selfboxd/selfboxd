<script lang="ts" module>
	/** Shapes of the Feather icon set, each written as a single path. */
	const paths = {
		eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
		heart:
			'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
		clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2',
		rewatch: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
		review: 'M17 10H3M21 6H3M21 14H3M17 18H3',
		pencil: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
		close: 'M18 6L6 18M6 6l12 12',
		bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
		search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.35-4.35',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
		more: 'M4 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM12 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM20 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z',
		grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
		chevron: 'M6 9l6 6 6-6',
		grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
		list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
		copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
		check: 'M20 6L9 17l-5-5',
		external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
		trash:
			'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
		link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
		rss: 'M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M5 19h.01',
		star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
	};

	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	interface Props {
		/** Which pictogram to draw. */
		name: IconName;
		/** Whether the shape is filled instead of outlined. */
		filled?: boolean;
		/** Accessible name; a decorative icon has none. */
		label?: string;
	}

	let { name, filled = false, label }: Props = $props();
</script>

<svg
	class="icon"
	class:filled
	viewBox="0 0 24 24"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : true}
>
	<path d={paths[name]} />
</svg>

<style>
	.icon {
		display: inline-block;
		flex-shrink: 0;
		width: 1em;
		height: 1em;
		fill: none;
		stroke: currentcolor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
		vertical-align: -0.125em;
	}

	.filled {
		fill: currentcolor;
		fill-rule: evenodd;
	}
</style>
