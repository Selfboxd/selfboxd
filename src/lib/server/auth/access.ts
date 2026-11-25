export interface AccessRequest {
	/** Path of the requested URL. */
	path: string;
	/** Query string of the requested URL, including the leading question mark. */
	search: string;
	/** Whether the instance already has at least one account. */
	hasUsers: boolean;
	/** Whether the request carries a valid session. */
	authenticated: boolean;
}

export type AccessDecision =
	| { type: 'allow' }
	| { type: 'redirect'; location: string }
	| { type: 'deny'; status: number; code: string };

const apiPrefix = '/api/';
const healthPath = '/api/v1/health';
const apiLoginPath = '/api/v1/auth/login';
const setupPath = '/setup';
const loginPath = '/login';
const homePath = '/';

const allow: AccessDecision = { type: 'allow' };

/** Decides whether a request may proceed, based on the state of the instance and the session. */
export function decideAccess(request: AccessRequest): AccessDecision {
	const { path } = request;
	const isApi = path.startsWith(apiPrefix);

	if (path === healthPath) return allow;

	if (!request.hasUsers) {
		if (path === setupPath) return allow;
		if (isApi) return { type: 'deny', status: 409, code: 'setup_required' };
		return { type: 'redirect', location: setupPath };
	}

	if (path === setupPath) return { type: 'redirect', location: homePath };

	if (request.authenticated) {
		return path === loginPath ? { type: 'redirect', location: homePath } : allow;
	}

	if (path === loginPath || path === apiLoginPath) return allow;
	if (isApi) return { type: 'deny', status: 401, code: 'unauthenticated' };

	const target = path + request.search;
	const location =
		target === homePath ? loginPath : `${loginPath}?redirectTo=${encodeURIComponent(target)}`;
	return { type: 'redirect', location };
}

/** Returns `target` when it is a path of this instance, and the home page otherwise. */
export function safeRedirectTarget(target: string | null): string {
	if (!target?.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
		return homePath;
	}
	return target;
}
