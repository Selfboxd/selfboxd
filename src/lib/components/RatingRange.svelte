<script lang="ts">
	import { goto } from '$app/navigation';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		scale: 'stars' | 'ten';
		/** Range in effect, from 1 to 10, or `null` for none. */
		value: { min: number; max: number } | null;
		/** Address showing the works rated within a range. */
		address: (min: number, max: number) => string;
	}

	let { scale, value, address }: Props = $props();

	const steps = Array.from({ length: 10 }, (_, index) => index + 1);

	let anchor = $state<number | null>(null);
	let hovered = $state<number | null>(null);

	const shown = $derived.by(() => {
		if (anchor !== null && hovered !== null) {
			return { min: Math.min(anchor, hovered), max: Math.max(anchor, hovered) };
		}
		if (hovered !== null) return { min: hovered, max: hovered };
		return value;
	});

	function lit(step: number): boolean {
		return shown !== null && step >= shown.min && step <= shown.max;
	}

	function stepAt(event: PointerEvent): number | null {
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const step = target instanceof HTMLElement ? Number(target.dataset.step) : Number.NaN;
		return Number.isInteger(step) && step >= 1 && step <= 10 ? step : null;
	}

	function start(event: PointerEvent) {
		const step = stepAt(event);
		if (step === null) return;
		event.preventDefault();
		anchor = step;
		hovered = step;
	}

	function move(event: PointerEvent) {
		hovered = stepAt(event) ?? hovered;
	}

	async function finish() {
		if (anchor === null || hovered === null) return;
		const min = Math.min(anchor, hovered);
		const max = Math.max(anchor, hovered);
		anchor = null;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- built from a resolved path
		await goto(address(min, max), { reset: false });
	}
</script>

<svelte:window onpointerup={() => void finish()} />

<div class="range">
	<p class="title">{m.filter_rating_range()}</p>
	<div
		class="steps {scale}"
		role="group"
		aria-label={m.filter_rating_range()}
		onpointerdown={start}
		onpointermove={move}
		onpointerleave={() => {
			if (anchor === null) hovered = null;
		}}
	>
		{#each steps as step (step)}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- built from a resolved path -->
			<a
				href={address(step, step)}
				class="step"
				class:lit={lit(step)}
				class:right={step % 2 === 0}
				data-step={step}
				aria-label={ratingLabel(step, scale)}
				draggable="false"
				onclick={(event) => {
					event.preventDefault();
				}}
			>
				{#if scale === 'ten'}{step}{/if}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
	</div>
	<p class="hint">{m.filter_rating_drag()}</p>
</div>

<style>
	.range {
		padding: var(--space-2) var(--space-3) var(--space-1);
		user-select: none;
	}

	.title,
	.hint {
		color: var(--color-menu-text);
		font-size: var(--font-size-filter);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		white-space: nowrap;
	}

	.hint {
		margin-top: var(--space-1);
		letter-spacing: 0;
		text-transform: none;
	}

	.steps {
		display: grid;
		margin-top: var(--space-2);
		touch-action: none;
	}

	.steps.stars {
		grid-template-columns: repeat(10, 1.05rem);
	}

	.steps.ten {
		grid-template-columns: repeat(10, 1.4rem);
		gap: 2px;
	}

	.stars .step,
	.stars .step:hover {
		height: 2rem;
		background: var(--color-range-off);
		mask: url('/star.svg') no-repeat;
		mask-size: 1.9rem 1.9rem;
	}

	.stars .step:not(.right) {
		mask-position: 0.1rem center;
	}

	.stars .step.right {
		mask-position: -0.95rem center;
	}

	.ten .step,
	.ten .step:hover {
		display: flex;
		height: 1.4rem;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-small);
		background: var(--color-range-off);
		color: var(--color-menu);
		font-size: var(--font-size-filter);
		font-weight: 700;
	}

	.steps .step {
		padding: 0;
		cursor: pointer;
	}

	.steps .step.lit {
		background: var(--color-highlight);
	}
</style>
