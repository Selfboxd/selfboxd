import { randomBytes } from 'node:crypto';
import { PLATFORM_URL } from '$app/env/private';
import { publicKeyOf, signWith } from './keys';

/** Longest time a request to the platform may take. */
const requestTimeout = 15_000;

export type PlatformAction = 'reserve' | 'publish' | 'delete' | 'rotate' | 'lookup';

/** Answer of the platform: its status and JSON body, or `unreachable` without an answer. */
export type PlatformResult =
	{ ok: true; status: number; body: unknown } | { ok: false; status: number; error: string };

/** Base address of the platform, without a trailing slash. */
export function platformUrl(): string {
	return PLATFORM_URL.replace(/\/+$/, '');
}

/** Address of a public profile on the platform. */
export function profileUrl(handle: string): string {
	return `${platformUrl()}/${handle}`;
}

async function send(
	method: string,
	path: string,
	body: string,
	headers: Record<string, string>
): Promise<PlatformResult> {
	try {
		const response = await fetch(`${platformUrl()}${path}`, {
			method,
			body,
			headers: { 'content-type': 'application/json', ...headers },
			signal: AbortSignal.timeout(requestTimeout)
		});
		const text = await response.text();
		let parsed: unknown = null;
		try {
			parsed = text ? (JSON.parse(text) as unknown) : null;
		} catch {
			parsed = null;
		}
		if (response.ok) return { ok: true, status: response.status, body: parsed };
		if (response.status >= 500) return { ok: false, status: response.status, error: 'unreachable' };
		const code =
			parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
				? parsed.error
				: 'platform_error';
		return { ok: false, status: response.status, error: code };
	} catch {
		return { ok: false, status: 0, error: 'unreachable' };
	}
}

/**
 * Sends a request signed with the key of an account: an envelope naming the action, the
 * profile, the time and a fresh nonce, signed over its exact bytes.
 */
export function signedRequest(
	seed: string,
	method: 'POST' | 'PUT' | 'DELETE',
	path: string,
	action: PlatformAction,
	handle: string | undefined,
	payload?: unknown,
	extra: (nonce: string) => Record<string, unknown> = () => ({})
): Promise<PlatformResult> {
	const nonce = randomBytes(18).toString('base64url');
	const body = JSON.stringify({
		key: publicKeyOf(seed),
		action,
		handle,
		timestamp: Date.now(),
		nonce,
		payload: payload === undefined ? undefined : { ...(payload as object), ...extra(nonce) }
	});
	return send(method, path, body, { 'x-selfboxd-signature': signWith(seed, Buffer.from(body)) });
}

/** A list as the platform shares it: TMDB identifiers and the text of the list. */
export interface ShareRequest {
	name: string;
	description: string;
	owner: string;
	ranked: boolean;
	items: { kind: 'film' | 'series'; id: number; note: string }[];
}

export function createShare(list: ShareRequest): Promise<PlatformResult> {
	return send('POST', '/api/v1/shares', JSON.stringify(list), {});
}

export function updateShare(
	code: string,
	token: string,
	list: ShareRequest
): Promise<PlatformResult> {
	return send('PUT', `/api/v1/shares/${code}`, JSON.stringify(list), {
		authorization: `Bearer ${token}`
	});
}

export function deleteShare(code: string, token: string): Promise<PlatformResult> {
	return send('DELETE', `/api/v1/shares/${code}`, '', { authorization: `Bearer ${token}` });
}
