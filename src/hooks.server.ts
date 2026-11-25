import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { apiError } from '#lib/server/api/responses.js';
import { decideAccess } from '#lib/server/auth/access.js';
import { instanceHasUsers } from '#lib/server/auth/instance.js';
import { readSessionToken } from '#lib/server/auth/request.js';
import { deleteExpiredSessions, findSession } from '#lib/server/auth/sessions.js';
import { toPublicUser } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import { securityHeaders } from '#lib/server/security/headers.js';

export const init: ServerInit = () => {
	deleteExpiredSessions(getDatabase());
};

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	return response;
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

const handleAuth: Handle = ({ event, resolve }) => {
	const db = getDatabase();
	const token = readSessionToken(event);
	const authenticated = token ? findSession(db, token) : undefined;
	event.locals.user = authenticated ? toPublicUser(authenticated.user) : null;
	event.locals.session = authenticated?.session ?? null;

	const decision = decideAccess({
		path: event.url.pathname,
		search: event.url.search,
		hasUsers: instanceHasUsers(db),
		authenticated: authenticated !== undefined
	});
	if (decision.type === 'redirect') redirect(303, decision.location);
	if (decision.type === 'deny') return apiError(decision.status, decision.code);

	return resolve(event);
};

export const handle: Handle = sequence(handleSecurityHeaders, handleParaglide, handleAuth);
