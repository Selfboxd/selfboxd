<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Article } from '#lib/catalog/journal.js';
	import FormError from '#lib/components/FormError.svelte';
	import ArticleCard from '#lib/components/journal/ArticleCard.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Number of articles shown under the lead of the front page. */
	const latestCount = 6;
	/** Number of articles a section needs to be shown with pictures, and how many it shows. */
	const sectionSize = 4;
	/** Number of sections shown with pictures. */
	const pictureSectionCount = 3;
	/** Number of headlines shown for each remaining section. */
	const columnSize = 3;

	function sectionQuery(name: string | null): string {
		return new URLSearchParams({ section: name ?? '' }).toString();
	}

	const front = $derived.by(() => {
		if (data.state !== 'ready') return null;
		const { articles, sections } = data;
		const groups = sections
			.map((name) => ({
				name,
				articles: articles.filter((article: Article) => article.category === name)
			}))
			.sort((a, b) => b.articles.length - a.articles.length);
		const pictured = groups
			.filter((group) => group.articles.length >= sectionSize)
			.slice(0, pictureSectionCount);
		return {
			lead: articles[0],
			latest: articles.slice(1, 1 + latestCount),
			pictured,
			columns: groups
				.filter((group) => !pictured.includes(group))
				.sort((a, b) => a.name.localeCompare(b.name))
		};
	});

	const archive = $derived(
		data.state === 'ready' && data.archive
			? data.articles.filter(
					(article: Article) => data.section === null || article.category === data.section
				)
			: []
	);
</script>

<svelte:head>
	<title>{m.nav_journal()} - Selfboxd</title>
</svelte:head>

<div class="journal">
	<nav class="masthead" aria-label={m.journal_sections()}>
		<a class="wordmark" href={resolve('/(app)/journal')}>{m.nav_journal()}</a>
		{#if data.state === 'ready'}
			<ul>
				<li>
					<a
						href="{resolve('/(app)/journal')}?{sectionQuery(null)}"
						aria-current={data.archive && data.section === null ? 'page' : undefined}
					>
						{m.journal_all_sections()}
					</a>
				</li>
				{#each data.sections as name (name)}
					<li>
						<a
							href="{resolve('/(app)/journal')}?{sectionQuery(name)}"
							aria-current={data.section === name ? 'page' : undefined}
						>
							{name}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	{#if data.state === 'error'}
		<FormError message={m.journal_unavailable()} />
	{:else if data.archive}
		<section>
			<header class="section-head">
				<h1>{data.section ?? m.journal_all_sections()}</h1>
			</header>
			<div class="grid three">
				{#each archive as article (article.id)}
					<ArticleCard {article} rubric={data.section === null} />
				{/each}
			</div>
		</section>
	{:else if front?.lead}
		<h1 class="sr-only">{m.nav_journal()}</h1>
		<section class="lead">
			<ArticleCard article={front.lead} variant="feature" />
		</section>

		<section>
			<div class="grid three">
				{#each front.latest as article (article.id)}
					<ArticleCard {article} />
				{/each}
			</div>
			<p class="more">
				<a href="{resolve('/(app)/journal')}?{sectionQuery(null)}">{m.journal_older()} ›</a>
			</p>
		</section>

		{#each front.pictured as group (group.name)}
			<section>
				<header class="section-head">
					<h2>{group.name}</h2>
					<a href="{resolve('/(app)/journal')}?{sectionQuery(group.name)}">{m.journal_more()} ›</a>
				</header>
				<div class="grid four">
					{#each group.articles.slice(0, sectionSize) as article (article.id)}
						<ArticleCard {article} rubric={false} />
					{/each}
				</div>
			</section>
		{/each}

		{#if front.columns.length > 0}
			<section class="grid three columns">
				{#each front.columns as group (group.name)}
					<div>
						<header class="section-head">
							<h2>
								<a href="{resolve('/(app)/journal')}?{sectionQuery(group.name)}">{group.name}</a>
							</h2>
						</header>
						{#each group.articles.slice(0, columnSize) as article (article.id)}
							<ArticleCard {article} variant="line" />
						{/each}
					</div>
				{/each}
			</section>
		{/if}
	{/if}

	<footer>
		<p>
			{m.journal_credit()}
			<a href="https://letterboxd.com/journal/" target="_blank" rel="external noopener noreferrer">
				letterboxd.com/journal
			</a>
		</p>
	</footer>
</div>

<style>
	.journal {
		color: var(--color-ink);
	}

	.masthead {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-8);
		align-items: baseline;
		padding-bottom: var(--space-3);
		border-bottom: 2px solid var(--color-ink);
	}

	.wordmark {
		color: var(--color-ink);
		font-size: var(--font-size-heading);
		font-weight: 900;
		letter-spacing: 0.3em;
		text-transform: uppercase;
	}

	.masthead ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.masthead li a,
	.section-head a,
	.more a {
		color: var(--color-ink-soft);
		font-size: var(--font-size-small);
		font-weight: 700;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.masthead li a:hover,
	.masthead li a[aria-current],
	.section-head a:hover,
	.more a:hover {
		color: var(--color-ink);
	}

	section {
		margin-top: var(--space-12);
	}

	.lead {
		margin-top: var(--space-8);
	}

	.grid {
		display: grid;
		gap: var(--space-8);
	}

	.three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.four {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: var(--space-4);
		padding-top: var(--space-3);
		border-top: 2px solid var(--color-ink);
	}

	.section-head h1,
	.section-head h2,
	.section-head h2 a {
		color: var(--color-ink);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 900;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.more {
		margin-top: var(--space-6);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-ink-rule);
		text-align: end;
	}

	footer {
		margin-top: var(--space-12);
		padding-top: var(--space-4);
		border-top: 2px solid var(--color-ink);
		color: var(--color-ink-soft);
		font-size: var(--font-size-control);
	}

	footer a {
		color: var(--color-ink);
		font-weight: 700;
	}

	@media (max-width: 56rem) {
		.three,
		.four {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 36rem) {
		.three,
		.four {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
