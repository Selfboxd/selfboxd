<script lang="ts">
	interface Props {
		/** Name of the field; each digit is sent under it, in order. */
		name: string;
		/** Accessible name of the code. */
		label: string;
		/** Number of digits. */
		length?: number;
		required?: boolean;
	}

	let { name, label, length = 4, required = false }: Props = $props();

	let digits = $state<string[]>([]);
	let boxes = $state<HTMLInputElement[]>([]);

	const slots = $derived(Array.from({ length }, (_, index) => index));

	function fill(start: number, text: string) {
		const incoming = text.replace(/\D/g, '').split('');
		if (incoming.length === 0) return;
		const next = [...digits];
		incoming.slice(0, length - start).forEach((digit, offset) => {
			next[start + offset] = digit;
		});
		digits = next;
		boxes[Math.min(start + incoming.length, length - 1)]?.focus();
	}

	function oninput(index: number, event: Event) {
		const box = event.currentTarget as HTMLInputElement;
		const typed = box.value;
		box.value = digits[index] ?? '';
		if (typed === '') {
			digits[index] = '';
			return;
		}
		fill(index, typed.slice(-length + index));
	}

	function onkeydown(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !digits[index] && index > 0) {
			event.preventDefault();
			digits[index - 1] = '';
			boxes[index - 1]?.focus();
		} else if (event.key === 'ArrowLeft' && index > 0) {
			event.preventDefault();
			boxes[index - 1]?.focus();
		} else if (event.key === 'ArrowRight' && index < length - 1) {
			event.preventDefault();
			boxes[index + 1]?.focus();
		}
	}

	function onpaste(index: number, event: ClipboardEvent) {
		event.preventDefault();
		fill(index, event.clipboardData?.getData('text') ?? '');
	}
</script>

<div class="code" role="group" aria-label={label}>
	{#each slots as index (index)}
		<input
			bind:this={boxes[index]}
			{name}
			value={digits[index] ?? ''}
			type="text"
			inputmode="numeric"
			autocomplete="one-time-code"
			pattern="[0-9]"
			maxlength={length}
			aria-label="{label} {index + 1}"
			{required}
			oninput={(event) => {
				oninput(index, event);
			}}
			onkeydown={(event) => {
				onkeydown(index, event);
			}}
			onpaste={(event) => {
				onpaste(index, event);
			}}
			onfocus={(event) => {
				event.currentTarget.select();
			}}
		/>
	{/each}
</div>

<style>
	.code {
		display: flex;
		gap: var(--space-2);
	}

	input {
		width: var(--code-digit);
		height: var(--code-digit-height);
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-medium);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-heading);
		font-family: var(--font-mono);
		font-size: var(--font-size-large);
		font-weight: 700;
		text-align: center;
		caret-color: var(--color-accent);
	}

	input:focus {
		border-color: var(--color-accent);
		outline: none;
		background: var(--color-panel);
	}
</style>
