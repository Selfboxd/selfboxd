<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RatingScale } from '#lib/catalog/library.js';
	import type { Stats, StatsCount } from '#lib/catalog/stats.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import PersonPhoto from '#lib/components/PersonPhoto.svelte';
	import RatingHistogram from '#lib/components/profile/RatingHistogram.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import BarChart from './BarChart.svelte';
	import BarList from './BarList.svelte';

	interface Choice {
		label: string;
		href: string;
		current: boolean;
	}

	interface Props {
		stats: Stats;
		scale: RatingScale;
		title: string;
		subtitle: string;
		periods: Choice[];
		kinds: Choice[];
		/** Whether the period is one year, which counts the diary by month. */
		yearly: boolean;
	}

	let { stats, scale, title, subtitle, periods, kinds, yearly }: Props = $props();

	type ByYear = 'releases' | 'ratings' | 'diary';
	type Breakdown = 'watched' | 'rated';

	let byYear = $state<ByYear>('releases');
	let breakdown = $state<Breakdown>('watched');

	const locale = getLocale();
	const regions = new Intl.DisplayNames(locale, { type: 'region' });
	const languages = new Intl.DisplayNames(locale, { type: 'language' });
	const months = Array.from({ length: 12 }, (_, month) =>
		new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
			new Date(Date.UTC(2000, month, 1))
		)
	);
	const weekdays = Array.from({ length: 7 }, (_, index) =>
		new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
			new Date(Date.UTC(2024, 0, 1 + index))
		)
	);
	const number = new Intl.NumberFormat(locale);
	const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

	function name(code: string, kind: 'region' | 'language'): string {
		try {
			return (kind === 'region' ? regions.of(code) : languages.of(code)) ?? code;
		} catch {
			return code;
		}
	}

	function averageLabel(average: number | null): string {
		return average === null ? '' : ratingLabel(Math.round(average), scale);
	}

	const totals = $derived([
		{ value: number.format(stats.totals.works), label: m.stats_works() },
		{ value: number.format(stats.totals.hours), label: m.stats_hours() },
		{ value: number.format(stats.totals.directors), label: m.stats_directors() },
		{ value: number.format(stats.totals.countries), label: m.stats_countries() },
		{
			value: m.stats_weeks_short({ count: stats.totals.streakWeeks }),
			label: m.stats_streak(),
			title:
				stats.totals.streakStart === null
					? undefined
					: m.stats_streak_since({ date: formatDate(new Date(stats.totals.streakStart)) })
		},
		{ value: number.format(stats.totals.busyDays), label: m.stats_busy_days() }
	]);

	const extras = $derived([
		{ value: number.format(stats.totals.entries), label: m.stats_entries() },
		{ value: number.format(stats.totals.reviews), label: m.stats_reviews() },
		{
			value:
				stats.totals.entries === 0
					? '0%'
					: `${String(Math.round((stats.totals.rewatches / stats.totals.entries) * 100))}%`,
			label: m.stats_rewatch_rate()
		},
		{
			value:
				stats.totals.average === null
					? '-'
					: decimal.format(scale === 'ten' ? stats.totals.average : stats.totals.average / 2),
			label: m.stats_average()
		}
	]);

	const yearBars = $derived.by(() => {
		if (byYear === 'diary') {
			return stats.diary.map((entry) => {
				const label = yearly ? (months[Number(entry.label) - 1] ?? entry.label) : entry.label;
				return {
					label,
					value: entry.count,
					tip: m.stats_tip_entries({ label, count: entry.count })
				};
			});
		}
		return stats.releases.map((entry) => {
			const label = String(entry.year);
			return byYear === 'ratings'
				? {
						label,
						value: entry.average ?? 0,
						tip:
							entry.average === null
								? label
								: m.stats_tip_rating({ label, rating: averageLabel(entry.average) })
					}
				: {
						label,
						value: entry.count,
						tip: m.stats_tip_works({ label, count: entry.count })
					};
		});
	});

	function rows(items: StatsCount[], kind: 'plain' | 'region' | 'language') {
		const sorted =
			breakdown === 'rated'
				? items
						.filter((item) => item.average !== null)
						.toSorted((a, b) => (b.average ?? 0) - (a.average ?? 0))
				: items;
		return sorted.slice(0, 10).map((item) => ({
			name: kind === 'plain' ? item.name : name(item.name, kind),
			value: breakdown === 'rated' ? (item.average ?? 0) : item.count,
			display: breakdown === 'rated' ? averageLabel(item.average) : number.format(item.count)
		}));
	}

	const studioRows = $derived(
		stats.studios.map((studio) => ({
			name: studio.name,
			value: studio.count,
			display: number.format(studio.count)
		}))
	);
	const half = $derived(Math.ceil(studioRows.length / 2));
