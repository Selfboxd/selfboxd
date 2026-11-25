import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { getDatabase } from '../db/index';
import { createSession, type SessionKind } from './sessions';
import type { User } from './users';

const cookieName = 'selfboxd_session';
const cookieMaxAge = 400 * 24 * 60 * 60;
const bearerPrefix = 'Bearer ';

/** Reads the session token of a request, from the Authorization header or the cookie. */
export function readSessionToken(event: RequestEvent): string | undefined {
	const authorization = event.request.headers.get('authorization');
	if (authorization?.startsWith(bearerPrefix)) return authorization.slice(bearerPrefix.length);
	return event.cookies.get(cookieName);
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(cookieName, { path: '/' });
}

/** Opens a browser session for the account and stores its token in a cookie. */
export function startBrowserSession(event: RequestEvent, user: User): void {
	const label = event.request.headers.get('user-agent') ?? '';
	const { token } = createSession(getDatabase(), { userId: user.id, kind: 'browser', label });
	event.cookies.set(cookieName, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: cookieMaxAge
	});
}

/** Opens a session for a client that keeps the token itself, such as the mobile application. */
export function startDeviceSession(user: User, label: string): string {
	const kind: SessionKind = 'device';
	return createSession(getDatabase(), { userId: user.id, kind, label }).token;
}
