/** A short confirmation shown in the corner of the screen. */
export interface Toast {
	id: number;
	message: string;
}

/** How long a toast stays on screen, in milliseconds. */
const toastLifetime = 4000;

class Toasts {
	items = $state<Toast[]>([]);
	#next = 1;

	/** Shows a confirmation in place of the previous one; it goes away on its own. */
	show(message: string) {
		const id = this.#next++;
		this.items = [{ id, message }];
		setTimeout(() => {
			this.dismiss(id);
		}, toastLifetime);
	}

	dismiss(id: number) {
		this.items = this.items.filter((item) => item.id !== id);
	}
}

/** Confirmations of the page, shown by the toaster of the root layout. */
export const toasts = new Toasts();
