/** Returns a form field as a string. Files and missing fields become an empty string. */
export function formText(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value : '';
}
