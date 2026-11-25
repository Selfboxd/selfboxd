<script lang="ts">
	import ListsDialog from '#lib/components/library/ListsDialog.svelte';
	import LogDialog from '#lib/components/library/LogDialog.svelte';
	import { sharedDialogs } from '#lib/components/library/shared-dialogs.svelte.js';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{#if data.user}
	<SiteHeader user={data.user} />
{/if}

<div class="body">
	<main>
		{@render children()}
	</main>
</div>

{#if data.user}
	<LogDialog bind:target={sharedDialogs.log} scale={data.user.ratingScale} />
	<ListsDialog
		bind:open={
			() => sharedDialogs.lists !== null,
			(open) => {
				if (!open) sharedDialogs.lists = null;
			}
		}
		filmId={sharedDialogs.lists?.filmId ?? '0'}
		kind={sharedDialogs.lists?.kind ?? 'film'}
		lists={sharedDialogs.lists?.lists ?? []}
		member={sharedDialogs.lists?.member ?? []}
	/>
{/if}

<style>
	.body {
		position: relative;
		z-index: 0;
		flex: 1;
		background: linear-gradient(var(--color-background-raised), transparent 16rem);
	}

	.body:has(:global(.backdrop)) {
		background: none;
	}

	.body:has(:global(.journal)) {
		background: var(--color-paper);
	}

	.body:has(:global(.journal)) main {
		max-width: var(--journal-width);
	}

	main {
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-8) var(--space-4);
	}
</style>
