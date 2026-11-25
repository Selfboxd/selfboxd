import { error } from '@sveltejs/kit';
import { avatarContentType, readAvatar } from '#lib/server/media/avatar.js';
import { avatarsDir } from '#lib/server/paths.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!/^\d{1,10}$/.test(params.id)) error(404);
	const image = await readAvatar(avatarsDir, Number(params.id));
	if (!image) error(404);

	return new Response(new Uint8Array(image), {
		headers: {
			'Content-Type': avatarContentType,
			'Cache-Control': 'private, max-age=31536000, immutable'
		}
	});
};
