<script lang="ts">
	import Select from '#lib/components/Select.svelte';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const id = $props.id();
</script>

<svelte:head>
	<title>{m.settings_tab_preferences()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<div>
			<h2 class="section-title">{m.preferences_rating_title()}</h2>
			<form method="POST" class="form" use:enhance>
				{#if form && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.success}
					<FormNotice message={m.preferences_saved()} />
				{/if}
				<div class="field">
					<label class="field-label" for={id}>{m.preferences_rating_field()}</label>
					<Select
						{id}
						name="ratingScale"
						value={data.user?.ratingScale ?? 'stars'}
						options={[
							{ value: 'stars', label: m.preferences_rating_stars() },
							{ value: 'ten', label: m.preferences_rating_ten() }
						]}
					/>
				</div>
				<button class="button button-primary">{m.log_save()}</button>
			</form>
		</div>
	</section>
</div>
