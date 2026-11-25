import type { RatingScale } from '#lib/catalog/library.js';
import { m } from '#lib/paraglide/messages.js';

/** Describes a stored rating in words, in the scale of the account. */
export function ratingLabel(rating: number, scale: RatingScale): string {
	return scale === 'stars'
		? m.rating_label_stars({ value: String(rating / 2) })
		: m.rating_label_ten({ value: String(rating) });
}
