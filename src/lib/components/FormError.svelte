<script lang="ts">
	interface Props {
		/** Text of the error. */
		message: string;
	}

	let { message }: Props = $props();
</script>

<p class="form-message form-message-error" role="alert">{message}</p>
