<script lang="ts">
	import { listDescriptionMaxLength, listNameMaxLength } from '#lib/catalog/library.js';
	import TagsInput from '#lib/components/TagsInput.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Values the fields start with. */
		initial?: { name: string; description: string; ranked: boolean; tags: string[] };
		/** List tags already used, offered while typing. */
		knownTags?: string[];
	}

	let { initial = { name: '', description: '', ranked: false, tags: [] }, knownTags = [] }: Props =
		$props();

	const id = $props.id();
	let tags = $derived([...initial.tags]);
</script>

<div class="field">
	<label class="field-label" for="{id}-name">{m.list_field_name()}</label>
	<input
		class="field-input"
		id="{id}-name"
		type="text"
		name="name"
		defaultValue={initial.name}
		maxlength={listNameMaxLength}
		autocomplete="off"
		required
	/>
</div>
<div class="field">
	<label class="field-label" for="{id}-description">{m.list_field_description()}</label>
	<textarea
		class="field-input"
		id="{id}-description"
		name="description"
		rows="5"
		maxlength={listDescriptionMaxLength}
		defaultValue={initial.description}></textarea>
</div>
<div class="field">
	<label class="field-label" for="{id}-tags">{m.list_field_tags()}</label>
	<TagsInput
		id="{id}-tags"
		name="tags"
		bind:value={tags}
		suggestions={knownTags}
		placeholder={m.log_tags_placeholder()}
	/>
	<p class="field-hint">{m.list_tags_hint()}</p>
</div>
<label class="ranked">
	<input type="checkbox" name="ranked" defaultChecked={initial.ranked} />
	<span>
		{m.list_field_ranked()}
		<span class="field-hint">{m.list_ranked_hint()}</span>
	</span>
</label>

<style>
	textarea {
		resize: vertical;
	}

	.ranked {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
		color: var(--color-heading);
		font-size: var(--font-size-control);
	}

	.ranked .field-hint {
		display: block;
	}
</style>
