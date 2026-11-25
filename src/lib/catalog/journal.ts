/** A run of text of an article teaser, emphasised or not. */
export interface TextSegment {
	text: string;
	emphasis: boolean;
}

/** An article of the journal, as read from its feed. */
export interface Article {
	id: string;
	/** Short headline, the part of the feed title before its colon. */
	headline: string;
	/** Rest of the feed title, empty when the title has a single part. */
	subtitle: string;
	url: string;
	category: string | null;
	/** Publication time, as an ISO timestamp. */
	publishedAt: string;
	imageUrl: string | null;
	teaser: TextSegment[];
}
