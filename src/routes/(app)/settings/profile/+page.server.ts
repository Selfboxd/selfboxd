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
import { setAvatarVersion } from '#lib/server/auth/users.js';
import { deleteAvatar, processAvatar, saveAvatar } from '#lib/server/media/avatar.js';
import { avatarsDir } from '#lib/server/paths.js';
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

	upload: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const file = (await request.formData()).get('avatar');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { action: 'upload' as const, error: 'image_invalid' as const });
		}
		const result = await processAvatar(new Uint8Array(await file.arrayBuffer()));
		if (!result.ok) return fail(400, { action: 'upload' as const, error: result.error });
		await saveAvatar(avatarsDir, user.id, result.image);
		setAvatarVersion(getDatabase(), user.id, Date.now());
		return { action: 'upload' as const };
	},

	removeAvatar: async ({ locals }) => {
		const { user } = requireUser(locals);
		setAvatarVersion(getDatabase(), user.id, null);
		await deleteAvatar(avatarsDir, user.id);
		return { action: 'removeAvatar' as const };
	},

	removeBanner: ({ locals }) => {
		const { user } = requireUser(locals);
		setBanner(getDatabase(), user.id, null);
		return { saved: false };
	}
};
