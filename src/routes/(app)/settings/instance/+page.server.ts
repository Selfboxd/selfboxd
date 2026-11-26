import { fail } from '@sveltejs/kit';
import { formText } from '#lib/server/auth/forms.js';
import { requireAdmin } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { mdblistConfig } from '#lib/server/mdblist/index.js';
import { isMdblistKeyValid } from '#lib/server/mdblist/service.js';
import {
	deleteInstanceSetting,
	getInstanceSetting,
	setInstanceSetting
} from '#lib/server/settings/instance.js';
import { tmdbConfig } from '#lib/server/tmdb/index.js';
import { isTmdbKeyValid } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

/** Setting holding the key of each service. */
const settingNames = { tmdb: 'tmdb_api_key', mdblist: 'mdblist_api_key' } as const;

/** Longest accepted key. TMDB read access tokens are a few hundred characters long. */
const keyMaxLength = 1000;

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals);
	const db = getDatabase();
	const keys = (['tmdb', 'mdblist'] as const).filter(
		(id) => getInstanceSetting(db, settingNames[id]) !== undefined
	);
	return { keys: keys.map((id) => ({ id })) };
};

export const actions: Actions = {
	tmdb: async ({ locals, request }) => {
		requireAdmin(locals);
		const key = formText(await request.formData(), 'key').trim();

		const wellFormed = key.length > 0 && key.length <= keyMaxLength && !/\s/.test(key);
		if (!wellFormed || !(await isTmdbKeyValid(tmdbConfig(key)))) {
			return fail(400, { action: 'tmdb' as const, error: 'tmdb_key_invalid' as const });
		}

		setInstanceSetting(getDatabase(), 'tmdb_api_key', key);
		return { action: 'tmdb' as const, success: true };
	},

	mdblist: async ({ locals, request }) => {
		requireAdmin(locals);
		const key = formText(await request.formData(), 'key').trim();

		const wellFormed = key.length > 0 && key.length <= keyMaxLength && !/\s/.test(key);
		if (!wellFormed || !(await isMdblistKeyValid(mdblistConfig(key)))) {
			return fail(400, { action: 'mdblist' as const, error: 'mdblist_key_invalid' as const });
		}

		setInstanceSetting(getDatabase(), 'mdblist_api_key', key);
		return { action: 'mdblist' as const, success: true };
	},

	remove: async ({ locals, request }) => {
		requireAdmin(locals);
		const id = formText(await request.formData(), 'key');
		if (id !== 'tmdb' && id !== 'mdblist') return fail(400, { action: 'remove' as const });
		deleteInstanceSetting(getDatabase(), settingNames[id]);
		return { action: 'remove' as const, success: true };
	}
};
