<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.settings_title()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<section class="split-main">
		<h2 class="section-title">{m.auth_password_title()}</h2>
		<form method="POST" action="?/password" class="form" use:enhance>
			{#if form?.action === 'password' && 'error' in form}
				<FormError message={errorMessage(form.error, form.seconds)} />
			{:else if form?.action === 'password'}
				<FormNotice message={m.auth_password_changed()} />
			{/if}
			<TextField
				name="current"
				type="password"
				label={m.field_current_password()}
				autocomplete="current-password"
			/>
			<TextField
				name="password"
				type="password"
				label={m.field_new_password()}
				hint={m.hint_password()}
				autocomplete="new-password"
			/>
			<TextField
				name="confirmation"
				type="password"
				label={m.field_password_confirm()}
				autocomplete="new-password"
			/>
			<button class="button button-primary">{m.auth_password_submit()}</button>
		</form>
	</section>

	<section>
		<h2 class="section-title">{m.auth_sessions_title()}</h2>
		<p class="intro">{m.auth_sessions_intro()}</p>
		<ul class="sessions">
			{#each data.sessions as session (session.id)}
				<li>
					<div class="session">
						<span class="session-kind">
							{session.kind === 'device' ? m.session_kind_device() : m.session_kind_browser()}
							{#if session.current}
								<span class="badge">{m.session_current()}</span>
							{/if}
						</span>
						<span class="session-label">{session.label}</span>
						<span class="session-date">
							{m.session_last_used({ date: formatDate(session.lastUsedAt) })}
						</span>
					</div>
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="sessionId" value={session.id} />
						<button class="button button-secondary">{m.session_revoke()}</button>
					</form>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.intro {
		margin-bottom: var(--space-4);
		color: var(--color-text-muted);
	}

	.sessions {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.sessions li {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border);
	}

	.session {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: var(--space-1);
	}

	.session-kind {
		color: var(--color-heading);
		font-weight: 600;
	}

	.session-label {
		overflow: hidden;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.session-date {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.badge {
		margin-inline-start: var(--space-2);
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-size: var(--font-size-small);
		font-weight: 700;
	}
</style>
