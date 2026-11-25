import { fail } from '@sveltejs/kit';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseProfileForm } from '#lib/server/library/forms.js';
import {
	clearFavourite,
	getProfile,
	listFavourites,
	setBanner,
	setFavourite,
	updateProfile
} from '#lib/server/library/profile.js';
import { resolveFilm } from '#lib/server/library/resolve.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	const db = getDatabase();
	return { profile: getProfile(db, user.id), favourites: listFavourites(db, user.id) };
};

const invalid = () => fail(400, { error: 'invalid_request' as const });

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const parsed = parseProfileForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		updateProfile(getDatabase(), user.id, parsed.value);
		return { saved: true };
	},

	favourite: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const slot = Number(formText(form, 'slot'));
		const { work } = await resolveFilm(formText(form, 'filmId'));
		if (!setFavourite(getDatabase(), user.id, slot, work.id)) return invalid();
		return { saved: false };
	},

	unfavourite: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const slot = Number(formText(await request.formData(), 'slot'));
		if (!Number.isInteger(slot)) return invalid();
		clearFavourite(getDatabase(), user.id, slot);
		return { saved: false };
	},

	banner: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const { film } = await resolveFilm(formText(await request.formData(), 'filmId'));
		if (!film.backdropPath) return fail(400, { error: 'banner_unavailable' as const });
		setBanner(getDatabase(), user.id, film.backdropPath);
		return { saved: false };
	},

	removeBanner: ({ locals }) => {
		const { user } = requireUser(locals);
		setBanner(getDatabase(), user.id, null);
		return { saved: false };
	}
};
