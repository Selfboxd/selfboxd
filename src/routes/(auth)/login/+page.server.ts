import { fail, redirect } from '@sveltejs/kit';
import { safeRedirectTarget } from '#lib/server/auth/access.js';
import { formText } from '#lib/server/auth/forms.js';
import { login } from '#lib/server/auth/login.js';
import { startBrowserSession } from '#lib/server/auth/request.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const username = formText(form, 'username');
		const password = formText(form, 'password');

		const result = await login(getDatabase(), username, password);
		if (result.status === 'too_many_attempts') {
			return fail(429, { error: result.status, seconds: result.retryAfterSeconds, username });
		}
		if (result.status === 'invalid_credentials') {
			return fail(401, { error: result.status, seconds: 0, username });
		}

		startBrowserSession(event, result.user);
		redirect(303, safeRedirectTarget(event.url.searchParams.get('redirectTo')));
	}
};
