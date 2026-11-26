<script lang="ts">
	import { tick } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Select from '#lib/components/Select.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	interface Props {
		/** Identifier of the trigger, for a `label` that points at it. */
		id: string;
		/** Name of the field sent with the form, as `YYYY-MM-DD`. */
		name: string;
		/** The chosen day, as `YYYY-MM-DD`. */
		value: string;
		/** Last day that can be chosen, as `YYYY-MM-DD`. */
		max?: string;
	}

	let { id, name, value = $bindable(), max }: Props = $props();

	/** Oldest year offered. */
	const firstYear = 1880;
	/** Languages whose weeks start on Sunday; the others start on Monday. */
	const sundayFirst = new Set(['en', 'ja', 'pt']);

	let open = $state(false);
	let root: HTMLElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	let grid: HTMLElement | undefined = $state();
	let viewYear = $state(String(new Date().getFullYear()));
	let viewMonth = $state('0');
	let focused = $state('');

	const locale = getLocale();
	const weekStart = sundayFirst.has(locale) ? 0 : 1;

	function parse(text: string): Date {
		const [year = 1970, month = 1, day = 1] = text.split('-').map(Number);
		return new Date(Date.UTC(year, month - 1, day));
	}

	function format(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	function addDays(text: string, days: number): string {
		const date = parse(text);
		date.setUTCDate(date.getUTCDate() + days);
		return format(date);
	}

	const shown = $derived(
		value
			? new Intl.DateTimeFormat(locale, {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					timeZone: 'UTC'
				}).format(parse(value))
			: m.date_none()
	);

	const lastYear = $derived(max ? parse(max).getUTCFullYear() : new Date().getFullYear() + 1);

	const years = $derived(
		Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
			const year = String(lastYear - index);
			return { value: year, label: year };
		})
	);

	const months = Array.from({ length: 12 }, (_, index) => ({
		value: String(index),
		label: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
			new Date(Date.UTC(2000, index, 1))
		)
	}));

	const weekdays = Array.from({ length: 7 }, (_, index) => {
		// 2023-01-01 was a Sunday.
		const date = new Date(Date.UTC(2023, 0, 1 + ((index + weekStart) % 7)));
		return {
			short: new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(date),
			long: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(date)
		};
	});

	/** Days shown for the month in view, with blanks before the first so that weeks line up. */
	const days = $derived.by(() => {
		const year = Number(viewYear);
		const month = Number(viewMonth);
		const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() - weekStart + 7) % 7;
		return [
			...Array.from({ length: offset }, () => null),
			...Array.from({ length: count }, (_, index) =>
				format(new Date(Date.UTC(year, month, index + 1)))
			)
		];
	});

	const today = $derived(format(new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)));

	function view(text: string) {
		const date = parse(text);
		viewYear = String(date.getUTCFullYear());
		viewMonth = String(date.getUTCMonth());
	}

	function allowed(text: string): boolean {
		return !max || text <= max;
	}

	async function focusDay(text: string) {
		focused = text;
		view(text);
		await tick();
		grid?.querySelector<HTMLButtonElement>(`[data-day="${text}"]`)?.focus();
	}

	async function show() {
		open = true;
		await focusDay(value || max || today);
	}

	function close() {
		open = false;
		trigger?.focus();
	}

	function choose(text: string) {
		if (!allowed(text)) return;
		value = text;
		close();
	}

	function shiftMonth(step: number) {
		const date = new Date(Date.UTC(Number(viewYear), Number(viewMonth) + step, 1));
		view(format(date));
	}

	function onDayKey(event: KeyboardEvent, text: string) {
		const moves: Record<string, number> = {
			ArrowLeft: -1,
			ArrowRight: 1,
			ArrowUp: -7,
			ArrowDown: 7
		};
		const step = moves[event.key];
		if (step === undefined) return;
		event.preventDefault();
		const next = addDays(text, step);
		if (allowed(next)) void focusDay(next);
	}

	function onkeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	}

	function closeOnOutsideClick(event: PointerEvent) {
		if (open && root && event.target instanceof Node && !root.contains(event.target)) {
			open = false;
		}
	}
</script>

