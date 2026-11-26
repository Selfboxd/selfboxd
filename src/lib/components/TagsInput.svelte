<script lang="ts">
	import { tagMaxCount, tagMaxLength } from '#lib/catalog/library.js';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Identifier of the text box, for a `label` that points at it. */
		id: string;
		/** Name of the field sent with the form, the tags separated by commas. */
		name: string;
		value: string[];
		/** Tags already used, offered while typing. */
		suggestions?: string[];
		placeholder?: string;
	}

	let { id, name, value = $bindable(), suggestions = [], placeholder = '' }: Props = $props();

	/** Number of suggestions listed at most. */
	const suggestionMax = 6;

	let text = $state('');
	let active = $state(0);
	let focused = $state(false);
	let input: HTMLInputElement | undefined = $state();

	function normalize(tag: string): string {
		return tag.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, tagMaxLength);
	}

	const matches = $derived.by(() => {
		const needle = normalize(text);
		if (!needle) return [];
		return suggestions
			.filter((tag) => tag.includes(needle) && !value.includes(tag))
			.sort((a, b) => Number(!a.startsWith(needle)) - Number(!b.startsWith(needle)))
			.slice(0, suggestionMax);
	});

	const listed = $derived(focused && matches.length > 0);

	function add(raw: string) {
		const tag = normalize(raw);
		text = '';
		active = 0;
		if (!tag || value.includes(tag) || value.length >= tagMaxCount) return;
		value = [...value, tag];
	}

	function remove(tag: string) {
		value = value.filter((entry) => entry !== tag);
		input?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		const chosen = matches[active];
		if (event.key === 'Tab' && listed && chosen) {
			event.preventDefault();
			add(chosen);
		} else if (event.key === 'Enter' || event.key === ',') {
			if (!text.trim()) {
				if (event.key === ',') event.preventDefault();
				return;
			}
			event.preventDefault();
			add(listed && chosen && event.key === 'Enter' ? chosen : text);
		} else if (event.key === 'Backspace' && text === '' && value.length > 0) {
			value = value.slice(0, -1);
		} else if (listed && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active = (active + step + matches.length) % matches.length;
		} else if (listed && event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			text = '';
		}
	}

	function oninput() {
		active = 0;
		if (text.includes(',')) {
			const parts = text.split(',');
			const rest = parts.pop() ?? '';
			for (const part of parts) add(part);
			text = rest;
		}
	}
</script>

<div class="tags">
	<input type="hidden" {name} value={value.join(', ')} />
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="box" onclick={() => input?.focus()}>
		{#each value as tag (tag)}
			<span class="chip">
				{tag}
				<button
					type="button"
					aria-label={m.log_tag_remove({ tag })}
					onclick={(event) => {
						event.stopPropagation();
						remove(tag);
					}}
				>
					<Icon name="close" />
				</button>
			</span>
		{/each}
		<input
			{id}
			type="text"
			role="combobox"
			aria-expanded={listed}
			aria-controls="{id}-suggestions"
			aria-autocomplete="list"
			aria-activedescendant={listed ? `${id}-suggestion-${String(active)}` : undefined}
			autocomplete="off"
			placeholder={value.length === 0 ? placeholder : ''}
			maxlength={tagMaxLength}
			bind:this={input}
			bind:value={text}
			{onkeydown}
			{oninput}
			onfocus={() => (focused = true)}
			onblur={() => {
				focused = false;
				if (text.trim()) add(text);
			}}
		/>
	</div>
	<ul id="{id}-suggestions" role="listbox" hidden={!listed}>
		{#each matches as tag, index (tag)}
			<li
				id="{id}-suggestion-{index}"
				role="option"
				aria-selected={index === active}
				class:active={index === active}
				onmousedown={(event) => {
					event.preventDefault();
					add(tag);
				}}
			>
				{tag}
			</li>
		{/each}
	</ul>
</div>

<style>
	.tags {
		position: relative;
	}

	.box {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		align-items: center;
		min-height: var(--tags-input-height);
		padding: var(--space-1);
		border-radius: var(--radius-small);
		background: var(--color-field-light);
		cursor: text;
	}

	.box:focus-within {
		background: var(--color-input-focus);
	}

	.chip {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
		padding: 0 var(--space-1) 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-tag);
		color: var(--color-tag-text);
		font-size: var(--font-size-control);
		line-height: 1.6;
	}

	.chip button {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		cursor: pointer;
		opacity: 0.7;
	}

	.chip button:hover {
		opacity: 1;
	}

	input {
		min-width: 6rem;
		flex: 1;
		padding: var(--space-1);
		border: 0;
		outline: none;
		background: none;
		color: var(--color-field-light-text);
		font: inherit;
	}

	input::placeholder {
		color: var(--color-field-light-placeholder);
	}

	ul {
		position: absolute;
		z-index: 20;
		top: calc(100% + var(--space-1));
		right: 0;
		left: 0;
		margin: 0;
		padding: var(--space-1) 0;
		border-radius: var(--radius-small);
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
		list-style: none;
	}

	li {
		padding: var(--space-1) var(--space-3);
		color: var(--color-menu-text);
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	li.active,
	li:hover {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}
</style>
