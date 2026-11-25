import { fail } from '@sveltejs/kit';
import { formText } from '#lib/server/auth/forms.js';
import { requireAdmin } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { getInstanceSetting, setInstanceSetting } from '#lib/server/settings/instance.js';
import { tmdbConfig } from '#lib/server/tmdb/index.js';
import { isTmdbKeyValid } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

/** Longest accepted key. TMDB read access tokens are a few hundred characters long. */
const keyMaxLength = 1000;

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals);
	return { tmdbConfigured: getInstanceSetting(getDatabase(), 'tmdb_api_key') !== undefined };
};

export const actions: Actions = {
	tmdb: async ({ locals, request }) => {
		requireAdmin(locals);
		const key = formText(await request.formData(), 'key').trim();

		const wellFormed = key.length > 0 && key.length <= keyMaxLength && !/\s/.test(key);
		if (!wellFormed || !(await isTmdbKeyValid(tmdbConfig(key)))) {
			return fail(400, { error: 'tmdb_key_invalid' });
		}

		setInstanceSetting(getDatabase(), 'tmdb_api_key', key);
		return { success: true };
	}
};
