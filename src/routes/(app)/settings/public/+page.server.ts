import { fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { formText } from '#lib/server/auth/forms.js';
import { getDatabase } from '#lib/server/db/index.js';
import { recoveryKey } from '#lib/server/public/keys.js';
import { platformUrl, profileUrl } from '#lib/server/public/platform.js';
import {
	disablePublicProfile,
	enablePublicProfile,
	getPublicProfile,
	publishNow,
	replaceKey,
	restorePublicProfile,
	setAccessCode,
	suggestedHandle
} from '#lib/server/public/profile.js';
import type { Actions, PageServerLoad } from './$types';

/** Reads an optional access code sent one digit per box: four digits, or nothing. */
function readCode(form: FormData): string | null | false {
	const value = form
		.getAll('accessCode')
		.map((digit) => (typeof digit === 'string' ? digit.trim() : ''))
		.join('');
	if (value === '') return null;
	return /^\d{4}$/.test(value) ? value : false;
}

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	const row = getPublicProfile(getDatabase(), user.id);
	return {
		domain: new URL(platformUrl()).host,
		suggested: suggestedHandle(user.username),
		profile: row
			? {
					handle: row.handle,
					url: profileUrl(row.handle),
					accessCode: row.accessCode,
					pending: row.pending,
					syncedAt: row.syncedAt?.toISOString() ?? null,
					lastError: row.lastError,
					recoveryKey: recoveryKey(row.keySeed)
				}
			: null
	};
};

export const actions: Actions = {
	enable: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const handle = formText(form, 'handle').trim().toLowerCase();
		const code = readCode(form);
		if (code === false) return fail(400, { action: 'enable' as const, error: 'code_invalid' });
		if (getPublicProfile(getDatabase(), user.id)) return { action: 'enable' as const };
		const result = await enablePublicProfile(user.id, handle, code);
		if (!result.ok) return fail(400, { action: 'enable' as const, error: result.error, handle });
		return { action: 'enable' as const };
	},

	restore: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		if (getPublicProfile(getDatabase(), user.id)) return { action: 'restore' as const };
		const result = await restorePublicProfile(
			user.id,
			formText(await request.formData(), 'recovery')
		);
		if (!result.ok) return fail(400, { action: 'restore' as const, error: result.error });
		return { action: 'restore' as const };
	},

	code: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const code = form.has('remove') ? null : readCode(form);
		if (code === false || (code === null && !form.has('remove'))) {
			return fail(400, { action: 'code' as const, error: 'code_invalid' });
		}
		const result = await setAccessCode(user.id, code);
		if (!result.ok) return fail(502, { action: 'code' as const, error: result.error });
		return { action: 'code' as const };
	},

	sync: async ({ locals }) => {
		const { user } = requireUser(locals);
		const result = await publishNow(user.id);
		if (!result.ok) return fail(502, { action: 'sync' as const, error: result.error });
		return { action: 'sync' as const };
	},

	rotate: async ({ locals }) => {
		const { user } = requireUser(locals);
		const result = await replaceKey(user.id);
		if (!result.ok) return fail(502, { action: 'rotate' as const, error: result.error });
		return { action: 'rotate' as const };
	},

	disable: async ({ locals }) => {
		const { user } = requireUser(locals);
		const result = await disablePublicProfile(user.id);
		if (!result.ok) return fail(502, { action: 'disable' as const, error: result.error });
		return { action: 'disable' as const };
	}
};
