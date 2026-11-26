<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let revealed = $state(false);
	let copied = $state(false);

	const id = $props.id();

	function failed(action: string): string | null {
		return form && 'error' in form && form.action === action ? errorMessage(form.error) : null;
	}

	function done(action: string): boolean {
		return form?.action === action && !('error' in form);
	}

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
	}

	const keep =
		() =>
		({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head>
	<title>{m.settings_tab_public()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main public">
		<h2 class="section-title">{m.settings_tab_public()}</h2>
		<p class="intro">{m.public_intro({ domain: data.domain })}</p>
		<p class="hint">{m.public_how()}</p>

		{#if !data.profile}
			<form method="POST" action="?/enable" class="form" use:enhance={keep}>
				{#if failed('enable')}<FormError message={failed('enable') ?? ''} />{/if}
				<div class="field">
					<label class="field-label" for="{id}-handle">{m.public_handle()}</label>
					<div class="handle">
						<span>{data.domain}/</span>
						<input
							id="{id}-handle"
							name="handle"
							value={form && 'handle' in form ? form.handle : data.suggested}
							pattern={'[a-z0-9_]{2,30}'}
							maxlength="30"
							autocomplete="off"
							required
						/>
					</div>
					<p class="hint">{m.public_handle_hint()}</p>
				</div>
				<div class="field">
					<label class="field-label" for="{id}-code">{m.public_code()}</label>
					<input
						id="{id}-code"
						name="accessCode"
						inputmode="numeric"
						pattern={'[0-9]{4}'}
						maxlength="4"
						autocomplete="off"
					/>
					<p class="hint">{m.public_code_hint()}</p>
				</div>
				<button class="button button-primary">{m.public_enable()}</button>
			</form>

			<h3 class="section-title">{m.public_restore_title()}</h3>
			<form method="POST" action="?/restore" class="form" use:enhance>
				{#if failed('restore')}<FormError message={failed('restore') ?? ''} />{/if}
				<p class="hint">{m.public_restore_hint()}</p>
				<div class="field">
					<label class="field-label" for="{id}-recovery">{m.public_recovery()}</label>
					<input id="{id}-recovery" name="recovery" autocomplete="off" required />
				</div>
				<button class="button button-secondary">{m.public_restore()}</button>
			</form>
		{:else}
			{@const profile = data.profile}
			<div class="status">
				<p>
					{m.public_live()}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the profile lives on the platform -->
					<a href={profile.url} target="_blank" rel="noopener noreferrer">{profile.url}</a>
				</p>
				{#if failed('sync')}
					<FormError message={failed('sync') ?? ''} />
				{:else if done('sync')}
					<FormNotice message={m.public_sent()} />
				{/if}
				{#if profile.pending || profile.lastError}
					<p class="hint" role="status">
						{m.public_pending()}
						{#if profile.lastError}({errorMessage(profile.lastError)}){/if}
					</p>
				{:else if profile.syncedAt}
					<p class="hint">{m.public_synced({ date: formatDate(new Date(profile.syncedAt)) })}</p>
				{/if}
				<form method="POST" action="?/sync" use:enhance>
					<button class="button button-secondary">{m.public_send_now()}</button>
				</form>
			</div>

			<h3 class="section-title">{m.public_code_title()}</h3>
			<form method="POST" action="?/code" class="form" use:enhance={keep}>
				{#if failed('code')}<FormError message={failed('code') ?? ''} />{/if}
				<p class="hint">
					{profile.accessCode
						? m.public_code_on({ code: profile.accessCode })
						: m.public_code_off()}
				</p>
				<div class="field">
					<label class="field-label" for="{id}-new-code">{m.public_code_title()}</label>
					<input
						id="{id}-new-code"
						name="accessCode"
						inputmode="numeric"
						pattern={'[0-9]{4}'}
						maxlength="4"
						autocomplete="off"
					/>
				</div>
				<div class="row">
					<button class="button button-primary">{m.public_code_save()}</button>
					{#if profile.accessCode}
						<button class="button button-secondary" name="remove" value="on" formnovalidate>
							{m.public_code_remove()}
						</button>
					{/if}
				</div>
			</form>

			<h3 class="section-title">{m.public_recovery()}</h3>
			{#if done('rotate')}<FormNotice message={m.public_rotated()} />{/if}
			<p class="hint">{m.public_recovery_hint()}</p>
			<div class="row">
				{#if revealed || done('rotate')}
					<input
						class="recovery"
						readonly
						value={profile.recoveryKey}
						aria-label={m.public_recovery()}
					/>
					<button
						class="button button-secondary"
						type="button"
						onclick={() => copy(profile.recoveryKey)}
					>
						{copied ? m.public_copied() : m.public_copy()}
					</button>
				{:else}
					<button class="button button-secondary" type="button" onclick={() => (revealed = true)}>
						{m.public_recovery_show()}
					</button>
				{/if}
			</div>

			<h3 class="section-title">{m.public_rotate_title()}</h3>
			<form method="POST" action="?/rotate" use:enhance>
				{#if failed('rotate')}<FormError message={failed('rotate') ?? ''} />{/if}
				<p class="hint">{m.public_rotate_hint()}</p>
				<button class="button button-secondary">{m.public_rotate_title()}</button>
			</form>

			<h3 class="section-title">{m.public_delete_title()}</h3>
			<form method="POST" action="?/disable" use:enhance>
				{#if failed('disable')}<FormError message={failed('disable') ?? ''} />{/if}
				<p class="hint">{m.public_delete_hint()}</p>
				<button class="button button-danger">{m.public_delete_title()}</button>
			</form>
		{/if}
	</section>
</div>

<style>
	.public {
		max-width: 34rem;
		gap: var(--space-3);
	}

	.intro {
		margin-bottom: var(--space-2);
		color: var(--color-text-strong);
	}

	.hint {
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	h3.section-title {
		margin-top: var(--space-8);
	}

	.handle {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.handle span {
		color: var(--color-text);
	}

	.status {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-4);
		padding: var(--space-4);
		border-radius: var(--radius-medium);
		background: var(--color-panel);
	}

	.status a {
		color: var(--color-heading);
		font-weight: 700;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.recovery {
		min-width: 0;
		flex: 1;
		font-family: var(--font-mono);
	}
</style>
