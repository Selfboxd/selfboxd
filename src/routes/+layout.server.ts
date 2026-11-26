import type { ImageChoices } from '#lib/catalog/images.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listImageChoices } from '#lib/server/library/images.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('app:images');
	const images: ImageChoices = locals.user ? listImageChoices(getDatabase(), locals.user.id) : {};
	return { user: locals.user, images };
};
