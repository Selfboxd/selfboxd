import type { Article } from '../../catalog/journal';
import type { DiaryEntry, ListSummary, TagCount } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { listDiaryEntries } from './diary';
import { listLists } from './lists';
import { listTagCounts } from './profile';

/** Lower case without accents, so that "Amelie" finds "Amélie". */
export function foldText(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

/** Whether two words differ by one typo at most: a letter added, removed or changed, or two swapped. */
function closeTo(word: string, other: string): boolean {
	if (Math.abs(word.length - other.length) > 1) return false;
	let i = 0;
	let j = 0;
	let edits = 0;
	while (i < word.length && j < other.length) {
		if (word[i] === other[j]) {
			i++;
			j++;
			continue;
		}
		edits++;
		if (edits > 1) return false;
		if (word[i] === other[j + 1] && word[i + 1] === other[j]) {
			i += 2;
			j += 2;
		} else if (word.length > other.length) i++;
		else if (other.length > word.length) j++;
		else {
			i++;
			j++;
		}
	}
	return edits + (word.length - i) + (other.length - j) <= 1;
}

/** Shortest word that may match with a typo. */
const typoMinLength = 4;

/**
 * How well a text matches the query: the whole query in the main text counts most, then each
 * word found in it, then in the other texts, then a word one typo away. Zero when nothing matches.
 */
export function relevance(query: string, main: string, ...others: string[]): number {
	const phrase = foldText(query).trim().replace(/\s+/g, ' ');
	const words = phrase.split(' ').filter(Boolean);
	if (words.length === 0) return 0;
	const title = foldText(main);
	const rest = foldText(others.join(' '));
	const split = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
	const titleTokens = split(title);
	const tokens = [...titleTokens, ...split(rest)];
	let score = title === phrase ? 20 : title.includes(phrase) ? 10 : 0;
	for (const word of words) {
		if (titleTokens.some((token) => token.startsWith(word))) score += 4;
		else if (title.includes(word)) score += 3;
		else if (rest.includes(word)) score += 2;
		else if (word.length >= typoMinLength && tokens.some((token) => closeTo(word, token)))
			score += 1;
	}
	return score;
}

/** The items that match the query at all, the most relevant first, keeping their order on ties. */
function rank<T>(items: T[], score: (item: T) => number): T[] {
	return items
		.map((item, index) => ({ item, index, score: score(item) }))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map((entry) => entry.item);
}

/** Reviews matching the query by their work or their text, the most relevant first. */
export function searchReviews(db: DatabaseExecutor, userId: number, query: string): DiaryEntry[] {
	return rank(
		listDiaryEntries(db, userId).filter((entry) => entry.review !== ''),
		(entry) => relevance(query, entry.work.title, entry.review, entry.tags.join(' '))
	);
}

/** Lists of the account matching the query by name or description, the most relevant first. */
export function searchOwnLists(db: DatabaseExecutor, userId: number, query: string): ListSummary[] {
	return rank(listLists(db, userId), (list) => relevance(query, list.name, list.description));
}

/** Diary tags matching the query, those that start with it first, then the most used. */
export function searchTags(db: DatabaseExecutor, userId: number, query: string): TagCount[] {
	const needle = foldText(query.trim());
	if (!needle) return [];
	const starts = (tag: TagCount) => (foldText(tag.name).startsWith(needle) ? 0 : 1);
	return rank(
		listTagCounts(db, userId).sort((a, b) => starts(a) - starts(b) || b.count - a.count),
		(tag) => relevance(query, tag.name)
	);
}

/** Articles of the journal matching the query by title, category or teaser, the most relevant first. */
export function searchArticles(articles: Article[], query: string): Article[] {
	return rank(articles, (article) =>
		relevance(
			query,
			`${article.headline} ${article.subtitle}`,
			article.category ?? '',
			article.teaser.map((segment) => segment.text).join('')
		)
	);
}
