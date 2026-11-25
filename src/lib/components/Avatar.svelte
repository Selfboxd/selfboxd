<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PublicUser } from '#lib/server/auth/users.js';

	interface Props {
		/** The account whose picture is shown. */
		user: PublicUser;
		/** Rendered size of the picture. */
		size?: 'small' | 'large';
	}

	let { user, size = 'small' }: Props = $props();

	const source = $derived(
		user.avatarVersion === null
			? undefined
			: `${resolve('/(app)/avatars/[id]', { id: String(user.id) })}?v=${String(user.avatarVersion)}`
	);
</script>

{#if source}
	<img class="avatar" class:large={size === 'large'} src={source} alt="" />
{:else}
	<svg class="avatar" class:large={size === 'large'} viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="12" cy="9.5" r="4.5" />
		<path d="M3 24c0-5.5 4-9 9-9s9 3.500 9 9z" />
	</svg>
{/if}

<style>
	.avatar {
		display: block;
		flex-shrink: 0;
		width: var(--avatar-small);
		height: var(--avatar-small);
		border-radius: 50%;
		background: var(--color-surface-raised);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 20%);
		fill: var(--color-text);
		object-fit: cover;
	}

	.large {
		width: var(--avatar-large);
		height: var(--avatar-large);
	}
</style>
