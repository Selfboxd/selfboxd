<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LogDialog from '#lib/components/library/LogDialog.svelte';
	import type { LogTarget } from '#lib/components/library/log-target.js';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let logTarget = $state<LogTarget | null>(null);

	const scale = $derived(data.user?.ratingScale ?? 'stars');

	const monthFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), { month: 'short', year: 'numeric', timeZone: 'UTC' })
	);

	const rows = $derived(
		data.entries.map((entry, index) => {
			const month = entry.watchedOn.slice(0, 7);
			return {
				entry,
				month: data.entries[index - 1]?.watchedOn.slice(0, 7) === month ? null : month,
				day: Number(entry.watchedOn.slice(8, 10))
			};
		})
	);
</script>

<svelte:head>
	<title>{m.diary_title()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<h1 class="section-title">
	{m.diary_title()}
	{#if data.tag}
		<span class="tag">{data.tag}</span>
		<a href={resolve('/(app)/diary')}>{m.watchlist_filter_all()}</a>
	{/if}
</h1>

{#if rows.length === 0}
	<p>{m.diary_empty()}</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>{m.diary_column_month()}</th>
				<th>{m.diary_column_day()}</th>
				<th class="film-column">{m.diary_column_film()}</th>
				<th>{m.diary_column_released()}</th>
				<th>{m.diary_column_rating()}</th>
				<th>{m.diary_column_like()}</th>
				<th>{m.diary_column_rewatch()}</th>
				<th>{m.diary_column_review()}</th>
				<th>{m.diary_column_edit()}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as { entry, month, day } (entry.id)}
				<tr>
					<td>
						{#if month}
							<span class="month">{monthFormat.format(new Date(`${month}-01`))}</span>
						{/if}
					</td>
					<td class="day">{day}</td>
					<td class="film-column">
						<div class="film">
							<FilmPoster film={{ ...entry.work, id: entry.work.externalId }} size="tiny" />
							<a class="title" href={resolve('/(app)/film/[id]', { id: entry.work.externalId })}>
								{entry.work.title}
							</a>
						</div>
					</td>
					<td>{entry.work.year ?? ''}</td>
					<td>
						{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
					</td>
					<td class="like">
						{#if entry.liked}<Icon name="heart" filled label={m.action_liked()} />{/if}
					</td>
					<td>
						{#if entry.rewatch}<Icon name="rewatch" label={m.diary_column_rewatch()} />{/if}
					</td>
					<td>
						{#if entry.review}<Icon name="review" label={m.diary_column_review()} />{/if}
					</td>
					<td>
						<button type="button" onclick={() => (logTarget = { kind: 'edit', entry })}>
							<Icon name="pencil" label={m.diary_edit()} />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<LogDialog bind:target={logTarget} {scale} />

<style>
	.tag {
		margin-inline: var(--space-2);
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text-strong);
		text-transform: none;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		padding: 0 var(--space-2) var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-align: center;
		text-transform: uppercase;
	}

	td {
		padding: var(--space-2);
		border-top: 1px solid var(--color-border-subtle);
		text-align: center;
		vertical-align: middle;
	}

	.film-column {
		width: 45%;
		text-align: start;
	}

	.month {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-panel);
		color: var(--color-text-strong);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		white-space: nowrap;
	}

	.day {
		color: var(--color-text-strong);
		font-size: var(--font-size-heading);
		font-weight: 300;
	}

	.film {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.title {
		color: var(--color-heading);
		font-family: var(--font-heading);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	.title:hover {
		color: var(--color-link-hover);
	}

	.like {
		color: var(--color-like);
	}

	td button {
		padding: var(--space-1);
		border: 0;
		background: none;
		color: var(--color-text);
		font-size: var(--font-size-body);
		cursor: pointer;
	}

	td button:hover {
		color: var(--color-link-hover);
	}

	@media (max-width: 48rem) {
		th:nth-child(4),
		td:nth-child(4),
		th:nth-child(7),
		td:nth-child(7),
		th:nth-child(8),
		td:nth-child(8) {
			display: none;
		}
	}
</style>
