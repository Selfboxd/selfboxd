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
				{#if form?.action === 'tmdb' && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'tmdb' && form.success}
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

		<div>
			<h2 class="section-title">{m.instance_mdblist_title()}</h2>
			<form method="POST" action="?/mdblist" class="form" use:enhance>
				{#if form?.action === 'mdblist' && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'mdblist' && form.success}
					<FormNotice message={m.instance_mdblist_saved()} />
				{/if}
				<TextField
					name="key"
					type="password"
					label={m.instance_mdblist_field()}
					hint={m.instance_mdblist_intro()}
					autocomplete="off"
				/>
				<button class="button button-primary">{m.instance_mdblist_submit()}</button>
			</form>
		</div>
	</section>

	<section>
		<h2 class="section-title">{m.instance_tmdb_title()}</h2>
		<p class="state">
			{data.tmdbConfigured ? m.instance_tmdb_configured() : m.instance_tmdb_missing()}
		</p>

		<h2 class="section-title second">{m.instance_mdblist_title()}</h2>
		<p class="state">
			{data.mdblistConfigured ? m.instance_mdblist_configured() : m.instance_mdblist_missing()}
		</p>
		{#if data.mdblistConfigured}
			<form method="POST" action="?/removeMdblist" use:enhance>
				<button class="button button-danger">{m.instance_mdblist_remove()}</button>
			</form>
		{/if}
	</section>
</div>

<style>
	.state {
		margin-bottom: var(--space-3);
		color: var(--color-text-strong);
	}

	.second {
		margin-top: var(--space-8);
	}
</style>
