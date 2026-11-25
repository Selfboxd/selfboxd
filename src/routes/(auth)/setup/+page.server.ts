import { fail, redirect } from '@sveltejs/kit';
import {
	normalizeUsername,
	validatePassword,
	validateUsername
} from '#lib/server/auth/credentials.js';
import { formText } from '#lib/server/auth/forms.js';
import { startBrowserSession } from '#lib/server/auth/request.js';
import { createFirstUser } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const username = normalizeUsername(formText(form, 'username'));
		const password = formText(form, 'password');
		const confirmation = formText(form, 'confirmation');

		const error =
			validateUsername(username) ??
			validatePassword(password) ??
			(password === confirmation ? undefined : 'password_mismatch');
		if (error) return fail(400, { error, username });

		const user = await createFirstUser(getDatabase(), { username, password });
		if (!user) redirect(303, '/login');

		startBrowserSession(event, user);
		redirect(303, '/');
	}
};
