import { fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { setAvatarVersion } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import { deleteAvatar, processAvatar, saveAvatar } from '#lib/server/media/avatar.js';
import { avatarsDir } from '#lib/server/paths.js';
import type { Actions } from './$types';

export const actions: Actions = {
	upload: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const file = (await request.formData()).get('avatar');
		if (!(file instanceof File)) return fail(400, { action: 'upload', error: 'image_invalid' });

		const result = await processAvatar(new Uint8Array(await file.arrayBuffer()));
		if (!result.ok) return fail(400, { action: 'upload', error: result.error });

		await saveAvatar(avatarsDir, user.id, result.image);
		setAvatarVersion(getDatabase(), user.id, Date.now());
		return { action: 'upload', success: true };
	},

	remove: async ({ locals }) => {
		const { user } = requireUser(locals);
		setAvatarVersion(getDatabase(), user.id, null);
		await deleteAvatar(avatarsDir, user.id);
		return { action: 'remove', success: true };
	}
};
