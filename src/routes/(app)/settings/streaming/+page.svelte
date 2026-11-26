<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Select from '#lib/components/Select.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const id = $props.id();
</script>

<svelte:head>
	<title>{m.settings_tab_streaming()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	<div class="split">
		<section class="split-main">
			<h2 class="section-title">{m.streaming_country_title()}</h2>
			<form method="POST" action="?/country" class="form" use:enhance>
				{#if form && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.success === 'country'}
					<FormNotice message={m.preferences_saved()} />
				{/if}
				<div class="field">
					<label class="field-label" for="{id}-country">{m.streaming_country()}</label>
					<Select
						id="{id}-country"
						name="country"
						value={data.country}
						options={data.regions.map((region) => ({ value: region.code, label: region.name }))}
					/>
					<p class="hint">{m.streaming_country_hint()}</p>
				</div>
				<button class="button button-primary">{m.log_save()}</button>
			</form>

			<h2 class="section-title services-title">{m.streaming_services_title()}</h2>
			{#if data.services.length === 0}
				<p class="hint">{m.streaming_services_empty()}</p>
			{:else}
				<form
					method="POST"
					action="?/services"
					use:enhance={() =>
						async ({ update }) =>
							update({ reset: false })}
				>
					{#if form?.success === 'services'}
						<FormNotice message={m.preferences_saved()} />
					{/if}
					<p class="hint">{m.streaming_services_hint()}</p>
					<ul class="services">
						{#each data.services as service (service.id)}
							<li>
								<label title={service.name}>
									<input
										type="checkbox"
										name="service"
										value={service.id}
										checked={data.chosen.includes(service.id)}
									/>
									{#if service.logoPath}
										<img src={tmdbImage(service.logoPath, 'w92')} alt="" loading="lazy" />
									{/if}
									<span>{service.name}</span>
								</label>
							</li>
						{/each}
					</ul>
					<button class="button button-primary">{m.log_save()}</button>
				</form>
			{/if}
		</section>
	</div>
{/if}

<style>
	.hint {
		margin: var(--space-1) 0 var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.services-title {
		margin-top: var(--space-8);
	}

	.services {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--service-tile), 1fr));
		gap: var(--space-2);
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
	}

	label {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-small);
		color: var(--color-text);
		font-size: var(--font-size-small);
		cursor: pointer;
	}

	label:has(input:checked) {
		border-color: var(--color-accent);
		color: var(--color-text-strong);
	}

	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	label:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	img {
		width: var(--space-8);
		height: var(--space-8);
		flex: none;
		border-radius: var(--radius-small);
	}

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
