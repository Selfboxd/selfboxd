import { error } from '@sveltejs/kit';
import type { Session } from './sessions';
import type { PublicUser } from './users';

export interface SignedIn {
	user: PublicUser;
	session: Session;
}

/** Returns the account and session of a request, or fails with 401 for an anonymous one. */
export function requireUser(locals: App.Locals): SignedIn {
	if (!locals.user || !locals.session) error(401, 'Unauthenticated');
	return { user: locals.user, session: locals.session };
}

/** Returns the account and session of a request, or fails with 403 unless it is an administrator. */
export function requireAdmin(locals: App.Locals): SignedIn {
	const signedIn = requireUser(locals);
	if (!signedIn.user.isAdmin) error(403, 'Forbidden');
	return signedIn;
}
