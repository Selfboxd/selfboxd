import { fail, type RequestEvent } from '@sveltejs/kit';
import { formText } from '../auth/forms';
import { requireUser } from '../auth/guards';
import { getDatabase } from '../db/index';
import { deleteDiaryEntry, updateDiaryEntry } from './diary';
import { parseEntryForm } from './forms';

function parseEntryId(form: FormData): number | undefined {
	const value = formText(form, 'entryId');
	return /^\d{1,12}$/.test(value) ? Number(value) : undefined;
}

/** Form action that updates a diary entry of the signed-in account. */
export async function updateEntryAction({ locals, request }: RequestEvent) {
	const { user } = requireUser(locals);
	const form = await request.formData();
	const entryId = parseEntryId(form);
	const parsed = parseEntryForm(form);
	if (!parsed.ok) return fail(400, { action: 'log' as const, error: parsed.error });
	if (entryId === undefined || !updateDiaryEntry(getDatabase(), user.id, entryId, parsed.value)) {
		return fail(404, { action: 'log' as const, error: 'entry_not_found' as const });
	}
	return { action: 'log' as const, success: true };
}

/** Form action that deletes a diary entry of the signed-in account. */
export async function deleteEntryAction({ locals, request }: RequestEvent) {
	const { user } = requireUser(locals);
	const entryId = parseEntryId(await request.formData());
	if (entryId === undefined || !deleteDiaryEntry(getDatabase(), user.id, entryId)) {
		return fail(404, { action: 'log' as const, error: 'entry_not_found' as const });
	}
	return { action: 'log' as const, success: true };
}
