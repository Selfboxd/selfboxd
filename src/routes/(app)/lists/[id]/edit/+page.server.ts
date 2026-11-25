import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { listNoteMaxLength } from '#lib/catalog/library.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseId, parseListForm } from '#lib/server/library/forms.js';
import {
	deleteList,
	getList,
	removeListItem,
	reorderList,
	setListItemNote,
	updateList
} from '#lib/server/library/lists.js';
import type { Actions, PageServerLoad } from './$types';

type ListEvent = RequestEvent<{ id: string }>;

function listId(params: { id: string }): number {
	const id = parseId(params.id);
	if (id === undefined) error(404);
	return id;
}

const notFound = () => fail(404, { error: 'list_not_found' as const });

export const load: PageServerLoad = ({ locals, params }) => {
	const { user } = requireUser(locals);
	const list = getList(getDatabase(), user.id, listId(params));
	if (!list) error(404);
	return { list };
};

export const actions: Actions = {
	save: async ({ locals, request, params }: ListEvent) => {
		const { user } = requireUser(locals);
		const parsed = parseListForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!updateList(getDatabase(), user.id, listId(params), parsed.value)) return notFound();
		return { saved: true };
	},

	delete: ({ locals, params }: ListEvent) => {
		const { user } = requireUser(locals);
		if (!deleteList(getDatabase(), user.id, listId(params))) return notFound();
		redirect(303, '/lists');
	},

	remove: async ({ locals, request, params }: ListEvent) => {
		const { user } = requireUser(locals);
		const workId = parseId(formText(await request.formData(), 'workId'));
		if (workId === undefined) return notFound();
		if (!removeListItem(getDatabase(), user.id, listId(params), workId)) return notFound();
		return { saved: false };
	},

	reorder: async ({ locals, request, params }: ListEvent) => {
		const { user } = requireUser(locals);
		const order = formText(await request.formData(), 'order')
			.split(',')
			.map(parseId);
		const workIds = order.filter((id) => id !== undefined);
		if (workIds.length !== order.length) return notFound();
		if (!reorderList(getDatabase(), user.id, listId(params), workIds)) return notFound();
		return { saved: false };
	},

	note: async ({ locals, request, params }: ListEvent) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const workId = parseId(formText(form, 'workId'));
		const note = formText(form, 'note').trim();
		if (note.length > listNoteMaxLength) return fail(400, { error: 'note_too_long' as const });
		if (workId === undefined) return notFound();
		if (!setListItemNote(getDatabase(), user.id, listId(params), workId, note)) return notFound();
		return { saved: false };
	}
};
