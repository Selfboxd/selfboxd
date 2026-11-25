import { describe, expect, it } from 'vitest';
import { decideAccess, safeRedirectTarget, type AccessRequest } from './access';

function request(overrides: Partial<AccessRequest>): AccessRequest {
	return { path: '/', search: '', hasUsers: true, authenticated: false, ...overrides };
}

describe('decideAccess', () => {
	describe('on a new instance', () => {
		it('sends every page to the setup screen', () => {
			expect(decideAccess(request({ hasUsers: false, path: '/settings' }))).toEqual({
				type: 'redirect',
				location: '/setup'
			});
		});

		it('allows the setup screen', () => {
			expect(decideAccess(request({ hasUsers: false, path: '/setup' }))).toEqual({
				type: 'allow'
			});
		});

		it('refuses API calls', () => {
			expect(decideAccess(request({ hasUsers: false, path: '/api/v1/auth/login' }))).toEqual({
				type: 'deny',
				status: 409,
				code: 'setup_required'
			});
		});
	});

	describe('once an account exists', () => {
		it('closes the setup screen, signed in or not', () => {
			for (const authenticated of [true, false]) {
				expect(decideAccess(request({ path: '/setup', authenticated }))).toEqual({
					type: 'redirect',
					location: '/'
				});
			}
		});

		it('sends an anonymous visitor to the sign-in page', () => {
			expect(decideAccess(request({ path: '/' }))).toEqual({
				type: 'redirect',
				location: '/login'
			});
		});

		it('remembers the page an anonymous visitor asked for', () => {
			expect(decideAccess(request({ path: '/settings/auth', search: '?tab=1' }))).toEqual({
				type: 'redirect',
				location: '/login?redirectTo=%2Fsettings%2Fauth%3Ftab%3D1'
			});
		});

		it('allows an anonymous visitor to sign in', () => {
			for (const path of ['/login', '/api/v1/auth/login']) {
				expect(decideAccess(request({ path }))).toEqual({ type: 'allow' });
			}
		});

		it('refuses anonymous API calls', () => {
			expect(decideAccess(request({ path: '/api/v1/accounts' }))).toEqual({
				type: 'deny',
				status: 401,
				code: 'unauthenticated'
			});
		});

		it('allows a signed-in account everywhere', () => {
			for (const path of ['/', '/settings/auth', '/api/v1/accounts']) {
				expect(decideAccess(request({ path, authenticated: true }))).toEqual({ type: 'allow' });
			}
		});

		it('sends a signed-in account away from the sign-in page', () => {
			expect(decideAccess(request({ path: '/login', authenticated: true }))).toEqual({
				type: 'redirect',
				location: '/'
			});
		});
	});

	it('always allows the health check', () => {
		for (const hasUsers of [true, false]) {
			expect(decideAccess(request({ path: '/api/v1/health', hasUsers }))).toEqual({
				type: 'allow'
			});
		}
	});
});

describe('safeRedirectTarget', () => {
	it('keeps a path of the instance', () => {
		expect(safeRedirectTarget('/settings/auth?tab=1')).toBe('/settings/auth?tab=1');
	});

	it.each([
		null,
		'',
		'https://attacker.example',
		'//attacker.example',
		'/\\attacker.example',
		'settings'
	])('falls back to the home page for %s', (target) => {
		expect(safeRedirectTarget(target)).toBe('/');
	});
});
