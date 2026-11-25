<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.setup_title()} - Selfboxd</title>
</svelte:head>

<h1 class="page-title">{m.setup_title()}</h1>
<p class="intro">{m.setup_intro()}</p>

<form method="POST" class="form" use:enhance>
	{#if form?.error}
		<FormError message={errorMessage(form.error)} />
	{/if}
	<TextField
		name="username"
		label={m.field_username()}
		hint={m.hint_username()}
		value={form?.username}
		autocomplete="username"
		autocapitalize="none"
	/>
	<TextField
		name="password"
		type="password"
		label={m.field_password()}
		hint={m.hint_password()}
		autocomplete="new-password"
	/>
	<TextField
		name="confirmation"
		type="password"
		label={m.field_password_confirm()}
		autocomplete="new-password"
	/>
	<button class="button button-primary">{m.setup_submit()}</button>
</form>

<style>
	.intro {
		margin-bottom: var(--space-6);
		color: var(--color-text-muted);
	}
</style>
