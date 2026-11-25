import { sql } from 'drizzle-orm';
import { apiJson } from '#lib/server/api/responses.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	getDatabase().get(sql`select 1`);
	return apiJson({ status: 'ok' });
};
