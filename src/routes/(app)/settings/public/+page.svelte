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
		<p class="lead">{m.public_intro({ domain: data.domain })}</p>
		<p class="hint">{m.public_how()}</p>
	</header>

	{#if !data.profile}
		<form method="POST" action="?/enable" class="row" use:enhance={submit('enable')}>
			<div class="label">
				<h3>{m.public_enable()}</h3>
				<p class="hint">{m.public_handle_hint()}</p>
			</div>
			<div class="controls">
				{#if failed('enable')}<FormError message={failed('enable') ?? ''} />{/if}
				<label class="sr-only" for="{id}-handle">{m.public_handle()}</label>
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
				<span class="field-label">{m.public_code()}</span>
				<CodeInput name="accessCode" label={m.public_code_title()} />
				<p class="hint">{m.public_code_hint()}</p>
				<button class="button button-primary" disabled={busy === 'enable'}>
					{m.public_enable()}
				</button>
			</div>
		</form>

		<form method="POST" action="?/restore" class="row" use:enhance={submit('restore')}>
			<div class="label">
				<h3>{m.public_restore_title()}</h3>
				<p class="hint">{m.public_restore_hint()}</p>
			</div>
			<div class="controls">
				{#if failed('restore')}<FormError message={failed('restore') ?? ''} />{/if}
				<label class="sr-only" for="{id}-recovery">{m.public_recovery()}</label>
				<input
					id="{id}-recovery"
					class="field-input mono"
					name="recovery"
					autocomplete="off"
					spellcheck="false"
					placeholder="SBXD1-…"
					required
				/>
				<button class="button button-secondary" disabled={busy === 'restore'}>
					{m.public_restore()}
				</button>
			</div>
		</form>
	{:else}
		{@const profile = data.profile}
		<section class="row">
			<div class="label">
				<h3>{m.public_address()}</h3>
				{#if profile.pending || profile.lastError}
					<p class="hint" role="status">
						{m.public_pending()}
						{#if profile.lastError}({errorMessage(profile.lastError)}){/if}
					</p>
				{:else if profile.syncedAt}
					<p class="hint">{m.public_synced({ date: formatDate(new Date(profile.syncedAt)) })}</p>
				{/if}
			</div>
			<div class="controls">
				{#if failed('sync')}
					<FormError message={failed('sync') ?? ''} />
				{:else if done('sync')}
					<FormNotice message={m.public_sent()} />
				{/if}
				<p class="live">
					<span class="dot" class:waiting={profile.pending || profile.lastError}></span>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the profile lives on the platform -->
					<a href={profile.url} target="_blank" rel="noopener noreferrer">
						{profile.url.replace(/^https?:\/\//, '')}
						<Icon name="external" />
					</a>
				</p>
				<form method="POST" action="?/sync" use:enhance={submit('sync')}>
					<button class="button button-secondary" disabled={busy === 'sync'}>
						{m.public_send_now()}
					</button>
				</form>
			</div>
		</section>

		<form method="POST" action="?/code" class="row" use:enhance={submit('code')}>
			<div class="label">
				<h3>{m.public_code_title()}</h3>
				<p class="hint">
					{profile.accessCode
						? m.public_code_on({ code: profile.accessCode })
						: m.public_code_off()}
				</p>
			</div>
			<div class="controls">
				{#if failed('code')}<FormError message={failed('code') ?? ''} />{/if}
				<CodeInput name="accessCode" label={m.public_code_title()} />
				<div class="buttons">
					<button class="button button-primary" disabled={busy === 'code'}>
						{m.public_code_save()}
					</button>
					{#if profile.accessCode}
						<button class="button button-secondary" name="remove" value="on" formnovalidate>
							{m.public_code_remove()}
						</button>
					{/if}
				</div>
			</div>
		</form>

		<section class="row">
			<div class="label">
				<h3>{m.public_recovery()}</h3>
				<p class="hint">{m.public_recovery_hint()}</p>
			</div>
			<div class="controls">
				{#if done('rotate')}<FormNotice message={m.public_rotated()} />{/if}
				{#if failed('rotate')}<FormError message={failed('rotate') ?? ''} />{/if}
				{#if revealed || done('rotate')}
					<div class="secret">
						<input
							class="field-input mono"
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
				{/if}
				<div class="buttons">
					{#if !revealed && !done('rotate')}
						<button class="button button-secondary" type="button" onclick={() => (revealed = true)}>
							{m.public_recovery_show()}
						</button>
					{/if}
					<form method="POST" action="?/rotate" use:enhance={submit('rotate')}>
						<button
							class="button button-secondary"
							disabled={busy === 'rotate'}
							title={m.public_rotate_hint()}
						>
							{m.public_rotate_title()}
						</button>
					</form>
				</div>
			</div>
		</section>

		<section class="row">
			<div class="label">
				<h3>{m.public_delete_title()}</h3>
				<p class="hint">{m.public_delete_hint()}</p>
			</div>
			<div class="controls">
				{#if failed('disable')}<FormError message={failed('disable') ?? ''} />{/if}
				{#if confirming}
					<form method="POST" action="?/disable" class="confirm" use:enhance={submit('disable')}>
						<p>{m.public_delete_confirm()}</p>
						<div class="buttons">
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
						</div>
					</form>
				{:else}
					<button class="button button-danger" type="button" onclick={() => (confirming = true)}>
						{m.public_delete_title()}
					</button>
				{/if}
			</div>
		</section>
	{/if}
</div>

<style>
	.public {
		display: flex;
		flex-direction: column;
		max-width: var(--settings-wide);
	}

	.intro {
		padding-bottom: var(--space-6);
	}

	.lead {
		margin-bottom: var(--space-2);
		color: var(--color-text-strong);
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 16rem) minmax(0, 1fr);
		gap: var(--space-3) var(--space-8);
		padding: var(--space-6) 0;
		border-top: 1px solid var(--color-border-subtle);
	}

	.label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	h3 {
		color: var(--color-heading);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 700;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: flex-start;
	}

	.controls > .address,
	.controls > input,
	.controls > .secret {
		width: 100%;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
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
		color: var(--color-heading);
		font: inherit;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: var(--font-size-small);
	}

	.live {
		display: flex;
		gap: var(--space-2);
		align-items: center;
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
		background: var(--color-well-hover);
		color: var(--color-heading);
	}

	.confirm {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.confirm p {
		color: var(--color-text-strong);
	}

	@media (max-width: 48rem) {
		.row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
