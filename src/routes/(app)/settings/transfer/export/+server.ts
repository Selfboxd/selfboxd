import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { buildAccountExport } from '#lib/server/transfer/export.js';
import { writeZip } from '#lib/server/transfer/zip.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const { user } = requireUser(locals);
	const archive = writeZip(buildAccountExport(getDatabase(), user.id));
	const day = new Date().toISOString().slice(0, 10);
	return new Response(new Blob([archive.slice()]), {
		headers: {
			'content-type': 'application/zip',
			'content-disposition': `attachment; filename="selfboxd-${user.username}-${day}.zip"`,
			'cache-control': 'no-store'
		}
	});
};
