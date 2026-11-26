<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.settings_tab_instance()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<div>
			<h2 class="section-title">{m.instance_tmdb_title()}</h2>
			<form method="POST" action="?/tmdb" class="form" use:enhance>
				{#if form?.action === 'tmdb' && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'tmdb' && form.success}
					<FormNotice message={m.instance_tmdb_saved()} />
				{/if}
				<TextField
					name="key"
					type="password"
					label={m.instance_tmdb_field()}
					hint={m.instance_tmdb_intro()}
					autocomplete="off"
				/>
				<button class="button button-primary">{m.instance_tmdb_submit()}</button>
			</form>
		</div>

		<div>
			<h2 class="section-title">{m.instance_mdblist_title()}</h2>
			<form method="POST" action="?/mdblist" class="form" use:enhance>
				{#if form?.action === 'mdblist' && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'mdblist' && form.success}
					<FormNotice message={m.instance_mdblist_saved()} />
				{/if}
				<TextField
					name="key"
					type="password"
					label={m.instance_mdblist_field()}
					hint={m.instance_mdblist_intro()}
					autocomplete="off"
				/>
				<button class="button button-primary">{m.instance_mdblist_submit()}</button>
			</form>
		</div>
	</section>

	<section>
		<h2 class="section-title">{m.instance_keys_title()}</h2>
		{#if data.keys.length === 0}
			<p class="state">{m.instance_keys_none()}</p>
		{:else}
			<ul class="keys">
				{#each data.keys as key (key.id)}
					<li>
						<span class="name">{key.id === 'tmdb' ? 'TMDB' : 'MDBList'}</span>
						<span class="mask" aria-hidden="true">••••••••••••</span>
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="key" value={key.id} />
							<button
								class="remove"
								aria-label={m.instance_key_remove({ name: key.id === 'tmdb' ? 'TMDB' : 'MDBList' })}
								title={m.instance_key_remove({ name: key.id === 'tmdb' ? 'TMDB' : 'MDBList' })}
							>
								<Icon name="trash" />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.state {
		margin-bottom: var(--space-3);
		color: var(--color-text-strong);
	}

	.keys {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.keys li {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.name {
		color: var(--color-heading);
		font-weight: 700;
	}

	.mask {
		flex: 1;
		color: var(--color-text-muted);
		letter-spacing: var(--letter-spacing-caps);
	}

	.remove {
		display: flex;
		padding: var(--space-1);
		border: 0;
		border-radius: var(--radius-small);
		background: none;
		color: var(--color-text);
		font-size: var(--font-size-large);
		cursor: pointer;
	}

	.remove:hover {
		background: var(--color-danger-soft);
		color: var(--color-danger-soft-text);
	}
</style>
