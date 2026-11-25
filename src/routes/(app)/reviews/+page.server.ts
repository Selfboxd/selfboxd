import { fail } from '@sveltejs/kit';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import { formFlag, parseId } from '#lib/server/library/forms.js';
import { setPinned } from '#lib/server/library/profile.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return {
		reviews: listDiaryEntries(getDatabase(), user.id).filter((entry) => entry.review !== '')
	};
};

export const actions: Actions = {
	pin: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const entryId = parseId(formText(form, 'entryId'));
		const result =
			entryId === undefined
				? 'not_found'
				: setPinned(getDatabase(), user.id, entryId, formFlag(form, 'pinned'));
		if (result === 'limit_reached') return fail(409, { error: 'pin_limit_reached' as const });
		if (result === 'not_found') return fail(404, { error: 'entry_not_found' as const });
		return { success: true };
	}
};
