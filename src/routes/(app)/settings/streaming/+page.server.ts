import { fail } from '@sveltejs/kit';
import { isCountryCode, serviceMax } from '#lib/catalog/streaming.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listServices, setStreaming } from '#lib/server/library/services.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getRegions, getServices } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = requireUser(locals);
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };
	const language = requestLanguage();
	const country = requestRegion();
	const [regions, services] = await Promise.all([
		getRegions(context, language),
		getServices(context, country, language)
	]);
	if (!regions.ok) return { state: 'error' as const, error: regions.error };
	return {
		state: 'ready' as const,
		country,
		regions: regions.value,
		services: services.ok ? services.value : [],
		chosen: listServices(getDatabase(), user.id)
	};
};

export const actions: Actions = {
	country: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const country = formText(await request.formData(), 'country');
		if (!isCountryCode(country)) return fail(400, { error: 'invalid_request' as const });
		const db = getDatabase();
		const kept = user.country === country ? listServices(db, user.id) : [];
		setStreaming(db, user.id, country, kept);
		return { success: 'country' as const };
	},

	services: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const values = (await request.formData()).getAll('service');
		const ids = values.flatMap((value) =>
			typeof value === 'string' && /^\d{1,9}$/.test(value) ? [Number(value)] : []
		);
		if (ids.length !== values.length || ids.length > serviceMax) {
			return fail(400, { error: 'invalid_request' as const });
		}
		setStreaming(getDatabase(), user.id, requestRegion(), ids);
		return { success: 'services' as const };
	}
};
