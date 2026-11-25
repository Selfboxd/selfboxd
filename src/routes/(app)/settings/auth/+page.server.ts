import { fail, redirect } from '@sveltejs/kit';
import { resetPassword } from '#lib/server/auth/accounts.js';
import { validatePassword } from '#lib/server/auth/credentials.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { login } from '#lib/server/auth/login.js';
import { clearSessionCookie } from '#lib/server/auth/request.js';
import { listSessions, revokeSession } from '#lib/server/auth/sessions.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user, session } = requireUser(locals);
	return {
		sessions: listSessions(getDatabase(), user.id).map((entry) => ({
			id: entry.id,
			kind: entry.kind,
			label: entry.label,
			lastUsedAt: entry.lastUsedAt,
			current: entry.id === session.id
		}))
	};
};

export const actions: Actions = {
	password: async ({ locals, request }) => {
		const { user, session } = requireUser(locals);
		const form = await request.formData();
		const current = formText(form, 'current');
		const password = formText(form, 'password');
		const confirmation = formText(form, 'confirmation');

		const error =
			validatePassword(password) ?? (password === confirmation ? undefined : 'password_mismatch');
		if (error) return fail(400, { action: 'password', error, seconds: 0 });

		const db = getDatabase();
		const check = await login(db, user.username, current);
		if (check.status === 'too_many_attempts') {
			return fail(429, {
				action: 'password',
				error: check.status,
				seconds: check.retryAfterSeconds
			});
		}
		if (check.status === 'invalid_credentials') {
			return fail(400, { action: 'password', error: 'current_password_invalid', seconds: 0 });
		}

		await resetPassword(db, user.id, password, session.id);
		return { action: 'password', success: true };
	},

	revoke: async ({ locals, request, cookies }) => {
		const { user, session } = requireUser(locals);
		const form = await request.formData();
		const sessionId = Number(formText(form, 'sessionId'));

		revokeSession(getDatabase(), user.id, sessionId);
		if (sessionId === session.id) {
			clearSessionCookie(cookies);
			redirect(303, '/login');
		}
		return { action: 'revoke', success: true };
	}
};
