<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import ListForm from '#lib/components/library/ListForm.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.list_new_title()} - Selfboxd</title>
</svelte:head>

<h1 class="page-title">{m.list_new_title()}</h1>

<form class="form narrow" method="POST" use:enhance>
	{#if form?.error}
		<FormError message={errorMessage(form.error)} />
	{/if}
	<ListForm knownTags={data.knownTags} />
	<button class="button button-primary">{m.log_save()}</button>
</form>

<style>
	.narrow {
		max-width: 30rem;
	}
</style>
