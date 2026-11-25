import { fail } from '@sveltejs/kit';
import { ratingScales } from '#lib/catalog/library.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { setRatingScale } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const value = formText(await request.formData(), 'ratingScale');
		const ratingScale = ratingScales.find((scale) => scale === value);
		if (!ratingScale) return fail(400, { error: 'invalid_request' });

		setRatingScale(getDatabase(), user.id, ratingScale);
		return { success: true };
	}
};
