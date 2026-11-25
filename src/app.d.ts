import type { Session } from '#lib/server/auth/sessions.js';
import type { PublicUser } from '#lib/server/auth/users.js';

declare global {
	namespace App {
		interface Locals {
			/** The signed-in account, or `null` for an anonymous request. */
			user: PublicUser | null;
			/** The session that authenticated the request, or `null` for an anonymous request. */
			session: Session | null;
		}
	}
}

export {};