</script>

<article class="stats">
	<header class="hero">
		<p class="subtitle">{subtitle}</p>
		<h1>{title}</h1>
		<nav class="periods" aria-label={m.stats_period()}>
			{#each periods as period (period.href)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
				<a href={period.href} aria-current={period.current ? 'page' : undefined}>{period.label}</a>
			{/each}
		</nav>
		{#if kinds.length > 0}
			<nav class="kinds" aria-label={m.stats_kind()}>
				{#each kinds as kind (kind.href)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
					<a href={kind.href} aria-current={kind.current ? 'page' : undefined}>{kind.label}</a>
				{/each}
			</nav>
		{/if}
		<dl class="totals">
			{#each totals as total (total.label)}
				<div title={total.title}>
					<dd>{total.value}</dd>
					<dt>{total.label}</dt>
				</div>
			{/each}
		</dl>
		<dl class="extras">
			{#each extras as extra (extra.label)}
				<div>
					<dd>{extra.value}</dd>
					<dt>{extra.label}</dt>
				</div>
			{/each}
		</dl>
	</header>

	{#if stats.totals.works === 0}
		<p class="empty">{m.stats_empty()}</p>
	{:else}
		<section>
			<header class="head">
				<h2>{m.stats_by_year()}</h2>
				<div class="tabs" role="tablist">
					{#each [{ id: 'releases', label: m.stats_tab_releases() }, { id: 'ratings', label: m.stats_tab_ratings() }, { id: 'diary', label: m.stats_tab_diary() }] as const as tab (tab.id)}
						<button
							type="button"
							role="tab"
							aria-selected={byYear === tab.id}
							onclick={() => (byYear = tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
			</header>
			<BarChart bars={yearBars} label={m.stats_by_year()} accent={byYear === 'diary'} />
		</section>

		<div class="pair">
			<section>
				<header class="head"><h2>{m.stats_ratings()}</h2></header>
				<RatingHistogram counts={stats.ratings} {scale} />
			</section>
			<section>
				<header class="head"><h2>{m.stats_weekdays()}</h2></header>
				<BarChart
					bars={stats.weekdays.map((count, index) => ({
						label: weekdays[index] ?? '',
						value: count,
						tip: m.stats_tip_entries({ label: weekdays[index] ?? '', count })
					}))}
					label={m.stats_weekdays()}
					accent
				/>
			</section>
		</div>

		{#if stats.decades.length > 0}
			<section>
				<header class="head"><h2>{m.stats_decades()}</h2></header>
				<ol class="decades">
					{#each stats.decades as decade (decade.decade)}
						<li>
							<div class="decade">
								<span class="years">{m.browse_decade({ decade: String(decade.decade) })}</span>
								<span class="score">{averageLabel(decade.average)}</span>
								<span class="count">{m.stats_count_works({ count: decade.count })}</span>
							</div>
							<ul class="posters">
								{#each decade.best as work (`${work.kind}:${work.id}`)}
									<li><FilmPoster film={work} size="fill" /></li>
								{/each}
							</ul>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<section>
			<header class="head">
				<h2>{m.stats_breakdown()}</h2>
				<div class="tabs" role="tablist">
					{#each [{ id: 'watched', label: m.stats_most_watched() }, { id: 'rated', label: m.stats_highest_rated() }] as const as tab (tab.id)}
						<button
							type="button"
							role="tab"
							aria-selected={breakdown === tab.id}
							onclick={() => (breakdown = tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
			</header>
			<div class="three">
				<div>
					<h3>{m.stats_genres()}</h3>
					<BarList rows={rows(stats.genres, 'plain')} label={m.stats_genres()} />
				</div>
				<div>
					<h3>{m.stats_countries()}</h3>
					<BarList rows={rows(stats.countries, 'region')} label={m.stats_countries()} />
				</div>
				<div>
					<h3>{m.stats_languages()}</h3>
					<BarList rows={rows(stats.languages, 'language')} label={m.stats_languages()} />
				</div>
			</div>
		</section>

		{#if stats.mostWatched.length > 0}
			<section>
				<header class="head"><h2>{m.stats_rewatched()}</h2></header>
				<ul class="watched">
					{#each stats.mostWatched as item (`${item.work.kind}:${item.work.id}`)}
						<li>
							<FilmPoster film={item.work} size="fill" />
							<span>{m.stats_times({ count: item.count })}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#each [{ title: m.stats_cast(), people: stats.cast }, { title: m.stats_directors_title(), people: stats.directors }] as group (group.title)}
			{#if group.people.length > 0}
				<section>
					<header class="head"><h2>{group.title}</h2></header>
					<ul class="people">
						{#each group.people as item (item.person.id)}
							<li>
								<a href={resolve('/(app)/person/[id]', { id: String(item.person.id) })}>
									<span class="photo">
										<PersonPhoto
											path={item.person.profilePath ?? null}
											name={item.person.name}
											size="w154"
										/>
									</span>
									<span class="person">{item.person.name}</span>
									<span class="count">{m.stats_count_works({ count: item.count })}</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}

		{#if stats.studios.length > 0}
			<section>
				<header class="head"><h2>{m.stats_studios()}</h2></header>
				<div class="studios">
					{#each [studioRows.slice(0, half), studioRows.slice(half)] as column, index (index)}
						{#if column.length > 0}
							<BarList rows={column} label={m.stats_studios()} scale={studioRows[0]?.value} />
						{/if}
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</article>

<style>
	.studios {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2) var(--space-12);
	}

	@media (max-width: 40rem) {
		.studios {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-12);
	}

	.hero {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-8) 0 var(--space-6);
		border-bottom: 1px solid var(--color-border);
		text-align: center;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	h1 {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-display);
		font-weight: 900;
		line-height: 1;
	}

	.periods,
	.kinds {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		justify-content: center;
	}

	.periods a,
	.kinds a {
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	.periods a:hover,
	.kinds a:hover {
		color: var(--color-heading);
	}

	.periods a[aria-current='page'] {
		background: var(--color-panel);
		color: var(--color-heading);
	}

	.kinds {
		overflow: hidden;
		gap: 0;
		border-radius: var(--radius-small);
		background: var(--color-input);
	}

	.kinds a {
		border-radius: 0;
	}

	.kinds a[aria-current='page'] {
		background: var(--color-secondary);
		color: var(--color-heading);
	}

	.totals,
	.extras {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4) var(--space-8);
		justify-content: center;
		margin: var(--space-4) 0 0;
	}

	.totals div,
	.extras div {
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
	}

	.totals dd {
		margin: 0;
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-journal-feature);
		font-weight: 900;
		line-height: 1.1;
	}

	.extras {
		margin-top: 0;
	}

	.extras dd {
		margin: 0;
		color: var(--color-text-strong);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.empty {
		color: var(--color-text-muted);
		text-align: center;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}

	h2 {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-control);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	h3 {
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.tabs {
		display: flex;
		gap: var(--space-3);
	}

	.tabs button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		cursor: pointer;
	}

	.tabs button:hover,
	.tabs button[aria-selected='true'] {
		color: var(--color-heading);
	}

	.pair,
	.three {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-12);
	}

	.three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-8);
	}

	.decades {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.decades > li {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr);
		gap: var(--space-6);
		align-items: center;
	}

	.decade {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.years {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-title);
		font-weight: 900;
	}

	.score {
		color: var(--color-rating);
		font-size: var(--font-size-control);
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.posters,
	.watched {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.watched li {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-align: center;
	}

	.people {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: var(--space-6) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.people a {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		align-items: center;
		text-align: center;
	}

	.photo {
		overflow: hidden;
		width: 100%;
		max-width: 8rem;
		margin-bottom: var(--space-1);
		aspect-ratio: 1;
		border-radius: 50%;
		box-shadow: var(--shadow-poster);
	}

	.person {
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
		font-weight: 700;
	}

	.people a:hover .person {
		color: var(--color-link-hover);
	}

	@media (max-width: 48rem) {
		.pair,
		.three {
			grid-template-columns: minmax(0, 1fr);
		}

		.people,
		.posters,
		.watched {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.decades > li {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
