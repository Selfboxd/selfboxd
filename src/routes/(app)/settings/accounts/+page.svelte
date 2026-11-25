<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.accounts_title()} - Selfboxd</title>
</svelte:head>

<div class="split">
	<div class="split-main">
		<section>
			<h2 class="section-title">{m.accounts_create_title()}</h2>
			<form method="POST" action="?/create" class="form" use:enhance>
				{#if form?.action === 'create' && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'create'}
					<FormNotice message={m.accounts_created({ username: form.username })} />
				{/if}
				<TextField
					name="username"
					label={m.field_username()}
					hint={m.hint_username()}
					value={form?.action === 'create' && 'error' in form ? form.username : undefined}
					autocomplete="off"
					autocapitalize="none"
				/>
				<TextField
					name="password"
					type="password"
					label={m.field_password()}
					hint={m.hint_password()}
					autocomplete="new-password"
				/>
				<button class="button button-primary">{m.accounts_create_submit()}</button>
			</form>
		</section>

		<section>
			<h2 class="section-title">{m.accounts_password_title()}</h2>
			<form method="POST" action="?/password" class="form" use:enhance>
				{#if form?.action === 'password' && 'error' in form}
					<FormError message={errorMessage(form.error)} />
				{:else if form?.action === 'password'}
					<FormNotice message={m.accounts_password_set({ username: form.username })} />
				{/if}
				<label class="field">
					<span class="field-label">{m.accounts_field_account()}</span>
					<select name="userId" class="field-input" required>
						{#each data.accounts as account (account.id)}
							<option value={account.id}>{account.username}</option>
						{/each}
					</select>
				</label>
				<TextField
					name="password"
					type="password"
					label={m.field_new_password()}
					hint={m.hint_password()}
					autocomplete="new-password"
				/>
				<button class="button button-primary">{m.accounts_password_submit()}</button>
			</form>
		</section>
	</div>

	<section>
		<h2 class="section-title">{m.accounts_title()}</h2>
		<ul class="accounts">
			{#each data.accounts as account (account.id)}
				<li>
					<span class="username">{account.username}</span>
					{#if account.isAdmin}
						<span class="role">{m.accounts_role_admin()}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.accounts {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.accounts li {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border);
	}

	.username {
		color: var(--color-heading);
		font-weight: 600;
	}

	.role {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
