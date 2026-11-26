import { eq } from 'drizzle-orm';
import type { WorkKind } from '../../catalog/library';
import { serviceMax, type Service } from '../../catalog/streaming';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { getDatabase } from '../db/index';
import { users, userServices } from '../db/schema';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage, requestRegion } from '../tmdb/page';
import { getServices } from '../tmdb/service';
import { loadWorkDetails } from './resolve';

/** TMDB provider identifiers of the streaming services an account uses. */
export function listServices(db: DatabaseExecutor, userId: number): number[] {
	return db
		.select({ providerId: userServices.providerId })
		.from(userServices)
		.where(eq(userServices.userId, userId))
		.all()
		.map((row) => row.providerId);
}

/** Saves the country of an account and the streaming services it uses there. */
export function setStreaming(
	db: AppDatabase,
	userId: number,
	country: string | null,
	providerIds: number[]
): void {
	db.transaction((transaction) => {
		transaction.update(users).set({ country }).where(eq(users.id, userId)).run();
		transaction.delete(userServices).where(eq(userServices.userId, userId)).run();
		const unique = [...new Set(providerIds)].slice(0, serviceMax);
		if (unique.length > 0) {
			transaction
				.insert(userServices)
				.values(unique.map((providerId) => ({ userId, providerId })))
				.run();
		}
	});
}

/** The streaming services an account uses, named as TMDB names them in its country. */
export async function chosenServices(userId: number): Promise<Service[]> {
	const context = getTmdbContext();
	const chosen = listServices(getDatabase(), userId);
	if (!context || chosen.length === 0) return [];
	const services = await getServices(context, requestRegion(), requestLanguage());
	return services.ok ? services.value.filter((service) => chosen.includes(service.id)) : [];
}

/**
 * Identifiers of the services streaming a film or a series in the country of the request,
 * from the cached details of the work.
 */
export async function streamingOn(kind: WorkKind, id: string | number): Promise<number[]> {
	const context = getTmdbContext();
	if (!context) return [];
	const details = await loadWorkDetails(context, kind, String(id));
	return details.ok ? (details.value.watch?.stream.map((provider) => provider.id) ?? []) : [];
}
