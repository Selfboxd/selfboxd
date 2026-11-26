<script lang="ts">
	import { enhance } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChoiceGroup from '#lib/components/ChoiceGroup.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Pause between two looks at the progress of the search, in milliseconds. */
	const pollDelay = 1000;

	let uploadForm: HTMLFormElement | undefined = $state();
	let uploading = $state(false);
	let importing = $state(false);
	let duplicates = $state<'skip' | 'add'>('skip');
	let ratings = $state<'keep' | 'replace'>('keep');
	let profile = $state<'keep' | 'replace'>('keep');
	let favourites = $state<'keep' | 'replace'>('keep');
	let lists = $state<'merge' | 'copy' | 'skip'>('merge');

	const status = $derived(data.status);
	const scale = $derived(data.user?.ratingScale ?? 'stars');
	const error = $derived(form && 'error' in form ? errorMessage(form.error) : null);

	$effect(() => {
		if (status?.state !== 'matching') return;
		const timer = setInterval(() => void refreshAll(), pollDelay);
		return () => {
			clearInterval(timer);
		};
	});

	const fieldNames = {
		bio: m.profile_field_bio,
		location: m.profile_field_location,
		website: m.profile_field_website
	};
</script>

<svelte:head>
	<title>{m.settings_tab_transfer()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<h2 class="section-title">{m.import_title()}</h2>
		{#if error}<FormError message={error} />{/if}

		{#if !data.hasTmdb}
			<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
		{:else if status === null}
			<p class="intro">{m.import_intro()}</p>
			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				bind:this={uploadForm}
				use:enhance={() => {
					uploading = true;
					return async ({ update }) => {
						await update();
						uploading = false;
					};
				}}
			>
				<label class="button button-primary file" class:busy={uploading}>
					{uploading ? m.import_reading() : m.import_choose()}
					<input
						type="file"
						name="archive"
						accept=".zip,application/zip"
						aria-label={m.import_choose()}
						disabled={uploading}
						onchange={() => uploadForm?.requestSubmit()}
					/>
				</label>
			</form>
		{:else if status.state === 'matching'}
			<div class="progress" role="status">
				<p>{m.import_matching()}</p>
				<progress max={status.total} value={status.done}></progress>
				<p class="hint">{m.import_progress({ done: status.done, total: status.total })}</p>
			</div>
		{:else if status.state === 'failed'}
			<FormError message={errorMessage(status.error)} />
			<form method="POST" action="?/close" use:enhance>
				<button class="button button-secondary">{m.import_again()}</button>
			</form>
		{:else if status.state === 'done'}
			<div class="done">
				<h3><Icon name="check" />{m.import_done_title()}</h3>
				<p>{m.import_done(status.summary)}</p>
				<div class="buttons">
					<a class="button button-primary" href={resolve('/(app)/diary')}>{m.nav_diary()}</a>
					<form method="POST" action="?/close" use:enhance>
						<button class="button button-secondary">{m.import_again()}</button>
					</form>
				</div>
			</div>
		{:else}
			{@const review = status.review}
			{@const conflicts = review.conflicts}
			<form
				method="POST"
				action="?/confirm"
				class="review"
				use:enhance={() => {
					importing = true;
					return async ({ update }) => {
						await update();
						importing = false;
					};
				}}
			>
				<h3>{m.import_review_title()}</h3>
				<p class="found">
					{m.import_found({ found: review.counts.found, films: review.counts.films })}
				</p>
				<dl class="counts">
					{#each [{ label: m.import_count_diary(), value: review.counts.diary }, { label: m.import_count_reviews(), value: review.counts.reviews }, { label: m.import_count_ratings(), value: review.counts.ratings }, { label: m.import_count_watched(), value: review.counts.watched }, { label: m.import_count_likes(), value: review.counts.likes }, { label: m.import_count_watchlist(), value: review.counts.watchlist }, { label: m.import_count_lists(), value: review.counts.lists }] as count (count.label)}
						<div>
							<dd>{count.value}</dd>
							<dt>{count.label}</dt>
						</div>
					{/each}
				</dl>

				{#if review.missing.length > 0}
					<details class="missing">
						<summary>{m.import_missing({ count: review.missing.length })}</summary>
						<ul>
							{#each review.missing as film, index (index)}
								<li>
									{film.name}{#if film.year}<span> {film.year}</span>{/if}
								</li>
							{/each}
						</ul>
					</details>
				{/if}

				<h3>{m.import_conflicts()}</h3>
				{#if conflicts.duplicates === 0 && conflicts.ratings.length === 0 && conflicts.profile.length === 0 && !conflicts.favourites && conflicts.lists.length === 0}
					<p class="hint">{m.import_no_conflict()}</p>
				{/if}
				{#if conflicts.duplicates > 0}
					<div class="conflict">
						<p>{m.import_duplicates({ count: conflicts.duplicates })}</p>
						<ChoiceGroup
							name="duplicates"
							label={m.import_duplicates({ count: conflicts.duplicates })}
							bind:value={duplicates}
							options={[
								{ value: 'skip', label: m.import_skip() },
								{ value: 'add', label: m.import_add() }
							]}
						/>
					</div>
				{/if}
				{#if conflicts.ratings.length > 0}
					<div class="conflict">
						<p>{m.import_ratings({ count: conflicts.ratings.length })}</p>
						<ul class="examples">
							{#each conflicts.ratings.slice(0, 3) as rating, index (index)}
								<li>
									{rating.title}: {ratingLabel(rating.mine, scale)} → {ratingLabel(
										rating.theirs,
										scale
									)}
								</li>
							{/each}
						</ul>
						<ChoiceGroup
							name="ratings"
							label={m.import_ratings({ count: conflicts.ratings.length })}
							bind:value={ratings}
							options={[
								{ value: 'keep', label: m.import_keep_mine() },
								{ value: 'replace', label: m.import_take_letterboxd() }
							]}
						/>
					</div>
				{/if}
				{#if conflicts.profile.length > 0}
					{@const fields = conflicts.profile.map((field) => fieldNames[field]()).join(', ')}
					<div class="conflict">
						<p>{m.import_profile({ fields })}</p>
						<ChoiceGroup
							name="profile"
							label={m.import_profile({ fields })}
							bind:value={profile}
							options={[
								{ value: 'keep', label: m.import_keep_mine() },
								{ value: 'replace', label: m.import_take_letterboxd() }
							]}
						/>
					</div>
				{/if}
				{#if conflicts.favourites}
					<div class="conflict">
						<p>{m.import_favourites()}</p>
						<ChoiceGroup
							name="favourites"
							label={m.import_favourites()}
							bind:value={favourites}
							options={[
								{ value: 'keep', label: m.import_keep_mine() },
								{ value: 'replace', label: m.import_take_letterboxd() }
							]}
						/>
					</div>
				{/if}
				{#if conflicts.lists.length > 0}
					{@const names = conflicts.lists.join(', ')}
					<div class="conflict">
						<p>{m.import_lists({ names })}</p>
						<ChoiceGroup
							name="lists"
							label={m.import_lists({ names })}
							bind:value={lists}
							options={[
								{ value: 'merge', label: m.import_merge() },
								{ value: 'copy', label: m.import_copy() },
								{ value: 'skip', label: m.import_skip() }
							]}
						/>
					</div>
				{/if}
				{#if review.counts.lists > 0}
					<label class="check">
						<input type="checkbox" name="ranked" checked />
						{m.import_ranked()}
					</label>
				{/if}

				<div class="buttons">
					<button class="button button-primary" disabled={importing}>{m.import_start()}</button>
					<button class="button button-secondary" formaction="?/close" formnovalidate>
						{m.import_cancel()}
					</button>
				</div>
			</form>
		{/if}
	</section>

	<aside>
		<h2 class="section-title">{m.export_title()}</h2>
		<p class="intro">{m.export_intro()}</p>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a file download, not a page -->
		<a class="button button-secondary" href={resolve('/(app)/settings/transfer/export')} download>
			{m.export_download()}
		</a>
	</aside>
</div>

<style>
	.split {
		grid-template-columns: minmax(0, 1fr) minmax(0, 20rem);
	}

	.split-main {
		max-width: none;
		gap: 0;
	}

	.intro {
		margin-bottom: var(--space-4);
		color: var(--color-text);
		line-height: var(--line-height-body);
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.file {
		position: relative;
		display: inline-block;
		cursor: pointer;
	}

	.file.busy {
		opacity: 0.7;
		cursor: progress;
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

	.progress {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		color: var(--color-text-strong);
	}

	progress {
		width: 100%;
		height: var(--space-2);
		overflow: hidden;
		border: 0;
		border-radius: var(--radius-pill);
		appearance: none;
		background: var(--color-panel);
	}

	progress::-webkit-progress-bar {
		background: var(--color-panel);
	}

	progress::-webkit-progress-value {
		border-radius: var(--radius-pill);
		background: var(--color-accent);
		transition: width var(--duration-medium) var(--ease-out);
	}

	progress::-moz-progress-bar {
		border-radius: var(--radius-pill);
		background: var(--color-accent);
	}

	h3 {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		margin-top: var(--space-6);
		color: var(--color-heading);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 700;
	}

	.review h3:first-child,
	.done h3 {
		margin-top: 0;
	}

	.done h3 :global(svg) {
		color: var(--color-accent);
	}

	.done p {
		margin: var(--space-2) 0 var(--space-4);
		color: var(--color-text-strong);
	}

	.found {
		margin-top: var(--space-1);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	.counts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
		gap: var(--space-2);
		margin: var(--space-4) 0;
	}

	.counts div {
		display: flex;
		flex-direction: column-reverse;
		padding: var(--space-3);
		border-radius: var(--radius-small);
		background: var(--color-panel);
	}

	.counts dd {
		margin: 0;
		color: var(--color-heading);
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	.counts dt {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.missing summary {
		color: var(--color-text);
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	.missing ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		max-height: 12rem;
		margin: var(--space-2) 0 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.missing li {
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text);
		font-size: var(--font-size-small);
		line-height: 1.8;
	}

	.missing span {
		color: var(--color-text-muted);
	}

	.conflict {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-items: flex-start;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border-subtle);
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
	}

	.examples {
		margin: 0;
		padding: 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		list-style: none;
	}

	.check {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		margin-top: var(--space-4);
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		margin-top: var(--space-6);
	}

	.done .buttons {
		margin-top: 0;
	}
</style>