<svelte:window onpointerdown={closeOnOutsideClick} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="picker" bind:this={root} {onkeydown}>
	<input type="hidden" {name} {value} />
	<button
		{id}
		class="trigger"
		type="button"
		aria-haspopup="dialog"
		aria-expanded={open}
		data-value={value}
		bind:this={trigger}
		onclick={() => {
			if (open) close();
			else void show();
		}}
	>
		<span>{shown}</span>
		<Icon name="calendar" />
	</button>

	{#if open}
		<div class="calendar" role="dialog" aria-label={m.date_choose()}>
			<div class="head">
				<button
					class="step"
					type="button"
					aria-label={m.date_previous_month()}
					onclick={() => {
						shiftMonth(-1);
					}}
				>
					<Icon name="chevron-left" />
				</button>
				<Select id="{id}-month" name="" variant="well" bind:value={viewMonth} options={months} />
				<Select id="{id}-year" name="" variant="well" bind:value={viewYear} options={years} />
				<button
					class="step"
					type="button"
					aria-label={m.date_next_month()}
					onclick={() => {
						shiftMonth(1);
					}}
				>
					<Icon name="chevron-right" />
				</button>
				<span class="sr-only">
					<label for="{id}-month">{m.date_month()}</label>
					<label for="{id}-year">{m.date_year()}</label>
				</span>
			</div>
			<div class="grid" role="grid" bind:this={grid}>
				<div class="row" role="row">
					{#each weekdays as weekday (weekday.long)}
						<span class="weekday" role="columnheader" title={weekday.long}>{weekday.short}</span>
					{/each}
				</div>
				<div class="days" role="row">
					{#each days as day, index (day ?? `blank-${String(index)}`)}
						{#if day}
							<span role="gridcell">
								<button
									type="button"
									class="day"
									class:chosen={day === value}
									class:today={day === today}
									data-day={day}
									tabindex={day === focused ? 0 : -1}
									disabled={!allowed(day)}
									aria-pressed={day === value}
									aria-current={day === today ? 'date' : undefined}
									onclick={() => {
										choose(day);
									}}
									onkeydown={(event) => {
										onDayKey(event, day);
									}}
								>
									{Number(day.slice(8))}
								</button>
							</span>
						{:else}
							<span role="gridcell"></span>
						{/if}
					{/each}
				</div>
			</div>
			<div class="foot">
				<button
					type="button"
					class="link"
					onclick={() => {
						choose(today);
					}}
				>
					{m.date_today()}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.picker {
		position: relative;
		display: inline-block;
	}

	.trigger {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-well);
		color: var(--color-heading);
		font: inherit;
		cursor: pointer;
	}

	.trigger:hover {
		background: var(--color-well-hover);
	}

	.trigger :global(svg) {
		color: var(--color-text-panel);
	}

	.calendar {
		position: absolute;
		z-index: 20;
		top: calc(100% + var(--space-1));
		left: 0;
		display: flex;
		width: var(--date-picker-width);
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.head {
		display: grid;
		grid-template-columns: auto minmax(0, 1.4fr) minmax(0, 1fr) auto;
		gap: var(--space-1);
		align-items: center;
	}

	.head :global(.select) {
		min-width: 0;
	}

	.step {
		display: flex;
		padding: var(--space-1);
		border: 0;
		border-radius: var(--radius-small);
		background: none;
		color: var(--color-text-panel);
		cursor: pointer;
	}

	.step:hover {
		background: var(--color-well-hover);
		color: var(--color-heading);
	}

	.row,
	.days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--space-1);
	}

	.weekday {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-align: center;
		text-transform: uppercase;
	}

	.day {
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: var(--radius-small);
		background: none;
		color: var(--color-text-strong);
		font: inherit;
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	.day:hover:not(:disabled) {
		background: var(--color-well-hover);
		color: var(--color-heading);
	}

	.day.today {
		box-shadow: inset 0 0 0 1px var(--color-border);
	}

	.day.chosen {
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-weight: 700;
	}

	.day:disabled {
		color: var(--color-text-faint);
		cursor: default;
	}

	.foot {
		display: flex;
		justify-content: flex-end;
	}

	.link {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-link);
		font: inherit;
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	.link:hover {
		color: var(--color-heading);
	}
</style>
