<script lang="ts">
	import type { RatingScale } from '#lib/catalog/library.js';
	import type { Stats, StatsCount, StatsTarget, StatsWork } from '#lib/catalog/stats.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import PersonPhoto from '#lib/components/PersonPhoto.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { tmdbImage } from '#lib/images.js';
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
		/** The year of the period, which the diary links narrow to. */
		year: number | null;
		/** Address of a part of the statistics, `null` where the page has none. */
		link: (target: StatsTarget) => string | null;
	}

	let { stats, scale, title, subtitle, periods, kinds, yearly, year, link }: Props = $props();

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

	function displayName(code: string, kind: 'region' | 'language'): string {
		try {
			return (kind === 'region' ? regions.of(code) : languages.of(code)) ?? code;
		} catch {
			return code;
		}
	}

	/** A rating as short text: ★★★½ on the five-star scale, 7.5/10 on the ten-point one. */
	function short(rating: number | null): string {
		if (rating === null) return '';
		if (scale === 'ten') return `${decimal.format(rating)}/10`;
		const halves = Math.round(rating);
		return `${'★'.repeat(Math.floor(halves / 2))}${halves % 2 === 1 ? '½' : ''}`;
	}

	/** Label of a rating under the histogram. */
	function step(rating: number): string {
		if (scale === 'ten') return String(rating);
		return rating % 2 === 0
			? `${String(rating / 2)}★`
			: rating === 1
				? '½'
				: `${String((rating - 1) / 2)}½`;
	}

	const backdrop = $derived.by((): StatsWork[] => {
		const posters = stats.posters;
		if (posters.length < 6) return [];
		return Array.from({ length: 30 }, (_, index) => posters[index % posters.length] as StatsWork);
	});

	const totals = $derived([
		{
			value: number.format(stats.totals.works),
			label: m.stats_works(),
			href: link({ to: 'works', filter: {} })
		},
		{ value: number.format(stats.totals.hours), label: m.stats_hours(), href: null },
		{ value: number.format(stats.totals.directors), label: m.stats_directors(), href: null },
		{ value: number.format(stats.totals.countries), label: m.stats_countries(), href: null },
		{
			value: m.stats_weeks_short({ count: stats.totals.streakWeeks }),
			label: m.stats_streak(),
			href: null,
			title:
				stats.totals.streakStart === null
					? undefined
					: m.stats_streak_since({ date: formatDate(new Date(stats.totals.streakStart)) })
		}
	]);

	const extras = $derived([
		{
			value: number.format(stats.totals.entries),
			label: m.stats_entries(),
			href: link({ to: 'diary', ...(year === null ? {} : { year }) })
		},
		{
			value: number.format(stats.totals.reviews),
			label: m.stats_reviews(),
			href: link({ to: 'reviews' })
		},
		{
			value:
				stats.totals.entries === 0
					? '0%'
					: `${String(Math.round((stats.totals.rewatches / stats.totals.entries) * 100))}%`,
			label: m.stats_rewatch_rate(),
			href: null
		},
		{ value: number.format(stats.totals.busyDays), label: m.stats_busy_days(), href: null },
		{
			value:
				stats.totals.average === null
					? '-'
					: scale === 'ten'
						? `${decimal.format(stats.totals.average)}/10`
						: `${decimal.format(stats.totals.average / 2)}★`,
			label: m.stats_average(),
			href: null
		}
	]);

	const yearBars = $derived.by(() => {
		if (byYear === 'diary') {
			return stats.diary.map((entry) => {
				const label = yearly ? (months[Number(entry.label) - 1] ?? entry.label) : entry.label;
				const diaryYear = yearly ? year : Number(entry.label);
				return {
					label,
					value: entry.count,
					tip: m.stats_tip_entries({ label, count: entry.count }),
					href: link(diaryYear === null ? { to: 'diary' } : { to: 'diary', year: diaryYear })
				};
			});
		}
		return stats.releases.map((entry) => {
			const label = String(entry.year);
			const href = entry.count > 0 ? link({ to: 'works', filter: { released: entry.year } }) : null;
			return byYear === 'ratings'
				? {
						label,
						value: entry.average ?? 0,
						tip:
							entry.average === null
								? label
								: m.stats_tip_rating({ label, rating: short(entry.average) }),
						href
					}
				: {
						label,
						value: entry.count,
						tip: m.stats_tip_works({ label, count: entry.count }),
						href
					};
		});
	});

	const ratingBars = $derived(
		stats.ratings.map((count, index) => ({
			label: step(index + 1),
			value: count,
			tip: m.stats_tip_works({ label: short(index + 1), count }),
			href: count > 0 ? link({ to: 'works', filter: { rating: index + 1 } }) : null
		}))
	);

	const weekdayBars = $derived(
		stats.weekdays.map((count, index) => ({
			label: weekdays[index] ?? '',
			value: count,
			tip: m.stats_tip_entries({ label: weekdays[index] ?? '', count })
		}))
	);

	function rows(items: StatsCount[], kind: 'genre' | 'country' | 'language') {
		const sorted =
			breakdown === 'rated'
				? items
						.filter((item) => item.weighted !== null)
						.toSorted((a, b) => (b.weighted ?? 0) - (a.weighted ?? 0))
				: items;
		return sorted.slice(0, 10).map((item) => ({
			name:
				kind === 'genre'
					? item.name
					: displayName(item.name, kind === 'country' ? 'region' : 'language'),
			value: breakdown === 'rated' ? (item.weighted ?? 0) : item.count,
			display:
				breakdown === 'rated'
					? `${short(item.average)} · ${number.format(item.count)}`
					: number.format(item.count),
			href: link({ to: 'works', filter: { [kind]: item.name } })
		}));
	}

	const studioRows = $derived(
		stats.studios.map((studio) => ({
			name: studio.name,
			value: studio.count,
			display: number.format(studio.count),
			href: link({ to: 'studio', id: studio.id })
		}))
	);
	const half = $derived(Math.ceil(studioRows.length / 2));
