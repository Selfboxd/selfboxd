const noStore = { 'Cache-Control': 'no-store' };

/** Builds a JSON response that is never cached. */
export function apiJson(body: unknown, status = 200, headers: Record<string, string> = {}) {
	return Response.json(body, { status, headers: { ...noStore, ...headers } });
}

/** Builds the JSON error response shared by every endpoint. */
export function apiError(
	status: number,
	code: string,
	details: Record<string, unknown> = {},
	headers: Record<string, string> = {}
) {
	return apiJson({ error: code, ...details }, status, headers);
}

/** Parses a JSON object body. Returns `undefined` for anything else. */
export async function readJsonObject(
	request: Request
): Promise<Record<string, unknown> | undefined> {
	try {
		const body: unknown = await request.json();
		if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
		return body as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

/** Returns the property when it is a string, and `undefined` otherwise. */
export function stringField(body: Record<string, unknown>, name: string): string | undefined {
	const value = body[name];
	return typeof value === 'string' ? value : undefined;
}
