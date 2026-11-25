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
	<title>{m.login_title()} - Selfboxd</title>
</svelte:head>

<h1 class="page-title">{m.login_title()}</h1>

<form method="POST" class="form" use:enhance>
	{#if form?.error}
		<FormError message={errorMessage(form.error, form.seconds)} />
	{/if}
	<TextField
		name="username"
		label={m.field_username()}
		value={form?.username}
		autocomplete="username"
		autocapitalize="none"
	/>
	<TextField
		name="password"
		type="password"
		label={m.field_password()}
		autocomplete="current-password"
	/>
	<button class="button button-primary">{m.login_submit()}</button>
</form>
