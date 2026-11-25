import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '#lib/server/auth/request.js';
import { revokeSession } from '#lib/server/auth/sessions.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => redirect(303, '/');

export const POST: RequestHandler = ({ locals, cookies }) => {
	if (locals.session) revokeSession(getDatabase(), locals.session.userId, locals.session.id);
	clearSessionCookie(cookies);
	redirect(303, '/login');
};
