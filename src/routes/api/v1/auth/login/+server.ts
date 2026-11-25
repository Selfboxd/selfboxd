import { apiError, apiJson, readJsonObject, stringField } from '#lib/server/api/responses.js';
import { login } from '#lib/server/auth/login.js';
import { startDeviceSession } from '#lib/server/auth/request.js';
import { toPublicUser } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await readJsonObject(request);
	const username = body && stringField(body, 'username');
	const password = body && stringField(body, 'password');
	const deviceName = body && stringField(body, 'deviceName');
	if (!username || !password || !deviceName?.trim()) return apiError(400, 'invalid_request');

	const result = await login(getDatabase(), username, password);
	if (result.status === 'too_many_attempts') {
		const { retryAfterSeconds } = result;
		return apiError(
			429,
			'too_many_attempts',
			{ retryAfterSeconds },
			{ 'Retry-After': String(retryAfterSeconds) }
		);
	}
	if (result.status === 'invalid_credentials') return apiError(401, 'invalid_credentials');

	const token = startDeviceSession(result.user, deviceName.trim());
	return apiJson({ token, user: toPublicUser(result.user) });
};
