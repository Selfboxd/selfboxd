import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFeed, parseTeaser } from './feed';

const feed = readFileSync('e2e/support/journal/feed.xml', 'utf8');

function wrap(item: string): string {
	return `<rss><channel><item>${item}</item></channel></rss>`;
}

const validItem =
	'<title>Head: Tail</title><link>https://letterboxd.com/journal/a/</link>' +
	'<pubDate>Wed, 25 Nov 2026 03:54:42 +1300</pubDate>';

describe('parseFeed', () => {
	it('reads the articles in feed order', () => {
		const articles = parseFeed(feed);

		expect(articles).toHaveLength(9);
		expect(articles[0]).toEqual({
			id: 'lead-story',
			headline: 'Lead Story',
			subtitle: 'A conversation about the newest release',
			url: 'https://letterboxd.com/journal/lead-story/',
			category: 'Interview',
			publishedAt: '2026-11-24T14:54:42.000Z',
			imageUrl: 'https://a.ltrbxd.com/resized/lead-story.jpg?k=1',
			teaser: [
				{ text: 'With ', emphasis: false },
				{ text: 'The New Film', emphasis: true },
				{ text: ' in theaters, its director reflects on the shoot.', emphasis: false }
			]
		});
	});

	it('keeps a title without colon whole', () => {
		expect(parseFeed(feed)[5]).toMatchObject({ headline: 'Community 1', subtitle: '' });
	});

	it('decodes entities and never keeps markup', () => {
		const article = parseFeed(feed).find((entry) => entry.id === 'escaped');

		expect(article?.headline).toBe('Tom & Jerry alert(1)');
		expect(article?.teaser).toEqual([{ text: 'alert(2)Safe teaser & more.', emphasis: false }]);
	});

	it('skips an article whose link leaves the journal', () => {
		expect(parseFeed(feed).some((entry) => entry.id === 'unsafe')).toBe(false);
		expect(
			parseFeed(wrap(validItem.replace('https://letterboxd.com/journal/a/', 'https://evil.test/')))
		).toEqual([]);
	});

	it('skips an article without title or with an invalid date', () => {
		expect(parseFeed(wrap(validItem.replace('Head: Tail', '')))).toEqual([]);
		expect(parseFeed(wrap(validItem.replace(/<pubDate>.*<\/pubDate>/, '')))).toEqual([]);
	});

	it('drops an image served from another host', () => {
		const item = `${validItem}<description><![CDATA[<img src="https://evil.test/x.png" /><p>Text</p>]]></description>`;

		expect(parseFeed(wrap(item))[0]).toMatchObject({ imageUrl: null, category: null });
	});

	it('falls back to the link as identifier', () => {
		expect(parseFeed(wrap(validItem))[0]?.id).toBe('https://letterboxd.com/journal/a/');
	});

	it('returns nothing for a document that is not a feed', () => {
		expect(parseFeed('<html><body>Blocked</body></html>')).toEqual([]);
	});

	it('reads at most sixty articles', () => {
		const items = Array.from({ length: 80 }, () => `<item>${validItem}</item>`).join('');

		expect(parseFeed(`<rss><channel>${items}</channel></rss>`)).toHaveLength(60);
	});
});

describe('parseTeaser', () => {
	it('keeps only the first paragraph and drops comments', () => {
		expect(parseTeaser('<p>First. <!-- note --></p><p>Second.</p>')).toEqual([
			{ text: 'First.', emphasis: false }
		]);
	});

	it('strips other tags and their attributes', () => {
		expect(parseTeaser('<p>See <a href="javascript:alert(1)" onclick="x()">this</a>.</p>')).toEqual(
			[{ text: 'See this.', emphasis: false }]
		);
	});

	it('returns nothing without paragraph', () => {
		expect(parseTeaser('<img src="x" />')).toEqual([]);
	});
});
