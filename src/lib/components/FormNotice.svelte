<script lang="ts">
	import { page } from '$app/state';
	import { toasts } from '#lib/components/toast/toasts.svelte.js';

	interface Props {
		/** Text of the confirmation, shown as a toast each time the form succeeds. */
		message: string;
	}

	let { message }: Props = $props();

	$effect(() => {
		if (page.form !== undefined) toasts.show(message);
	});
</script>

<noscript><p class="form-message form-message-success">{message}</p></noscript>
