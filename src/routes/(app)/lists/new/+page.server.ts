import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseListForm } from '#lib/server/library/forms.js';
import { createList } from '#lib/server/library/lists.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const parsed = parseListForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const id = createList(getDatabase(), user.id, parsed.value);
		redirect(303, `/lists/${String(id)}`);
	}
};
