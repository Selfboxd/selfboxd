<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Select from '#lib/components/Select.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const id = $props.id();

	let query = $state('');
	let chosen = $derived(data.streaming?.chosen ?? []);

	/** Services matching the search, those already chosen first, then in the order of TMDB. */
	const shown = $derived.by(() => {
		const services = data.streaming?.services ?? [];
		const needle = query.trim().toLocaleLowerCase();
		const matching = needle
			? services.filter((service) => service.name.toLocaleLowerCase().includes(needle))
			: services;
		return [
			...matching.filter((service) => chosen.includes(service.id)),
			...matching.filter((service) => !chosen.includes(service.id))
		];
	});

	function toggle(serviceId: number) {
		chosen = chosen.includes(serviceId)
			? chosen.filter((entry) => entry !== serviceId)
			: [...chosen, serviceId];
	}

	function message(action: string): { error?: string; done: boolean } {
		if (form?.action !== action) return { done: false };
		return 'error' in form ? { error: errorMessage(form.error), done: false } : { done: true };
	}

	const keep =
		() =>
		({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head>
	<title>{m.settings_tab_preferences()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<div>
			<h2 class="section-title">{m.preferences_rating_title()}</h2>
			<form method="POST" action="?/rating" class="form" use:enhance={keep}>
				{#if message('rating').error}
					<FormError message={message('rating').error ?? ''} />
				{:else if message('rating').done}
					<FormNotice message={m.preferences_saved()} />
				{/if}
				<div class="field">
					<label class="field-label" for="{id}-scale">{m.preferences_rating_field()}</label>
					<Select
						id="{id}-scale"
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

		{#if data.streaming}
			<div>
				<h2 class="section-title">{m.streaming_country_title()}</h2>
				<form method="POST" action="?/country" class="form" use:enhance={keep}>
					{#if message('country').error}
						<FormError message={message('country').error ?? ''} />
					{:else if message('country').done}
						<FormNotice message={m.preferences_saved()} />
					{/if}
					<div class="field">
						<label class="field-label" for="{id}-country">{m.streaming_country()}</label>
						<Select
							id="{id}-country"
							name="country"
							value={data.streaming.country}
							options={data.streaming.regions.map((region) => ({
								value: region.code,
								label: region.name
							}))}
						/>
						<p class="field-hint">{m.streaming_country_hint()}</p>
					</div>
					<button class="button button-primary">{m.log_save()}</button>
				</form>
			</div>
		{/if}
	</section>

	{#if data.streaming}
		<section class="services">
			<h2 class="section-title">{m.streaming_services_title()}</h2>
			{#if data.streaming.services.length === 0}
				<p class="field-hint">{m.streaming_services_empty()}</p>
			{:else}
				<form method="POST" action="?/services" use:enhance={keep}>
					{#if message('services').error}
						<FormError message={message('services').error ?? ''} />
					{:else if message('services').done}
						<FormNotice message={m.preferences_saved()} />
					{/if}
					<p class="field-hint">{m.streaming_services_hint()}</p>
					<div class="toolbar">
						<label class="search">
							<Icon name="search" />
							<input
								type="search"
								bind:value={query}
								placeholder={m.streaming_search()}
								aria-label={m.streaming_search()}
							/>
						</label>
						<span class="count">
							{m.streaming_chosen({ count: chosen.length })}
						</span>
						<button class="button button-primary">{m.log_save()}</button>
					</div>
					{#each chosen as serviceId (serviceId)}
						<input type="hidden" name="service" value={serviceId} />
					{/each}
					<ul>
						{#each shown as service (service.id)}
							<li>
								<button
									type="button"
									class="service"
									class:on={chosen.includes(service.id)}
									aria-pressed={chosen.includes(service.id)}
									onclick={() => {
										toggle(service.id);
									}}
								>
									{#if service.logoPath}
										<img src={tmdbImage(service.logoPath, 'w92')} alt="" loading="lazy" />
									{:else}
										<span class="blank"></span>
									{/if}
									<span class="name">{service.name}</span>
									{#if chosen.includes(service.id)}
										<span class="check"><Icon name="check" /></span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</form>
			{/if}
		</section>
	{/if}
</div>

<style>
	.services form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-3);
		align-items: center;
	}

	.search {
		display: flex;
		min-width: 12rem;
		flex: 1;
		gap: var(--space-2);
		align-items: center;
		padding: 0 var(--space-3);
		border-radius: var(--radius-small);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-text-muted);
	}

	.search:focus-within {
		outline: 2px solid var(--color-focus);
	}

	.search input {
		min-width: 0;
		flex: 1;
		padding: var(--space-2) 0;
		border: 0;
		outline: none;
		background: none;
		color: var(--color-heading);
		font: inherit;
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--service-tile), 1fr));
		gap: var(--space-2);
		max-height: var(--services-height);
		margin: 0;
		padding: var(--space-1);
		overflow-y: auto;
		list-style: none;
	}

	.service {
		position: relative;
		display: flex;
		width: 100%;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-medium);
		background: var(--color-background-raised);
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-size-small);
		text-align: start;
		cursor: pointer;
	}

	.service:hover {
		border-color: var(--color-border);
		color: var(--color-text-strong);
	}

	.service.on {
		border-color: var(--color-accent);
		background: var(--color-success-surface);
		color: var(--color-heading);
	}

	img,
	.blank {
		width: var(--space-8);
		height: var(--space-8);
		flex: none;
		border-radius: var(--radius-small);
		background: var(--color-panel);
	}

	.name {
		overflow: hidden;
		flex: 1;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.check {
		display: flex;
		color: var(--color-highlight);
	}
</style>
