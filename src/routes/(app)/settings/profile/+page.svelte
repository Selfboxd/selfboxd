<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { bioMaxLength, locationMaxLength } from '#lib/catalog/library.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import WorkSearchDialog from '#lib/components/library/WorkSearchDialog.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let searchOpen = $state(false);
	let slot = $state(1);
	let filmId = $state('');
	let pickForm: HTMLFormElement | undefined = $state();
	let avatarForm: HTMLFormElement | undefined = $state();

	const linkFields = [
		{
			name: 'website',
			key: 'website',
			icon: 'link',
			label: m.profile_link_website(),
			placeholder: 'example.com'
		},
		{
			name: 'instagram',
			key: 'instagram',
			icon: 'instagram',
			label: 'Instagram',
			placeholder: 'Instagram'
		},
		{ name: 'x', key: 'x', icon: 'x', label: 'X', placeholder: 'X' },
		{ name: 'discord', key: 'discord', icon: 'discord', label: 'Discord', placeholder: 'Discord' }
	] as const;

	const id = $props.id();

	function choose(chosen: number) {
		slot = chosen;
		searchOpen = true;
	}

	async function pick(film: { id: number }) {
		filmId = String(film.id);
		await tick();
		pickForm?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{m.settings_tab_profile()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<section class="avatar">
			<h2 class="section-title">{m.avatar_title()}</h2>
			{#if form && 'action' in form}
				{#if 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else}
					<FormNotice
						message={form.action === 'upload' ? m.avatar_updated() : m.avatar_removed()}
					/>
				{/if}
			{/if}
			<div class="avatar-row">
				{#if data.user}<Avatar user={data.user} size="large" />{/if}
				<div class="avatar-actions">
					<form
						method="POST"
						action="?/upload"
						enctype="multipart/form-data"
						use:enhance
						bind:this={avatarForm}
					>
						<label class="button button-secondary file">
							{m.avatar_submit()}
							<input
								type="file"
								name="avatar"
								accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
								aria-label={m.avatar_field()}
								onchange={() => avatarForm?.requestSubmit()}
							/>
						</label>
					</form>
					{#if data.user?.avatarVersion}
						<form method="POST" action="?/removeAvatar" use:enhance>
							<button class="button button-danger">{m.avatar_remove()}</button>
						</form>
					{/if}
					<p class="field-hint">{m.avatar_intro()}</p>
				</div>
			</div>
		</section>

		<section>
			<h2 class="section-title">{m.settings_tab_profile()}</h2>
			<form
				method="POST"
				action="?/save"
				class="form"
				use:enhance={() =>
					({ update }) =>
						update({ reset: false })}
			>
				{#if form && 'error' in form && !('action' in form)}
					<FormError message={errorMessage(form.error)} />
				{:else if form && 'saved' in form && form.saved}
					<FormNotice message={m.profile_saved()} />
				{/if}
				<div class="field">
					<label class="field-label" for="{id}-location">{m.profile_field_location()}</label>
					<input
						class="field-input"
						id="{id}-location"
						type="text"
						name="location"
						value={data.profile.location}
						maxlength={locationMaxLength}
						autocomplete="off"
					/>
				</div>
				<div class="field">
					<label class="field-label" for="{id}-bio">{m.profile_field_bio()}</label>
					<textarea
						class="field-input"
						id="{id}-bio"
						name="bio"
						rows="6"
						maxlength={bioMaxLength}
						value={data.profile.bio}></textarea>
				</div>
				<fieldset class="links">
					<legend class="field-label">{m.profile_links()}</legend>
					{#each linkFields as field (field.name)}
						<label class="link">
							<Icon name={field.icon} />
							<span class="sr-only">{field.label}</span>
							<input
								class="field-input"
								name={field.name}
								value={data.profile.links[field.key]}
								placeholder={field.placeholder}
								autocomplete="off"
								spellcheck="false"
							/>
						</label>
					{/each}
				</fieldset>
				<button class="button button-primary">{m.log_save()}</button>
			</form>
		</section>

		<section>
			<h2 class="section-title">{m.profile_banner()}</h2>
			{#if data.profile.bannerPath}
				<img class="banner" src={tmdbImage(data.profile.bannerPath, 'w500')} alt="" />
			{/if}
			<p class="field-hint">{m.profile_banner_hint()}</p>
			{#if data.profile.bannerPath}
				<form method="POST" action="?/removeBanner" class="banner-actions" use:enhance>
					<button class="button button-danger">{m.profile_banner_remove()}</button>
				</form>
			{/if}
		</section>
	</section>

	<aside>
		<section>
			<h2 class="section-title">{m.profile_favourites()}</h2>
			<ul class="slots">
				{#each data.favourites as work, index (index)}
					<li>
						{#if work}
							<FilmPoster film={{ ...work, id: work.externalId }} size="small" linked={false} />
							<form method="POST" action="?/unfavourite" use:enhance>
								<input type="hidden" name="slot" value={index + 1} />
								<button
									class="remove"
									aria-label={m.profile_favourite_remove({ title: work.title })}
								>
									<Icon name="close" />
								</button>
							</form>
						{:else}
							<button
								class="empty"
								type="button"
								aria-label={m.profile_favourite_add({ slot: index + 1 })}
								onclick={() => {
									choose(index + 1);
								}}
							>
								<Icon name="plus" />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	</aside>
</div>

<form method="POST" action="?/favourite" bind:this={pickForm} use:enhance>
	<input type="hidden" name="slot" value={slot} />
	<input type="hidden" name="filmId" value={filmId} />
</form>

<WorkSearchDialog bind:open={searchOpen} title={m.profile_favourites()} onpick={pick} />

<style>
	.split {
		grid-template-columns: minmax(0, 28rem) minmax(0, 1fr);
	}

	.split-main {
		max-width: none;
		gap: var(--space-8);
	}

	.avatar-row {
		display: flex;
		gap: var(--space-4);
		align-items: center;
	}

	.avatar-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.avatar-actions .field-hint {
		width: 100%;
	}

	.file {
		position: relative;
		display: inline-block;
		cursor: pointer;
	}

	.file input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.file:focus-within {
		outline: 2px solid var(--color-focus);
	}

	.links {
		display: flex;
		width: 100%;
		min-inline-size: 0;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		border: 0;
	}

	.links legend {
		margin-bottom: var(--space-2);
		padding: 0;
	}

	.link {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-text);
		font-size: var(--font-size-large);
	}

	.link input {
		min-width: 0;
		flex: 1;
		font-size: var(--font-size-body);
	}

	.banner-actions {
		margin-top: var(--space-3);
	}

	aside {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	textarea {
		resize: vertical;
	}

	.slots {
		display: flex;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.slots li {
		position: relative;
	}

	.empty {
		display: grid;
		width: var(--poster-small);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-medium);
		aspect-ratio: 2 / 3;
		background: var(--color-chip);
		color: var(--color-text-muted);
		font-size: var(--font-size-heading);
		cursor: pointer;
		place-items: center;
	}

	.empty:hover {
		border-color: var(--color-text);
		color: var(--color-heading);
	}

	.remove {
		position: absolute;
		top: var(--space-1);
		right: var(--space-1);
		display: flex;
		padding: 2px;
		border: 0;
		border-radius: 50%;
		background: var(--color-scrim);
		color: var(--color-heading);
		opacity: 0;
		cursor: pointer;
		transition: opacity var(--duration-fast);
	}

	li:hover .remove,
	.remove:focus-visible {
		opacity: 1;
	}

	.banner {
		width: 100%;
		margin-bottom: var(--space-2);
		border-radius: var(--radius-medium);
	}

	@media (max-width: 40rem) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
