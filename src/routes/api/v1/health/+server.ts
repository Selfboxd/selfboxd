import { sql } from 'drizzle-orm';
import { getDatabase } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	getDatabase().get(sql`select 1`);
	return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
};
