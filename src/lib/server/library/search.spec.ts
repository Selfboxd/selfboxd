import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Article } from '../../catalog/journal';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { createDiaryEntry, type DiaryEntryInput } from './diary';
import { createList } from './lists';
import {
	foldText,
	relevance,
	searchArticles,
	searchOwnLists,
	searchReviews,
	searchTags
} from './search';
import { saveWork } from './works';

function entry(overrides: Partial<DiaryEntryInput> = {}): DiaryEntryInput {
	return {
		watchedOn: '2026-06-15',
		season: null,
		status: null,
		rating: null,
		liked: false,
		rewatch: false,
		review: '',
		containsSpoilers: false,
		tags: [],
		...overrides
	};
}

describe('foldText', () => {
	it('drops accents and case', () => {
		expect(foldText('Amélie À Paris')).toBe('amelie a paris');
	});
});

describe('relevance', () => {
	it('ranks the whole title above its words, its words above the other texts', () => {
		const exact = relevance('blade runner', 'Blade Runner');
		const within = relevance('blade runner', 'Blade Runner 2049');
		const words = relevance('runner blade', 'Blade Runner 2049');
		const elsewhere = relevance('blade', 'Alien', 'A blade in the dark');
		expect(exact).toBeGreaterThan(within);
		expect(within).toBeGreaterThan(words);
		expect(words).toBeGreaterThan(elsewhere);
		expect(elsewhere).toBeGreaterThan(0);
	});

	it('keeps a partial match and forgives one typo', () => {
		expect(relevance('alien queen', 'Aliens')).toBeGreaterThan(0);
		expect(relevance('amelei', 'Amélie')).toBeGreaterThan(0);
		expect(relevance('zzzz', 'Amélie')).toBe(0);
		expect(relevance('  ', 'Amélie')).toBe(0);
	});
});

describe('library search', () => {
	let database: TestDatabase;
	let ada: User;
	let grace: User;

	beforeEach(async () => {
		database = createTestDatabase();
		[ada, grace] = (await Promise.all(
			['ada', 'grace'].map((username) =>
				createUser(database.db, { username, password: 'password-1', isAdmin: false })
			)
		)) as [User, User];
		const film = (externalId: string, title: string) =>
			saveWork(database.db, { kind: 'film', externalId, title, year: null, posterPath: null }).id;
		const amelie = film('1', 'Amélie');
		const alien = film('2', 'Alien');
		createDiaryEntry(
			database.db,
			ada.id,
			amelie,
			entry({ review: 'Paris in colour.', tags: ['paris', 'comfort'] })
		);
		createDiaryEntry(
			database.db,
			ada.id,
			alien,
			entry({ review: 'Scary.', tags: ['space horror'] })
		);
		createDiaryEntry(database.db, ada.id, alien, entry({ tags: ['space horror', 'imax'] }));
		createDiaryEntry(database.db, grace.id, amelie, entry({ review: 'Paris again.' }));
		createList(database.db, ada.id, { name: 'Paris films', description: '', ranked: false });
		createList(database.db, ada.id, {
			name: 'Space',
			description: 'Films set in Paris orbit',
			ranked: false
		});
		createList(database.db, grace.id, { name: 'Paris', description: '', ranked: false });
	});

	afterEach(() => {
		database.cleanup();
	});

	it('finds reviews by their text or their work, for the account only', () => {
		expect(searchReviews(database.db, ada.id, 'paris').map((found) => found.review)).toEqual([
			'Paris in colour.'
		]);
		expect(searchReviews(database.db, ada.id, 'amelie').map((found) => found.work.title)).toEqual([
			'Amélie'
		]);
		expect(
			searchReviews(database.db, ada.id, 'alien colour').map((found) => found.work.title)
		).toEqual(['Alien', 'Amélie']);
		expect(searchReviews(database.db, ada.id, 'nothing at all')).toEqual([]);
	});

	it('finds the lists of the account by name or description', () => {
		expect(
			searchOwnLists(database.db, ada.id, 'paris')
				.map((list) => list.name)
				.sort()
		).toEqual(['Paris films', 'Space']);
	});

	it('puts tags that start with the query first, then the most used', () => {
		expect(searchTags(database.db, ada.id, 'par').map((tag) => tag.name)).toEqual(['paris']);
		expect(searchTags(database.db, ada.id, 'o').map((tag) => tag.name)).toEqual([
			'space horror',
			'comfort'
		]);
		expect(searchTags(database.db, ada.id, 's').map((tag) => tag.name)).toEqual([
			'space horror',
			'paris'
		]);
		expect(searchTags(database.db, ada.id, ' ')).toEqual([]);
	});

	it('finds journal articles by title, category or teaser', () => {
		const article = (id: string, headline: string, teaser: string): Article => ({
			id,
			headline,
			subtitle: '',
			url: `https://example.com/${id}`,
			category: 'News',
			publishedAt: '2026-06-01T00:00:00Z',
			imageUrl: null,
			teaser: [{ text: teaser, emphasis: false }]
		});
		const articles = [
			article('a', 'Festival diary', 'Cannes day one.'),
			article('b', 'Interview', 'A talk.')
		];
		expect(searchArticles(articles, 'cannes').map((found) => found.id)).toEqual(['a']);
		expect(searchArticles(articles, 'news').map((found) => found.id)).toEqual(['a', 'b']);
	});
});
