import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { instanceSettings } from '../db/schema';

/** Names of the settings shared by every account of the instance. */
export type InstanceSettingKey = 'tmdb_api_key';

export function getInstanceSetting(db: AppDatabase, key: InstanceSettingKey): string | undefined {
	return db.select().from(instanceSettings).where(eq(instanceSettings.key, key)).get()?.value;
}

export function setInstanceSetting(db: AppDatabase, key: InstanceSettingKey, value: string): void {
	db.insert(instanceSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: instanceSettings.key, set: { value } })
		.run();
}
