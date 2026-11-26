import { SvelteMap } from 'svelte/reactivity';
import type { WorkKind, WorkState } from '#lib/catalog/library.js';

/** What the quick actions of a poster know about its work. */
export interface PosterStatus {
	state: WorkState;
	listMembership: number[];
}

interface StatesResponse {
	states: Record<string, PosterStatus>;
	lists: { id: number; name: string }[];
}

/** Works asked in one request, the limit of the API. */
const batchSize = 100;
/** Time left for other posters to join a request, in milliseconds. */
const gatherDelay = 30;

/** States of the works whose posters are on the page, loaded in batches before any hover. */
class PosterStates {
	readonly statuses = new SvelteMap<string, PosterStatus>();
	lists = $state<{ id: number; name: string }[]>([]);
	/** Bumped when every known state may be out of date, so that posters ask again. */
	generation = $state(0);
	#queued = new Set<string>();
	#asked = new Set<string>();
	#waiting = new Map<string, (() => void)[]>();
	#timer: ReturnType<typeof setTimeout> | undefined;

	key(kind: WorkKind, id: number | string): string {
		return `${kind}:${String(id)}`;
	}

	/** Asks for the state of a work, gathered with the others asked at the same time. */
	want(key: string): void {
		if (this.#asked.has(key) || this.#queued.has(key)) return;
		this.#queued.add(key);
		if (this.#timer === undefined) this.#timer = setTimeout(() => void this.#flush(), gatherDelay);
	}

	/** Resolves once the state of a work is known, or its request failed. */
	ready(key: string): Promise<void> {
		if (this.statuses.has(key)) return Promise.resolve();
		this.#asked.delete(key);
		this.want(key);
		return new Promise((done) => {
			this.#waiting.set(key, [...(this.#waiting.get(key) ?? []), done]);
		});
	}

	/** Forgets every state, after the library changed or the page was loaded again. */
	reset(): void {
		this.statuses.clear();
		this.#asked.clear();
		this.generation++;
	}

	set(key: string, status: PosterStatus): void {
		this.statuses.set(key, status);
	}

	async #flush(): Promise<void> {
		this.#timer = undefined;
		const keys = [...this.#queued];
		this.#queued.clear();
		for (let start = 0; start < keys.length; start += batchSize) {
			const batch = keys.slice(start, start + batchSize);
			for (const key of batch) this.#asked.add(key);
			try {
				const response = await fetch(`/api/v1/states?works=${batch.join(',')}`);
				if (response.ok) {
					const body = (await response.json()) as StatesResponse;
					this.lists = body.lists;
					for (const [key, status] of Object.entries(body.states)) this.statuses.set(key, status);
				} else {
					for (const key of batch) this.#asked.delete(key);
				}
			} catch {
				for (const key of batch) this.#asked.delete(key);
			}
			for (const key of batch) {
				for (const done of this.#waiting.get(key) ?? []) done();
				this.#waiting.delete(key);
			}
		}
	}
}

export const posterStates = new PosterStates();
