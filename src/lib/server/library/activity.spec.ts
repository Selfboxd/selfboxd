import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { listActivity } from './activity';
import { createDiaryEntry, type DiaryEntryInput } from './diary';
import { setLiked, setRating, setWatched } from './states';
import { listWatched } from './watched';
import { addToWatchlist } from './watchlist';
import { saveWork } from './works';

const entry: DiaryEntryInput = {
	watchedOn: '2026-06-15',
	rating: 8,
	liked: true,
	rewatch: false,
	review: 'Great.',
	containsSpoilers: false,
	tags: []
};

describe('watched films and activity', () => {
	let database: TestDatabase;
	let ada: User;
	let grace: User;
	let works: number[];

	beforeEach(async () => {
		database = createTestDatabase();
		const created = await Promise.all(
			['ada', 'grace'].map((username) =>
				createUser(database.db, { username, password: 'password-1', isAdmin: false })
			)
		);
		[ada, grace] = created as [User, User];
		works = ['One', 'Two', 'Three'].map(
			(title, index) =>
				saveWork(database.db, {
					kind: 'film',
					externalId: String(index + 1),
					title,
					year: 2000 + index,
					posterPath: null
				}).id
		);
	});

	afterEach(() => {
		database.cleanup();
	});

	function work(index: number): number {
		return works[index] ?? 0;
	}

	describe('listWatched', () => {
		it('lists the watched works of the account with rating and like', () => {
			setRating(database.db, ada.id, work(0), 7);
			setLiked(database.db, ada.id, work(1), true);
			setWatched(database.db, grace.id, work(2), true);

			expect(listWatched(database.db, ada.id)).toMatchObject([
				{ work: { title: 'One' }, rating: 7, liked: false }
			]);
		});

		it('includes a work logged in the diary', () => {
			createDiaryEntry(database.db, ada.id, work(1), entry);

			expect(listWatched(database.db, ada.id)).toMatchObject([
				{ work: { title: 'Two' }, rating: 8, liked: true }
			]);
		});

		it('is empty for an account without watched works', () => {
			expect(listWatched(database.db, ada.id)).toEqual([]);
		});
	});

	describe('listActivity', () => {
		it('merges diary entries, watchlist additions and states, newest first', () => {
			createDiaryEntry(database.db, ada.id, work(0), entry, new Date('2026-06-15T10:00:00Z'));
			addToWatchlist(
				database.db,
				ada.id,
				work(1),
				{ note: '', tags: [] },
				new Date('2026-06-16T10:00:00Z')
			);
			setLiked(database.db, ada.id, work(2), true);

			expect(listActivity(database.db, ada.id)).toMatchObject([
				{ kind: 'liked', work: { title: 'Three' } },
				{ kind: 'watchlisted', work: { title: 'Two' } },
				{ kind: 'logged', work: { title: 'One' }, rating: 8, liked: true, reviewed: true }
			]);
		});

		it('reports a work marked as watched outside of the diary', () => {
			setRating(database.db, ada.id, work(0), 6);

			expect(listActivity(database.db, ada.id)).toMatchObject([
				{ kind: 'watched', work: { title: 'One' }, rating: 6 }
			]);
		});

		it('reports a logged work once per diary entry and not as a state', () => {
			createDiaryEntry(database.db, ada.id, work(0), entry);
			createDiaryEntry(database.db, ada.id, work(0), { ...entry, rewatch: true, review: '' });

			const events = listActivity(database.db, ada.id);

			expect(events.map((event) => event.kind)).toEqual(['logged', 'logged']);
			expect(events.some((event) => event.rewatch && !event.reviewed)).toBe(true);
		});

		it('never shows the activity of another account', () => {
			createDiaryEntry(database.db, grace.id, work(0), entry);
			setLiked(database.db, grace.id, work(1), true);

			expect(listActivity(database.db, ada.id)).toEqual([]);
		});
	});
});
