<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PublicUser } from '#lib/server/auth/users.js';

	interface Props {
		/** The signed-in account. */
		user: PublicUser;
	}

	let { user }: Props = $props();
</script>

<header>
	<div class="bar">
		<a class="wordmark" href={resolve('/(app)')}>Selfboxd</a>
		<nav aria-label={m.nav_label()}>
			<span class="username">{user.username}</span>
			<a href={resolve('/(app)/settings')}>{m.nav_settings()}</a>
			<form method="POST" action={resolve('/(app)/logout')}>
				<button>{m.nav_sign_out()}</button>
			</form>
		</nav>
	</div>
</header>

<style>
	header {
		background: var(--color-header);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: center;
		justify-content: space-between;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-4);
	}

	.wordmark {
		color: var(--color-heading);
		font-size: var(--font-size-large);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.wordmark:hover {
		text-decoration: none;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: center;
	}

	nav a,
	nav button,
	.username {
		color: var(--color-text);
		font-size: var(--font-size-small);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.username {
		color: var(--color-text-muted);
	}

	nav button {
		padding: 0;
		border: 0;
		background: none;
		font-family: inherit;
		cursor: pointer;
	}

	nav a:hover,
	nav button:hover {
		color: var(--color-heading);
		text-decoration: none;
	}
</style>
