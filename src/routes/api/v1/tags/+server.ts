import { apiError, apiJson } from '#lib/server/api/responses.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listTagNames } from '#lib/server/library/tags.js';
import type { RequestHandler } from './$types';

const kinds = ['diary', 'watchlist'] as const;

export const GET: RequestHandler = ({ locals, url }) => {
	const { user } = requireUser(locals);
	const kind = kinds.find((entry) => entry === (url.searchParams.get('kind') ?? 'diary'));
	if (!kind) return apiError(400, 'invalid_request');
	return apiJson({ tags: listTagNames(getDatabase(), user.id, kind) });
};
