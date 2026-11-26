import type { Locator } from '@playwright/test';
import { chooseOption } from './accounts';

/** Picks a day, given as `YYYY-MM-DD`, in the date picker with the label. */
export async function pickDate(scope: Locator, label: string, date: string) {
	const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
	await scope.getByLabel(label, { exact: true }).click();
	const calendar = scope.getByRole('dialog', { name: 'Choose a date' });
	await chooseOption(calendar, 'Year', String(year));
	const monthName = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en', {
		month: 'long',
		timeZone: 'UTC'
	});
	await chooseOption(calendar, 'Month', monthName);
	await calendar
		.getByRole('gridcell')
		.getByRole('button', { name: String(day), exact: true })
		.click();
}

/** Types each tag of a comma-separated list into the tags field, ending each with Enter. */
export async function fillTags(scope: Locator, label: string, tags: string) {
	const field = scope.getByLabel(label, { exact: true });
	for (const tag of tags.split(',')) {
		if (!tag.trim()) continue;
		await field.fill(tag.trim());
		await field.press('Enter');
	}
}