</script>

<article class="stats">
	<header class="hero">
		{#if backdrop.length > 0}
			<div class="wall" aria-hidden="true">
				<div class="tiles">
					{#each backdrop as work, index (index)}
						<img src={tmdbImage(work.posterPath ?? '', 'w154')} alt="" loading="lazy" />
					{/each}
				</div>
			</div>
		{/if}
		<div class="intro">
			<p class="subtitle">{subtitle}</p>
			<h1>{title}</h1>
			<nav class="periods" aria-label={m.stats_period()}>
				{#each periods as period (period.href)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
					<a href={period.href} aria-current={period.current ? 'page' : undefined}>
						{period.label}
					</a>
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
		</div>
		<dl class="totals">
			{#each totals as total (total.label)}
				<div title={total.title}>
					<dt>{total.label}</dt>
					<dd>
						{#if total.href}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
							<a href={total.href}>{total.value}</a>
						{:else}{total.value}{/if}
					</dd>
				</div>
			{/each}
		</dl>
		<dl class="extras">
			{#each extras as extra (extra.label)}
				<div>
					<dt>{extra.label}</dt>
					<dd>
						{#if extra.href}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
							<a href={extra.href}>{extra.value}</a>
						{:else}{extra.value}{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</header>

	{#if stats.totals.works === 0}
		<p class="empty">{m.stats_empty()}</p>
	{:else}
		<section class="card">
			<header class="head">
				<h2 class="section-title">{m.stats_by_year()}</h2>
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
			<BarChart bars={yearBars} label={m.stats_by_year()} />
		</section>

		<div class="pair">
			<section class="card">
				<header class="head"><h2 class="section-title">{m.stats_ratings()}</h2></header>
				<BarChart bars={ratingBars} label={m.stats_ratings()} allLabels />
			</section>
			<section class="card">
				<header class="head"><h2 class="section-title">{m.stats_weekdays()}</h2></header>
				<BarChart bars={weekdayBars} label={m.stats_weekdays()} allLabels />
			</section>
		</div>

		{#if stats.decades.length > 0}
			<section>
				<header class="head"><h2 class="section-title">{m.stats_decades()}</h2></header>
				<ol class="decades">
					{#each stats.decades as decade (decade.decade)}
						{@const href = link({ to: 'works', filter: { decade: decade.decade } })}
						<li class="card">
							<div class="decade">
								{#if href}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
									<a class="years" {href}>{m.browse_decade({ decade: String(decade.decade) })}</a>
								{:else}
									<span class="years">{m.browse_decade({ decade: String(decade.decade) })}</span>
								{/if}
								<span class="score">{short(decade.average)}</span>
								<span class="count">{m.stats_count_works({ count: decade.count })}</span>
							</div>
							<ul class="posters">
								{#each decade.best.slice(0, 4) as work (`${work.kind}:${work.id}`)}
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
				<h2 class="section-title">{m.stats_breakdown()}</h2>
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
			{#if breakdown === 'rated'}<p class="note">{m.stats_weighted_note()}</p>{/if}
			<div class="three">
				<div class="card">
					<h3>{m.stats_genres()}</h3>
					<BarList rows={rows(stats.genres, 'genre')} label={m.stats_genres()} />
				</div>
				<div class="card">
					<h3>{m.stats_countries()}</h3>
					<BarList rows={rows(stats.countries, 'country')} label={m.stats_countries()} />
				</div>
				<div class="card">
					<h3>{m.stats_languages()}</h3>
					<BarList rows={rows(stats.languages, 'language')} label={m.stats_languages()} />
				</div>
			</div>
		</section>

		{#if stats.mostWatched.length > 0}
			<section>
				<header class="head"><h2 class="section-title">{m.stats_rewatched()}</h2></header>
				<ul class="watched">
					{#each stats.mostWatched as item (`${item.work.kind}:${item.work.id}`)}
						<li>
							<FilmPoster film={item.work} size="fill" />
							<span class="times">{m.stats_times({ count: item.count })}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#each [{ title: m.stats_cast(), people: stats.cast }, { title: m.stats_directors_title(), people: stats.directors }] as group (group.title)}
			{#if group.people.length > 0}
				<section>
					<header class="head"><h2 class="section-title">{group.title}</h2></header>
					<ul class="people">
						{#each group.people as item (item.person.id)}
							{@const href = link({ to: 'person', id: item.person.id })}
							<li>
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
								<a href={href ?? undefined}>
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
				<header class="head"><h2 class="section-title">{m.stats_studios()}</h2></header>
				<div class="studios card">
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
	.stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-12);
	}

	/* Hero: the posters of the period behind the totals. */
	.hero {
		position: relative;
		z-index: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		align-items: center;
		overflow: hidden;
		margin-top: var(--space-4);
		padding: var(--space-16) var(--space-6) var(--space-10);
		border-radius: var(--radius-large);
		background: var(--color-stats-hero);
		box-shadow: var(--shadow-stack);
		text-align: center;
	}

	.wall {
		position: absolute;
		z-index: -1;
		inset: 0;
		pointer-events: none;
	}

	.tiles {
		display: grid;
		width: 130%;
		grid-template-columns: repeat(10, minmax(0, 1fr));
		gap: var(--space-2);
		margin: -12% 0 0 -15%;
		opacity: 0.28;
		filter: saturate(0.7);
		transform: rotate(-8deg);
	}

	.tiles img {
		width: 100%;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-small);
		object-fit: cover;
	}

	.wall::after {
		position: absolute;
		background:
			radial-gradient(
				ellipse at center,
				var(--color-stats-veil-center) 0%,
				var(--color-stats-veil) 70%
			),
			linear-gradient(to bottom, transparent 40%, var(--color-stats-hero) 100%);
		content: '';
		inset: 0;
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		align-items: center;
	}

	.subtitle {
		color: var(--color-text-panel);
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
		text-shadow: var(--shadow-text);
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
		color: var(--color-text-panel);
		font-size: var(--font-size-control);
	}

	.periods a:hover,
	.kinds a:hover {
		color: var(--color-heading);
	}

	.periods a[aria-current='page'] {
		background: var(--color-stats-pill);
		color: var(--color-heading);
	}

	.kinds {
		overflow: hidden;
		gap: 0;
		border-radius: var(--radius-small);
		background: var(--color-stats-pill);
	}

	.kinds a {
		border-radius: 0;
	}

	.kinds a[aria-current='page'] {
		background: var(--color-surface-raised);
		color: var(--color-heading);
	}

	.totals,
	.extras {
		display: grid;
		width: 100%;
		max-width: 56rem;
		margin: 0;
	}

	.totals {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}

	.extras {
		grid-template-columns: repeat(5, minmax(0, 1fr));
		padding-top: var(--space-6);
		border-top: 1px solid var(--color-stats-divider);
	}

	.totals div,
	.extras div {
		display: flex;
		flex-direction: column-reverse;
		gap: var(--space-1);
		align-items: center;
	}

	.totals div + div,
	.extras div + div {
		border-left: 1px solid var(--color-stats-divider);
	}

	dd {
		margin: 0;
		color: var(--color-heading);
		font-variant-numeric: tabular-nums;
	}

	.totals dd {
		font-family: var(--font-display);
		font-size: var(--font-size-stats-total);
		font-weight: 900;
		line-height: 1;
	}

	.extras dd {
		font-size: var(--font-size-large);
		font-weight: 600;
	}

	dd a {
		color: inherit;
	}

	dd a:hover {
		color: var(--color-link-hover);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--font-size-filter);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.empty {
		color: var(--color-text);
		text-align: center;
	}

	/* Sections */
	.card {
		padding: var(--space-6);
		border-radius: var(--radius-medium);
		background: var(--color-stats-card);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: end;
		justify-content: space-between;
		margin-bottom: var(--space-6);
	}

	.head .section-title {
		flex: 1;
		margin: 0;
	}

	.card .head {
		margin-bottom: var(--space-6);
	}

	.tabs {
		display: flex;
		gap: var(--space-1);
	}

	.tabs button {
		padding: var(--space-1) var(--space-3);
		border: 0;
		border-radius: var(--radius-pill);
		background: none;
		color: var(--color-text-muted);
		font-family: inherit;
		font-size: var(--font-size-small);
		cursor: pointer;
	}

	.tabs button:hover {
		color: var(--color-heading);
	}

	.tabs button[aria-selected='true'] {
		background: var(--color-stats-pill);
		color: var(--color-heading);
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-6);
	}

	.decades {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-6);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.decade {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		align-items: baseline;
		margin-bottom: var(--space-4);
	}

	.years {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-heading);
		font-weight: 900;
	}

	a.years:hover {
		color: var(--color-link-hover);
	}

	.score {
		color: var(--color-text-panel);
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.posters {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.note {
		margin: calc(-1 * var(--space-4)) 0 var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.three {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-6);
	}

	h3 {
		margin-bottom: var(--space-4);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-filter);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.watched {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-small), 1fr));
		gap: var(--space-4) var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.times {
		display: block;
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-align: center;
	}

	.people {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: var(--space-8) var(--space-4);
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
		width: var(--stats-person-size);
		margin-bottom: var(--space-2);
		border-radius: 50%;
		aspect-ratio: 1;
		box-shadow: var(--shadow-poster-frame);
		transition: box-shadow var(--duration-medium) var(--ease-out);
	}

	.people a:hover .photo {
		box-shadow: var(--shadow-stack-hover);
	}

	.photo :global(img),
	.photo :global(.person-photo) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.person {
		color: var(--color-text-panel);
		font-size: var(--font-size-control);
		font-weight: 600;
	}

	.people a:hover .person {
		color: var(--color-heading);
	}

	.studios {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3) var(--space-12);
	}

	@media (max-width: 60rem) {
		.totals,
		.extras {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			row-gap: var(--space-6);
		}

		.decades,
		.three {
			grid-template-columns: minmax(0, 1fr);
		}

		.people {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 40rem) {
		.pair,
		.studios {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
