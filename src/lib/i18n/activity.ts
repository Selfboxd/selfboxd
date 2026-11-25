import type { ActivityEvent } from '#lib/catalog/library.js';
import { m } from '#lib/paraglide/messages.js';

const titleMarker = '\u0000';

/**
 * Sentence describing an event, split around the title of the work
 * so that the title can be rendered as a link.
 */
export function activitySentence(event: ActivityEvent): { before: string; after: string } {
	const title = { title: titleMarker };
	const sentence =
		event.kind === 'logged'
			? event.rewatch
				? m.activity_event_rewatched(title)
				: m.activity_event_logged(title)
			: event.kind === 'watched'
				? m.activity_event_watched(title)
				: event.kind === 'liked'
					? m.activity_event_liked(title)
					: m.activity_event_watchlisted(title);
	const [before = '', after = ''] = sentence.split(titleMarker);
	return { before, after };
}
