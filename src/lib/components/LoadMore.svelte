<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		/** Whether more items can be loaded. */
		more: boolean;
		loading: boolean;
		onmore: () => void;
	}

	let { more, loading, onmore }: Props = $props();

	/** Whether the end of the items is near the viewport. */
	let near = $state(false);

	$effect(() => {
		if (near && more && !loading) onmore();
	});

	const watch: Attachment<HTMLElement> = (element) => {
		const observer = new IntersectionObserver(
			(entries) => {
				near = entries.some((entry) => entry.isIntersecting);
			},
			{ rootMargin: '600px 0px' }
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			near = false;
		};
	};
</script>

{#if more}
	<div class="more" {@attach watch}>
		<button class="button button-secondary" type="button" disabled={loading} onclick={onmore}>
			{loading ? m.load_more_loading() : m.load_more()}
		</button>
	</div>
{/if}

<style>
	.more {
		display: flex;
		justify-content: center;
		margin-top: var(--space-6);
	}
</style>
