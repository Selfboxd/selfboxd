import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listWatchlist } from '#lib/server/library/watchlist.js';
import { toCsv } from '#lib/server/transfer/csv.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const { user } = requireUser(locals);
	const rows = listWatchlist(getDatabase(), user.id).map((item) => [
		item.addedAt.toISOString().slice(0, 10),
		item.work.title,
		item.work.year,
		item.work.kind,
		item.work.externalId,
		item.note,
		item.tags.join(', ')
	]);
	const body = toCsv(['Date', 'Name', 'Year', 'Type', 'TMDB ID', 'Note', 'Tags'], rows);
	return new Response(body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="watchlist.csv"',
			'cache-control': 'no-store'
		}
	});
};
