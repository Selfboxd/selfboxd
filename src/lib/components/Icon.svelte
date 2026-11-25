<script lang="ts" module>
	const paths = {
		eye: 'M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
		heart:
			'M12 20.500l-7.400-7.200a4.700 4.700 0 0 1 6.600-6.700l.800.800.800-.800a4.700 4.700 0 0 1 6.600 6.700z',
		clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.500V12l3.500 2',
		rewatch:
			'M4.500 11a7.500 7.500 0 0 1 13-4.200L19.500 9M19.500 4.500V9H15M19.500 13a7.500 7.500 0 0 1-13 4.200L4.500 15M4.500 19.500V15H9',
		review: 'M4 6.500h16M4 12h16M4 17.500h10',
		pencil: 'M4 20l1-4.500L16.500 4l3.500 3.500L8.500 19z',
		close: 'M6 6l12 12M18 6L6 18',
		bolt: 'M13.500 2L5 13.500h5.500L9.500 22 19 10h-5.500z',
		search: 'M10.500 3.500a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20.500 20.500l-5-5',
		plus: 'M12 5v14M5 12h14',
		chevron: 'M6 9l6 6 6-6',
		star: 'M12 2.500l2.900 6.200 6.700.800-5 4.600 1.400 6.700-6-3.400-6 3.400 1.400-6.700-5-4.600 6.700-.800z'
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
		stroke-width: 1.75;
		vertical-align: -0.125em;
	}

	.filled {
		fill: currentcolor;
		fill-rule: evenodd;
	}
</style>
