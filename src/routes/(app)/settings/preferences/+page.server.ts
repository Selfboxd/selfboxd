import { fail } from '@sveltejs/kit';
import { ratingScales } from '#lib/catalog/library.js';
import { isCountryCode, serviceMax } from '#lib/catalog/streaming.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { setRatingScale } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listServices, setStreaming } from '#lib/server/library/services.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getRegions, getServices } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = requireUser(locals);
	const context = getTmdbContext();
	if (!context) return { streaming: null };
	const language = requestLanguage();
	const country = requestRegion();
	const [regions, services] = await Promise.all([
		getRegions(context, language),
		getServices(context, country, language)
	]);
	return {
		streaming: {
			country,
			regions: regions.ok ? regions.value : [],
			services: services.ok ? services.value : [],
			chosen: listServices(getDatabase(), user.id)
		}
	};
};

export const actions: Actions = {
	rating: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const value = formText(await request.formData(), 'ratingScale');
		const ratingScale = ratingScales.find((scale) => scale === value);
		if (!ratingScale) return fail(400, { action: 'rating' as const, error: 'invalid_request' });
		setRatingScale(getDatabase(), user.id, ratingScale);
		return { action: 'rating' as const, success: true };
	},

	country: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const country = formText(await request.formData(), 'country');
		if (!isCountryCode(country)) {
			return fail(400, { action: 'country' as const, error: 'invalid_request' });
		}
		const db = getDatabase();
		const kept = user.country === country ? listServices(db, user.id) : [];
		setStreaming(db, user.id, country, kept);
		return { action: 'country' as const, success: true };
	},

	services: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const values = (await request.formData()).getAll('service');
		const ids = values.flatMap((value) =>
			typeof value === 'string' && /^\d{1,9}$/.test(value) ? [Number(value)] : []
		);
		if (ids.length !== values.length || ids.length > serviceMax) {
			return fail(400, { action: 'services' as const, error: 'invalid_request' });
		}
		setStreaming(getDatabase(), user.id, requestRegion(), ids);
		return { action: 'services' as const, success: true };
	}
};
