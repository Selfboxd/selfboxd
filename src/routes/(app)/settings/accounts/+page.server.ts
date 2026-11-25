import { fail } from '@sveltejs/kit';
import { registerAccount, resetPassword } from '#lib/server/auth/accounts.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireAdmin } from '#lib/server/auth/guards.js';
import { listUsers } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals);
	return { accounts: listUsers(getDatabase()) };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const username = formText(form, 'username');

		const result = await registerAccount(getDatabase(), username, formText(form, 'password'));
		if (!result.ok) return fail(400, { action: 'create', error: result.error, username });
		return { action: 'create', success: true, username: result.user.username };
	},

	password: async ({ locals, request }) => {
		const { user, session } = requireAdmin(locals);
		const form = await request.formData();
		const userId = Number(formText(form, 'userId'));

		const result = await resetPassword(
			getDatabase(),
			userId,
			formText(form, 'password'),
			userId === user.id ? session.id : undefined
		);
		if (!result.ok) return fail(400, { action: 'password', error: result.error, username: '' });
		return { action: 'password', success: true, username: result.user.username };
	}
};
