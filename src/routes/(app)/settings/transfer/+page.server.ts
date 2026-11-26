import { fail } from '@sveltejs/kit';
import { defaultImportChoices, type ImportChoices } from '#lib/server/transfer/importer.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { formText } from '#lib/server/auth/forms.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import {
	closeImport,
	confirmImport,
	importStatus,
	startImport
} from '#lib/server/transfer/jobs.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return { status: importStatus(user.id), hasTmdb: getTmdbContext() !== undefined };
};

function choice<T extends string>(
	form: FormData,
	name: string,
	values: readonly T[],
	fallback: T
): T {
	const value = formText(form, name);
	return values.find((entry) => entry === value) ?? fallback;
}

export const actions: Actions = {
	upload: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const context = getTmdbContext();
		if (!context) return fail(503, { error: 'tmdb_not_configured' as const });
		const file = (await request.formData()).get('archive');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'import_invalid' as const });
		}
		const started = startImport(
			user.id,
			new Uint8Array(await file.arrayBuffer()),
			context,
			requestLanguage()
		);
		return started.ok ? { started: true } : fail(400, { error: started.error });
	},

	confirm: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const choices: ImportChoices = {
			duplicates: choice(form, 'duplicates', ['skip', 'add'], defaultImportChoices.duplicates),
			ratings: choice(form, 'ratings', ['keep', 'replace'], defaultImportChoices.ratings),
			profile: choice(form, 'profile', ['keep', 'replace'], defaultImportChoices.profile),
			favourites: choice(form, 'favourites', ['keep', 'replace'], defaultImportChoices.favourites),
			lists: choice(form, 'lists', ['merge', 'copy', 'skip'], defaultImportChoices.lists),
			ranked: formText(form, 'ranked') === 'on'
		};
		const summary = confirmImport(user.id, choices);
		return summary ? { imported: true } : fail(409, { error: 'import_not_ready' as const });
	},

	close: ({ locals }) => {
		const { user } = requireUser(locals);
		closeImport(user.id);
		return { closed: true };
	}
};
