import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/index';
import { publicProfiles } from '../db/schema';
import { publishNow } from './profile';

/** Wait after a change before sending, so that a burst of changes is sent once. */
const settleDelay = 500;

/** Waits between attempts while the platform cannot be reached, in milliseconds. */
const retryDelays = [5_000, 30_000, 120_000, 600_000, 1_800_000];

const timers = new Map<number, NodeJS.Timeout>();
const failures = new Map<number, number>();
const running = new Set<number>();

function schedule(userId: number, delay: number): void {
	clearTimeout(timers.get(userId));
	const timer = setTimeout(() => void run(userId), delay);
	timer.unref();
	timers.set(userId, timer);
}

async function run(userId: number): Promise<void> {
	timers.delete(userId);
	if (running.has(userId)) {
		schedule(userId, settleDelay);
		return;
	}
	running.add(userId);
	try {
		const result = await publishNow(userId);
		if (result.ok || result.error === 'not_found') {
			failures.delete(userId);
		} else {
			const count = (failures.get(userId) ?? 0) + 1;
			failures.set(userId, count);
			schedule(userId, retryDelays[Math.min(count, retryDelays.length) - 1] ?? settleDelay);
		}
	} finally {
		running.delete(userId);
	}
}

/**
 * Records that something of an account changed: when the account has a public profile, the
 * copy is sent to the platform right away, and again later while the platform is unreachable.
 */
export function profileChanged(userId: number): void {
	const db = getDatabase();
	const updated = db
		.update(publicProfiles)
		.set({ pending: true })
		.where(eq(publicProfiles.userId, userId))
		.run();
	if (updated.changes === 0) return;
	failures.delete(userId);
	schedule(userId, settleDelay);
}

/** Sends the profiles whose changes were not sent before the instance stopped. */
export function resumePendingProfiles(): void {
	const pending = getDatabase()
		.select({ userId: publicProfiles.userId })
		.from(publicProfiles)
		.where(eq(publicProfiles.pending, true))
		.all();
	for (const { userId } of pending) schedule(userId, settleDelay);
}
