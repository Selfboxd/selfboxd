<script lang="ts">
	import { formatDate } from '#lib/i18n/dates.js';
	import { countryName, languageName } from '#lib/i18n/names.js';
	import { m } from '#lib/paraglide/messages.js';
	import { releaseTypes, type Film, type ReleaseType } from '#lib/catalog/film.js';

	interface Props {
		/** The film whose details are shown. */
		film: Film;
	}

	let { film }: Props = $props();

	type TabId = 'cast' | 'crew' | 'details' | 'genres' | 'releases';

	const tabs: { id: TabId; label: () => string }[] = [
		{ id: 'cast', label: m.film_tab_cast },
		{ id: 'crew', label: m.film_tab_crew },
		{ id: 'details', label: m.film_tab_details },
		{ id: 'genres', label: m.film_tab_genres },
		{ id: 'releases', label: m.film_tab_releases }
	];

	const releaseLabels: Record<ReleaseType, () => string> = {
		premiere: m.release_premiere,
		theatrical_limited: m.release_theatrical_limited,
		theatrical: m.release_theatrical,
		digital: m.release_digital,
		physical: m.release_physical,
		tv: m.release_tv
	};

	/** Number of cast members shown before the list is expanded. */
	const castPreview = 30;

	let active = $state<TabId>('cast');
	let castExpanded = $state(false);

	const visibleCast = $derived(castExpanded ? film.cast : film.cast.slice(0, castPreview));

	const id = $props.id();

	const details = $derived(
		[
			{ label: m.film_studios(), values: film.studios },
			{ label: m.film_countries(), values: film.countries.map(countryName) },
			{ label: m.film_original_language(), values: [languageName(film.originalLanguage)] },
			{ label: m.film_spoken_languages(), values: film.spokenLanguages.map(languageName) }
		].filter((row) => row.values.length > 0)
	);

	const releases = $derived(
		releaseTypes
			.map((type) => ({ type, entries: film.releases.filter((release) => release.type === type) }))
			.filter((group) => group.entries.length > 0)
	);
</script>

<div class="tabs" role="tablist">
	{#each tabs as tab (tab.id)}
		<button
			role="tab"
			id="{id}-tab-{tab.id}"
			aria-selected={active === tab.id}
			aria-controls="{id}-panel-{tab.id}"
			onclick={() => (active = tab.id)}
		>
			{tab.label()}
		</button>
	{/each}
</div>

<div class="panel" role="tabpanel" id="{id}-panel-{active}" aria-labelledby="{id}-tab-{active}">
	{#if active === 'cast'}
		<ul class="chips">
			{#each visibleCast as member (member.id)}
				<li title={member.character}>{member.name}</li>
			{/each}
			{#if film.cast.length > castPreview && !castExpanded}
				<li class="more">
					<button onclick={() => (castExpanded = true)}>{m.film_show_all()}</button>
				</li>
			{/if}
		</ul>
	{:else if active === 'crew'}
		<dl>
			{#each film.crew as group (group.job)}
				<dt>{group.job}</dt>
				<dd>
					<ul class="chips">
						{#each group.people as person (person.id)}<li>{person.name}</li>{/each}
					</ul>
				</dd>
			{/each}
		</dl>
	{:else if active === 'details'}
		<dl>
			{#each details as row (row.label)}
				<dt>{row.label}</dt>
				<dd>
					<ul class="chips">
						{#each row.values as value (value)}<li>{value}</li>{/each}
					</ul>
				</dd>
			{/each}
		</dl>
	{:else if active === 'genres'}
		<ul class="chips">
			{#each film.genres as genre (genre)}<li>{genre}</li>{/each}
		</ul>
	{:else}
		{#each releases as group (group.type)}
			<h3>{releaseLabels[group.type]()}</h3>
			<ul class="releases">
				{#each group.entries as release (release.country + release.date)}
					<li>
						<span class="date">{formatDate(new Date(release.date))}</span>
						<span>{countryName(release.country)}</span>
						{#if release.certification}<span class="chip">{release.certification}</span>{/if}
					</li>
				{/each}
			</ul>
		{/each}
	{/if}
</div>

<style>
	.tabs {
		display: flex;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.tabs button {
		margin-bottom: -1px;
		padding: var(--space-1) 0;
		border: 0;
		border-bottom: 1px solid transparent;
		background: none;
		color: var(--color-highlight);
		font-family: inherit;
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		cursor: pointer;
	}

	.tabs button:hover {
		color: var(--color-link-hover);
	}

	.tabs button[aria-selected='true'] {
		border-bottom-color: var(--color-heading);
		color: var(--color-heading);
	}

	.chips,
	.releases {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chips li,
	.chip {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		box-shadow: var(--shadow-chip);
		color: var(--color-text);
		font-size: var(--font-size-control);
		line-height: 1.4;
	}

	.chips .more {
		padding: 0;
	}

	.more button {
		padding: var(--space-1) var(--space-2);
		border: 0;
		background: none;
		color: var(--color-text-strong);
		font: inherit;
		cursor: pointer;
	}

	.more button:hover {
		color: var(--color-link-hover);
	}

	dl {
		display: grid;
		grid-template-columns: minmax(8rem, auto) minmax(0, 1fr);
		gap: var(--space-2) var(--space-4);
		margin: 0;
	}

	dt {
		padding-top: var(--space-1);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	dd {
		margin: 0;
	}

	h3 {
		margin: var(--space-3) 0 var(--space-2);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.releases {
		flex-direction: column;
	}

	.releases li {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		font-size: var(--font-size-control);
	}

	.date {
		min-width: 7rem;
		color: var(--color-text-strong);
	}
</style>
