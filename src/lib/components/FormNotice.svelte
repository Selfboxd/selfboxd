<script lang="ts">
	interface Props {
		/** Text of the confirmation. */
		message: string;
	}

	let { message }: Props = $props();
</script>

<p class="form-message form-message-success" role="status">{message}</p>
