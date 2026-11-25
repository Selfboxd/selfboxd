import type { Article, TextSegment } from '../../catalog/journal';

/** Only article links under this address are kept. */
export const articleUrlPrefix = 'https://letterboxd.com/journal/';

/** Only images served from this address are kept. */
export const imageUrlPrefix = 'https://a.ltrbxd.com/';

/** Largest number of articles read from a feed. */
const articleLimit = 60;

const namedEntities: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith('#')) {
			const hexadecimal = entity[1]?.toLowerCase() === 'x';
			const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
		}
		return namedEntities[entity.toLowerCase()] ?? match;
	});
}

/** Content of the first `name` element of an XML fragment, with its CDATA section unwrapped. */
function element(xml: string, name: string): string {
	const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
	if (!match?.[1]) return '';
	const content = match[1].trim();
	const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(content);
	return cdata?.[1] ?? decodeEntities(content);
}

function plainText(markup: string): string {
	return decodeEntities(markup.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ');
}

/** Turns the first paragraph of an HTML fragment into text runs, keeping only its emphasis. */
export function parseTeaser(html: string): TextSegment[] {
	const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
	const paragraph = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i.exec(withoutComments)?.[1] ?? '';
	const segments: TextSegment[] = [];
	let emphasis = false;
	for (const part of paragraph.split(/(<\/?(?:em|i)(?:\s[^>]*)?>)/i)) {
		if (/^<(?:em|i)[\s>]/i.test(part)) emphasis = true;
		else if (/^<\/(?:em|i)>/i.test(part)) emphasis = false;
		else {
			const text = plainText(part);
			if (text) segments.push({ text, emphasis });
		}
	}
	const first = segments[0];
	const last = segments.at(-1);
	if (first) first.text = first.text.trimStart();
	if (last) last.text = last.text.trimEnd();
	return segments.filter((segment) => segment.text !== '');
}

function imageUrl(html: string): string | null {
	const source = /<img\s[^>]*?src="([^"]+)"/i.exec(html)?.[1];
	if (!source) return null;
	const url = decodeEntities(source);
	return url.startsWith(imageUrlPrefix) ? url : null;
}

function parseItem(item: string): Article | undefined {
	const title = plainText(element(item, 'title')).trim();
	const url = element(item, 'link').trim();
	const published = new Date(element(item, 'pubDate'));
	if (!title || !url.startsWith(articleUrlPrefix) || Number.isNaN(published.getTime())) {
		return undefined;
	}

	const separator = title.indexOf(': ');
	const description = element(item, 'description');
	return {
		id: element(item, 'guid').trim() || url,
		headline: separator > 0 ? title.slice(0, separator) : title,
		subtitle: separator > 0 ? title.slice(separator + 2) : '',
		url,
		category: plainText(element(item, 'category')).trim() || null,
		publishedAt: published.toISOString(),
		imageUrl: imageUrl(description),
		teaser: parseTeaser(description)
	};
}

/** Reads the articles of an RSS feed, skipping the entries that are incomplete. */
export function parseFeed(xml: string): Article[] {
	const articles: Article[] = [];
	for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)) {
		const article = match[1] ? parseItem(match[1]) : undefined;
		if (article) articles.push(article);
		if (articles.length === articleLimit) break;
	}
	return articles;
}
