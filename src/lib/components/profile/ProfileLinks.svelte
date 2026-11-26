<script lang="ts">
	import type { ProfileLinks } from '#lib/catalog/library.js';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		links: ProfileLinks;
	}

	let { links }: Props = $props();

	const host = $derived.by(() => {
		try {
			return new URL(links.website).hostname.replace(/^www\./, '');
		} catch {
			return links.website;
		}
	});
</script>

{#if links.website || links.instagram || links.x || links.discord}
	<ul class="links">
		{#if links.website}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an address the account entered -->
				<a href={links.website} target="_blank" rel="noopener noreferrer nofollow">
					<Icon name="link" />{host}
				</a>
			</li>
		{/if}
		{#if links.instagram}
			<li>
				<a
					href="https://www.instagram.com/{links.instagram}/"
					target="_blank"
					rel="noopener noreferrer nofollow"
					title="Instagram"
				>
					<Icon name="instagram" />{links.instagram}
				</a>
			</li>
		{/if}
		{#if links.x}
			<li>
				<a
					href="https://x.com/{links.x}"
					target="_blank"
					rel="noopener noreferrer nofollow"
					title="X"
				>
					<Icon name="x" />{links.x}
				</a>
			</li>
		{/if}
		{#if links.discord}
			<li>
				<span title="Discord"><Icon name="discord" />{links.discord}</span>
			</li>
		{/if}
	</ul>
{/if}

<style>
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: var(--space-2) 0 0;
		padding: 0;
		list-style: none;
		font-size: var(--font-size-small);
	}

	a,
	span {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
		color: var(--color-text);
	}

	a:hover {
		color: var(--color-link-hover);
	}
</style>
