<script lang="ts">
	import SetupNotice from '#lib/components/SetupNotice.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Whether the signed-in account can add the key itself. */
		isAdmin: boolean;
	}

	let { isAdmin }: Props = $props();
</script>

<SetupNotice
	{isAdmin}
	message={isAdmin ? m.tmdb_not_configured_admin() : m.tmdb_not_configured_user()}
/>
