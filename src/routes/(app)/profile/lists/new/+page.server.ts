import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseListForm } from '#lib/server/library/forms.js';
import { createList } from '#lib/server/library/lists.js';
import { listTagNames } from '#lib/server/library/tags.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return { knownTags: listTagNames(getDatabase(), user.id, 'list') };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const parsed = parseListForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const id = createList(getDatabase(), user.id, parsed.value);
		redirect(303, `/profile/lists/${String(id)}`);
	}
};
