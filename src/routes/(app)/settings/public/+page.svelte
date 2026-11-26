<script lang="ts">
	import { enhance } from '$app/forms';
	import CodeInput from '#lib/components/CodeInput.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let revealed = $state(false);
	let copied = $state(false);
	let confirming = $state(false);
	let busy = $state<string | null>(null);

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

	/** Keeps the fields after a refused submission and shows the action while it runs. */
	function submit(action: string) {
		return () => {
			busy = action;
			return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
				await update({ reset: false });
				busy = null;
				confirming = false;
			};
		};
	}
</script>

<svelte:head>
	<title>{m.settings_tab_public()} - Selfboxd</title>
</svelte:head>

<div class="public">
	<header class="intro">
		<h2 class="section-title">{m.settings_tab_public()}</h2>
		<p class="lead">{m.public_intro({ domain: data.domain })}</p>
		<p class="hint">{m.public_how()}</p>
	</header>

	{#if !data.profile}
		<div class="cards">
			<form method="POST" action="?/enable" class="card" use:enhance={submit('enable')}>
				<h3>{m.public_enable()}</h3>
				{#if failed('enable')}<FormError message={failed('enable') ?? ''} />{/if}
				<div class="field">
					<label class="field-label" for="{id}-handle">{m.public_handle()}</label>
					<div class="address">
						<span>{data.domain}/</span>
						<input
							id="{id}-handle"
							name="handle"
							value={form && 'handle' in form ? form.handle : data.suggested}
							pattern={'[a-z0-9_]{2,30}'}
							maxlength="30"
							autocomplete="off"
							spellcheck="false"
							required
						/>
					</div>
					<p class="hint">{m.public_handle_hint()}</p>
				</div>
				<div class="field">
					<span class="field-label">{m.public_code()}</span>
					<CodeInput name="accessCode" label={m.public_code_title()} />
					<p class="hint">{m.public_code_hint()}</p>
				</div>
				<button class="button button-primary" disabled={busy === 'enable'}>
					{m.public_enable()}
				</button>
			</form>

			<form method="POST" action="?/restore" class="card" use:enhance={submit('restore')}>
				<h3>{m.public_restore_title()}</h3>
				{#if failed('restore')}<FormError message={failed('restore') ?? ''} />{/if}
				<p class="hint">{m.public_restore_hint()}</p>
				<div class="field">
					<label class="field-label" for="{id}-recovery">{m.public_recovery()}</label>
					<input
						id="{id}-recovery"
						class="mono"
						name="recovery"
						autocomplete="off"
						spellcheck="false"
						placeholder="SBXD1-…"
						required
					/>
				</div>
				<button class="button button-secondary" disabled={busy === 'restore'}>
					{m.public_restore()}
				</button>
			</form>
		</div>
	{:else}
		{@const profile = data.profile}
		<section class="card status">
			<p class="live">
				<span class="dot" class:waiting={profile.pending || profile.lastError}></span>
				{m.public_live()}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the profile lives on the platform -->
				<a href={profile.url} target="_blank" rel="noopener noreferrer">
					{profile.url.replace(/^https?:\/\//, '')}
					<Icon name="external" />
				</a>
			</p>
			{#if failed('sync')}
				<FormError message={failed('sync') ?? ''} />
			{:else if done('sync')}
				<FormNotice message={m.public_sent()} />
			{/if}
			<div class="row">
				{#if profile.pending || profile.lastError}
					<p class="hint" role="status">
						{m.public_pending()}
						{#if profile.lastError}({errorMessage(profile.lastError)}){/if}
					</p>
				{:else if profile.syncedAt}
					<p class="hint">{m.public_synced({ date: formatDate(new Date(profile.syncedAt)) })}</p>
				{/if}
				<form method="POST" action="?/sync" use:enhance={submit('sync')}>
					<button class="button button-secondary" disabled={busy === 'sync'}>
						{m.public_send_now()}
					</button>
				</form>
			</div>
		</section>

		<div class="cards">
			<form method="POST" action="?/code" class="card" use:enhance={submit('code')}>
				<h3>{m.public_code_title()}</h3>
				{#if failed('code')}<FormError message={failed('code') ?? ''} />{/if}
				<p class="hint">
					{profile.accessCode
						? m.public_code_on({ code: profile.accessCode })
						: m.public_code_off()}
				</p>
				<CodeInput name="accessCode" label={m.public_code_title()} />
				<div class="row">
					<button class="button button-primary" disabled={busy === 'code'}>
						{m.public_code_save()}
					</button>
					{#if profile.accessCode}
						<button class="button button-danger" name="remove" value="on" formnovalidate>
							{m.public_code_remove()}
						</button>
					{/if}
				</div>
			</form>

			<section class="card">
				<h3>{m.public_recovery()}</h3>
				{#if done('rotate')}<FormNotice message={m.public_rotated()} />{/if}
				<p class="hint">{m.public_recovery_hint()}</p>
				{#if revealed || done('rotate')}
					<div class="secret">
						<input
							class="mono"
							readonly
							value={profile.recoveryKey}
							aria-label={m.public_recovery()}
						/>
						<button
							class="tool"
							type="button"
							aria-label={copied ? m.public_copied() : m.public_copy()}
							title={copied ? m.public_copied() : m.public_copy()}
							onclick={() => copy(profile.recoveryKey)}
						>
							<Icon name={copied ? 'check' : 'copy'} />
						</button>
					</div>
				{:else}
					<button class="button button-secondary" type="button" onclick={() => (revealed = true)}>
						{m.public_recovery_show()}
					</button>
				{/if}
				<form method="POST" action="?/rotate" class="rotate" use:enhance={submit('rotate')}>
					{#if failed('rotate')}<FormError message={failed('rotate') ?? ''} />{/if}
					<p class="hint">{m.public_rotate_hint()}</p>
					<button class="button button-secondary" disabled={busy === 'rotate'}>
						{m.public_rotate_title()}
					</button>
				</form>
			</section>
		</div>

		<section class="card danger">
			<h3>{m.public_delete_title()}</h3>
			{#if failed('disable')}<FormError message={failed('disable') ?? ''} />{/if}
			<p class="hint">{m.public_delete_hint()}</p>
			{#if confirming}
				<form method="POST" action="?/disable" class="row" use:enhance={submit('disable')}>
					<p class="confirm">{m.public_delete_confirm()}</p>
					<button class="button button-danger" disabled={busy === 'disable'}>
						{m.public_delete_title()}
					</button>
					<button
						class="button button-secondary"
						type="button"
						onclick={() => (confirming = false)}
					>
						{m.public_cancel()}
					</button>
				</form>
			{:else}
				<button class="button button-danger" type="button" onclick={() => (confirming = true)}>
					{m.public_delete_title()}
				</button>
			{/if}
		</section>
	{/if}
</div>

<style>
	.public {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: var(--settings-wide);
	}

	.lead {
		margin-bottom: var(--space-2);
		color: var(--color-text-strong);
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: var(--space-4);
		align-items: start;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-medium);
		background: var(--color-background-raised);
	}

	.card > .button {
		align-self: flex-start;
	}

	h3 {
		color: var(--color-heading);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 700;
	}

	.address {
		display: flex;
		align-items: center;
		overflow: hidden;
		border-radius: var(--radius-small);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
	}

	.address:focus-within {
		outline: 2px solid var(--color-focus);
	}

	.address span {
		padding: 0 0 0 var(--space-3);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.address input {
		min-width: 0;
		flex: 1;
		padding: var(--space-2) var(--space-3) var(--space-2) 0;
		border: 0;
		outline: none;
		background: none;
		box-shadow: none;
		color: var(--color-heading);
		font: inherit;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: var(--font-size-small);
	}

	.status {
		gap: var(--space-2);
	}

	.live {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-text-strong);
	}

	.live a {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
		color: var(--color-heading);
		font-weight: 700;
	}

	.live a:hover {
		color: var(--color-link-hover);
	}

	.dot {
		width: var(--space-2);
		height: var(--space-2);
		border-radius: 50%;
		background: var(--color-highlight);
	}

	.dot.waiting {
		background: var(--color-watchlist);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-3);
		align-items: center;
		justify-content: space-between;
	}

	.card .row {
		justify-content: flex-start;
	}

	.secret {
		display: flex;
		gap: var(--space-1);
		align-items: center;
	}

	.secret input {
		min-width: 0;
		flex: 1;
	}

	.tool {
		display: flex;
		padding: var(--space-2);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-panel);
		color: var(--color-text-strong);
		cursor: pointer;
	}

	.tool:hover {
		background: var(--color-surface-raised);
		color: var(--color-heading);
	}

	.rotate {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-items: flex-start;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border-subtle);
	}

	.danger {
		border-color: var(--color-danger-soft);
	}

	.confirm {
		width: 100%;
		color: var(--color-danger-soft-text);
	}
</style>
