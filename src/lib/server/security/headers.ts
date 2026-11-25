/** Response headers applied to every response, in addition to the Content-Security-Policy. */
export const securityHeaders: Readonly<Record<string, string>> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'same-origin',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Resource-Policy': 'same-origin',
	'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
};
