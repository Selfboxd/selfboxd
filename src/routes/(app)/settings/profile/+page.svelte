<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { FilmSearchResult } from '#lib/catalog/film.js';
	import { bioMaxLength, locationMaxLength } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import FilmSearchDialog from '#lib/components/library/FilmSearchDialog.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let searchOpen = $state(false);
	let slot = $state(1);
	let filmId = $state('');
	let pickForm: HTMLFormElement | undefined = $state();

	const id = $props.id();

	function choose(chosen: number) {
		slot = chosen;
		searchOpen = true;
	}

	async function pick(film: FilmSearchResult) {
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
		<div>
			<h2 class="section-title">{m.settings_tab_profile()}</h2>
			<form
				method="POST"
				action="?/save"
				class="form"
				use:enhance={() =>
					({ update }) =>
						update({ reset: false })}
			>
				{#if form && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.saved}
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
				<button class="button button-primary">{m.log_save()}</button>
			</form>
		</div>
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

		<section>
			<h2 class="section-title">{m.profile_banner()}</h2>
			{#if data.profile.bannerPath}
				<img class="banner" src={tmdbImage(data.profile.bannerPath, 'w500')} alt="" />
			{/if}
			<p class="field-hint">{m.profile_banner_hint()}</p>
			{#if data.profile.bannerPath}
				<form method="POST" action="?/removeBanner" use:enhance>
					<button class="button button-danger">{m.profile_banner_remove()}</button>
				</form>
			{/if}
		</section>
	</aside>
</div>

<form method="POST" action="?/favourite" bind:this={pickForm} use:enhance>
	<input type="hidden" name="slot" value={slot} />
	<input type="hidden" name="filmId" value={filmId} />
</form>

<FilmSearchDialog bind:open={searchOpen} title={m.profile_favourites()} onpick={pick} />

<style>
	.split {
		grid-template-columns: minmax(0, 1fr) 21rem;
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
