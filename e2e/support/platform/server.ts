import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

/** A fake Selfboxd platform: it checks signatures like the real one and keeps what it receives. */

const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');

interface Profile {
	handle: string;
	key: string;
	payload: unknown;
	publishes: number;
}

interface Share {
	code: string;
	token: string;
	list: unknown;
}

const profiles = new Map<string, Profile>();
const shares = new Map<string, Share>();
const nonces = new Set<string>();

/** Profiles whose requests the platform answers with 503, as if it were unreachable. */
const offline = new Set<string>();

function verified(key: string, body: Buffer, signature: string): boolean {
	try {
		const publicKey = createPublicKey({
			key: Buffer.concat([spkiPrefix, Buffer.from(key, 'base64url')]),
			format: 'der',
			type: 'spki'
		});
		return verify(null, body, publicKey, Buffer.from(signature, 'base64url'));
	} catch {
		return false;
	}
}

function send(response: ServerResponse, status: number, body?: unknown) {
	response.writeHead(status, { 'content-type': 'application/json' });
	response.end(body === undefined ? '' : JSON.stringify(body));
}

async function read(request: IncomingMessage): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks);
}

interface Envelope {
	key: string;
	action: string;
	handle?: string;
	timestamp: number;
	nonce: string;
	payload?: Record<string, unknown>;
}

/** Opens a signed request, checked against `signer` or the key it names. */
function open(body: Buffer, signature: string, action: string, signer?: string): Envelope | number {
	let envelope: Envelope;
	try {
		envelope = JSON.parse(body.toString('utf8')) as Envelope;
	} catch {
		return 400;
	}
	if (envelope.action !== action) return 400;
	if (!verified(signer ?? envelope.key, body, signature)) return 401;
	if (Math.abs(Date.now() - envelope.timestamp) > 300_000) return 401;
	if (nonces.has(envelope.nonce)) return 409;
	nonces.add(envelope.nonce);
	return envelope;
}

const server = createServer((request, response) => {
	void (async () => {
		const url = new URL(request.url ?? '/', 'http://localhost');
		const path = url.pathname;
		const body = await read(request);
		const signature = String(request.headers['x-selfboxd-signature'] ?? '');

		if (path === '/__offline') {
			const handle = url.searchParams.get('handle') ?? '';
			if (url.searchParams.get('value') === 'true') offline.add(handle);
			else offline.delete(handle);
			send(response, 200, {});
			return;
		}
		const inspected = /^\/__profiles\/([a-z0-9_]+)$/.exec(path);
		if (inspected) {
			const profile = profiles.get(inspected[1] ?? '');
			send(response, profile ? 200 : 404, profile ?? {});
			return;
		}
		const inspectedShare = /^\/__shares\/([A-Za-z0-9]+)$/.exec(path);
		if (inspectedShare) {
			const share = shares.get(inspectedShare[1] ?? '');
			send(response, share ? 200 : 404, share?.list ?? {});
			return;
		}
		if (path === '/api/v1/profiles' && request.method === 'POST') {
			const envelope = open(body, signature, 'reserve');
			if (typeof envelope === 'number') {
				send(response, envelope, { error: 'refused' });
				return;
			}
			const handle = envelope.handle ?? '';
			if (!/^[a-z0-9_]{2,30}$/.test(handle) || handle === 'share') {
				send(response, 400, { error: 'handle_invalid' });
				return;
			}
			if (profiles.has(handle)) {
				send(response, 409, { error: 'handle_taken' });
				return;
			}
			profiles.set(handle, { handle, key: envelope.key, payload: null, publishes: 0 });
			send(response, 201, { handle });
			return;
		}
		if (path === '/api/v1/profiles/lookup' && request.method === 'POST') {
			const envelope = open(body, signature, 'lookup');
			if (typeof envelope === 'number') {
				send(response, envelope, { error: 'refused' });
				return;
			}
			const found = [...profiles.values()].find((profile) => profile.key === envelope.key);
			if (found) send(response, 200, { handle: found.handle });
			else send(response, 404, { error: 'not_found' });
			return;
		}
		const profilePath = /^\/api\/v1\/profiles\/([a-z0-9_]+)(\/key)?$/.exec(path);
		if (profilePath && offline.has(profilePath[1] ?? '')) {
			send(response, 503, { error: 'unavailable' });
			return;
		}
		if (profilePath) {
			const profile = profiles.get(profilePath[1] ?? '');
			if (!profile) {
				send(response, 404, { error: 'not_found' });
				return;
			}
			const action = profilePath[2] ? 'rotate' : request.method === 'DELETE' ? 'delete' : 'publish';
			const envelope = open(body, signature, action, profile.key);
			if (typeof envelope === 'number') {
				send(response, envelope, { error: 'refused' });
				return;
			}
			if (action === 'publish') {
				profile.payload = envelope.payload;
				profile.publishes += 1;
			} else if (action === 'delete') {
				profiles.delete(profile.handle);
			} else {
				const next = typeof envelope.payload?.key === 'string' ? envelope.payload.key : '';
				const proof = typeof envelope.payload?.proof === 'string' ? envelope.payload.proof : '';
				if (!verified(next, Buffer.from(envelope.nonce), proof)) {
					send(response, 400, { error: 'invalid_request' });
					return;
				}
				profile.key = next;
			}
			send(response, 204);
			return;
		}
		if (path === '/api/v1/shares' && request.method === 'POST') {
			const code = randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 6);
			const token = randomBytes(24).toString('base64url');
			shares.set(code, { code, token, list: JSON.parse(body.toString('utf8')) as unknown });
			send(response, 201, {
				code,
				url: `http://sbxd.test/share/${code}`,
				manageToken: token
			});
			return;
		}
		const sharePath = /^\/api\/v1\/shares\/([A-Za-z0-9]+)$/.exec(path);
		if (sharePath) {
			const share = shares.get(sharePath[1] ?? '');
			if (!share || request.headers.authorization !== `Bearer ${share.token}`) {
				send(response, 404, { error: 'not_found' });
				return;
			}
			if (request.method === 'DELETE') {
				shares.delete(share.code);
				send(response, 204);
				return;
			}
			share.list = JSON.parse(body.toString('utf8')) as unknown;
			send(response, 200, { code: share.code, url: `http://sbxd.test/share/${share.code}` });
			return;
		}
		send(response, 404, { error: 'not_found' });
	})();
});

server.listen(Number(process.env.PORT));
