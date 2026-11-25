import { apiError, apiJson, readJsonObject, stringField } from '#lib/server/api/responses.js';
import { registerAccount } from '#lib/server/auth/accounts.js';
import { listUsers, toPublicUser } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user?.isAdmin) return apiError(403, 'forbidden');
	return apiJson({ accounts: listUsers(getDatabase()) });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user?.isAdmin) return apiError(403, 'forbidden');

	const body = await readJsonObject(request);
	const username = body && stringField(body, 'username');
	const password = body && stringField(body, 'password');
	if (username === undefined || password === undefined) return apiError(400, 'invalid_request');

	const result = await registerAccount(getDatabase(), username, password);
	if (!result.ok) return apiError(result.error === 'username_taken' ? 409 : 400, result.error);
	return apiJson({ account: toPublicUser(result.user) }, 201);
};
