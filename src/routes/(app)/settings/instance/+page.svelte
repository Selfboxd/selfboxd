<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.settings_tab_instance()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<div>
			<h2 class="section-title">{m.instance_tmdb_title()}</h2>
			<form method="POST" action="?/tmdb" class="form" use:enhance>
				{#if form && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.success}
					<FormNotice message={m.instance_tmdb_saved()} />
				{/if}
				<TextField
					name="key"
					type="password"
					label={m.instance_tmdb_field()}
					hint={m.instance_tmdb_intro()}
					autocomplete="off"
				/>
				<button class="button button-primary">{m.instance_tmdb_submit()}</button>
			</form>
		</div>
	</section>

	<section>
		<h2 class="section-title">{m.instance_tmdb_title()}</h2>
		<p class="state">
			{data.tmdbConfigured ? m.instance_tmdb_configured() : m.instance_tmdb_missing()}
		</p>
	</section>
</div>

<style>
	.state {
		color: var(--color-text-strong);
	}
</style>
