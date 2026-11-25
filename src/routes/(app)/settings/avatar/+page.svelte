<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const id = $props.id();
</script>

<svelte:head>
	<title>{m.avatar_title()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<div>
			<h2 class="section-title">{m.avatar_title()}</h2>
			<form method="POST" action="?/upload" enctype="multipart/form-data" class="form" use:enhance>
				{#if form && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'upload'}
					<FormNotice message={m.avatar_updated()} />
				{:else if form?.action === 'remove'}
					<FormNotice message={m.avatar_removed()} />
				{/if}
				<div class="field">
					<label class="field-label" for={id}>{m.avatar_field()}</label>
					<input
						class="field-input"
						{id}
						type="file"
						name="avatar"
						accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
						required
					/>
					<span class="field-hint">{m.avatar_intro()}</span>
				</div>
				<button class="button button-primary">{m.avatar_submit()}</button>
			</form>
		</div>
	</section>

	<section class="current">
		{#if data.user}
			<Avatar user={data.user} size="large" />
		{/if}
		{#if data.user?.avatarVersion}
			<form method="POST" action="?/remove" use:enhance>
				<button class="button button-secondary">{m.avatar_remove()}</button>
			</form>
		{/if}
	</section>
</div>

<style>
	.current {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		align-items: flex-start;
	}
</style>
