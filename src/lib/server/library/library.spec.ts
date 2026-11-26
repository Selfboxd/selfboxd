import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import {
	createDiaryEntry,
	deleteDiaryEntry,
	listDeletedEntries,
	listDiaryEntries,
	updateDiaryEntry,
	type DiaryEntryInput
} from './diary';
import { getWorkState, setLiked, setRating, setWatched } from './states';
import { listTagNames } from './tags';
import { listMarks, markKey } from './marks';
import { addAllToWatchlist, addToWatchlist, deleteFromWatchlist, listWatchlist } from './watchlist';
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

describe('library', () => {
	let database: TestDatabase;
	let ada: User;
	let grace: User;
	let film: number;
	let sequel: number;

	beforeEach(async () => {
		database = createTestDatabase();
		const created = await Promise.all(
			['ada', 'grace'].map((username) =>
				createUser(database.db, { username, password: 'password-1', isAdmin: false })
			)
		);
		[ada, grace] = created as [User, User];
		film = saveWork(database.db, {
			kind: 'film',
			externalId: '78',
			title: 'Blade Runner',
			year: 1982,
			posterPath: null
		}).id;
		sequel = saveWork(database.db, {
			kind: 'film',
			externalId: '335984',
			title: 'Blade Runner 2049',
			year: 2017,
			posterPath: null
		}).id;
	});

	afterEach(() => {
		database.cleanup();
	});

	function state(user = ada, work = film) {
		return getWorkState(database.db, user.id, work);
	}

	describe('works', () => {
		it('refreshes a stored work instead of duplicating it', () => {
			const again = saveWork(database.db, {
				kind: 'film',
				externalId: '78',
				title: 'Blade Runner: The Final Cut',
				year: 1982,
				posterPath: '/poster.jpg'
			});

			expect(again).toMatchObject({ id: film, title: 'Blade Runner: The Final Cut' });
		});
	});

	describe('watched, like and rating', () => {
		it('starts with nothing', () => {
			expect(state()).toEqual({
				watched: false,
				liked: false,
				rating: null,
				inWatchlist: false,
				logCount: 0,
				status: null
			});
		});

		it('keeps each account separate', () => {
			setWatched(database.db, ada.id, film, true);

			expect(state(grace).watched).toBe(false);
		});

		it('gives what each account watched and rated, by kind and TMDB identifier', () => {
			setRating(database.db, ada.id, film, 8);
			setLiked(database.db, grace.id, film, true);

			const key = markKey('film', '78');
			expect(listMarks(database.db, ada.id).get(key)).toEqual({ watched: true, rating: 8 });
			expect(listMarks(database.db, grace.id).get(key)).toEqual({ watched: false, rating: null });
			expect(listMarks(database.db, ada.id).has(markKey('series', '78'))).toBe(false);
		});

		it('likes a work without marking it as watched', () => {
			setLiked(database.db, ada.id, film, true);

			expect(state()).toMatchObject({ liked: true, watched: false });
		});

		it('marks a rated work as watched', () => {
			setRating(database.db, ada.id, film, 8);

			expect(state()).toMatchObject({ rating: 8, watched: true });
		});

		it('clears the rating of a work that is no longer watched, and keeps its like', () => {
			setRating(database.db, ada.id, film, 8);
			setLiked(database.db, ada.id, film, true);

			expect(setWatched(database.db, ada.id, film, false)).toBe(true);

			expect(state()).toMatchObject({ watched: false, rating: null, liked: true });
		});

		it('keeps a logged work watched', () => {
			createDiaryEntry(database.db, ada.id, film, entry());

			expect(setWatched(database.db, ada.id, film, false)).toBe(false);
			expect(state().watched).toBe(true);
		});
	});

	describe('watchlist', () => {
		it('adds many works at once and keeps the note of those already in it', () => {
			addToWatchlist(database.db, ada.id, film, { note: 'Keep me', tags: [] });

			addAllToWatchlist(database.db, ada.id, [film, sequel, sequel]);

			expect(
				listWatchlist(database.db, ada.id)
					.map((item) => item.note)
					.sort()
			).toEqual(['', 'Keep me']);
		});

		it('lists the most recently added work first', () => {
			addToWatchlist(database.db, ada.id, film, { note: '', tags: [] }, new Date(1000));
			addToWatchlist(database.db, ada.id, sequel, { note: '', tags: [] }, new Date(2000));

			expect(listWatchlist(database.db, ada.id).map((item) => item.work.title)).toEqual([
				'Blade Runner 2049',
				'Blade Runner'
			]);
		});

		it('keeps the note and the tags, and filters by tag', () => {
			addToWatchlist(database.db, ada.id, film, { note: 'A classic', tags: ['sci-fi'] });
			addToWatchlist(database.db, ada.id, sequel, { note: '', tags: ['sci-fi', 'recent'] });

			expect(listWatchlist(database.db, ada.id, 'recent')).toMatchObject([
				{ work: { title: 'Blade Runner 2049' }, tags: ['recent', 'sci-fi'] }
			]);
			expect(listWatchlist(database.db, ada.id, 'sci-fi')).toHaveLength(2);
			expect(listTagNames(database.db, ada.id, 'watchlist')).toEqual(['recent', 'sci-fi']);
		});

		it('replaces the note and tags of a work that is already listed, keeping its place', () => {
			addToWatchlist(database.db, ada.id, film, { note: 'old', tags: ['old'] }, new Date(1000));
			addToWatchlist(database.db, ada.id, sequel, { note: '', tags: [] }, new Date(2000));

			addToWatchlist(database.db, ada.id, film, { note: 'new', tags: ['new'] }, new Date(3000));

			expect(listWatchlist(database.db, ada.id)[1]).toMatchObject({ note: 'new', tags: ['new'] });
			expect(listTagNames(database.db, ada.id, 'watchlist')).toEqual(['new']);
		});

		it('drops a work once it is watched, rated or logged', () => {
			const changes = [
				() => setWatched(database.db, ada.id, film, true),
				() => {
					setRating(database.db, ada.id, film, 6);
				},
				() => createDiaryEntry(database.db, ada.id, film, entry())
			];
			for (const change of changes) {
				addToWatchlist(database.db, ada.id, film, { note: '', tags: [] });

				change();

				expect(state().inWatchlist).toBe(false);
			}
		});

		it('accepts a work that was already watched', () => {
			setWatched(database.db, ada.id, film, true);

			addToWatchlist(database.db, ada.id, film, { note: '', tags: [] });

			expect(state()).toMatchObject({ watched: true, inWatchlist: true });
		});

		it('removes a work and its unused tags', () => {
			addToWatchlist(database.db, ada.id, film, { note: '', tags: ['sci-fi'] });

			deleteFromWatchlist(database.db, ada.id, film);

			expect(listWatchlist(database.db, ada.id)).toEqual([]);
			expect(listTagNames(database.db, ada.id, 'watchlist')).toEqual([]);
		});
	});

	describe('diary', () => {
		it('marks a logged work as watched and copies its rating and like', () => {
			createDiaryEntry(database.db, ada.id, film, entry({ rating: 9, liked: true }));

			expect(state()).toMatchObject({ watched: true, rating: 9, liked: true, logCount: 1 });
		});

		it('keeps the rating of the work when an entry has none', () => {
			setRating(database.db, ada.id, film, 7);

			createDiaryEntry(database.db, ada.id, film, entry());

			expect(state().rating).toBe(7);
		});

		it('lists the most recent viewing first, with its tags', () => {
			createDiaryEntry(database.db, ada.id, film, entry({ watchedOn: '2026-01-10' }));
			createDiaryEntry(
				database.db,
				ada.id,
				sequel,
				entry({ watchedOn: '2026-03-02', tags: ['cinema', 'imax'], review: 'Stunning.' })
			);

			expect(listDiaryEntries(database.db, ada.id)).toMatchObject([
				{ work: { title: 'Blade Runner 2049' }, tags: ['cinema', 'imax'], review: 'Stunning.' },
				{ work: { title: 'Blade Runner' }, watchedOn: '2026-01-10' }
			]);
		});

		it('logs a season of a series and sets the status of the series', () => {
			const series = saveWork(database.db, {
				kind: 'series',
				externalId: '1400',
				title: 'Neon Precinct',
				year: 2019,
				posterPath: null
			}).id;

			createDiaryEntry(database.db, ada.id, series, entry({ season: 2, status: 'watching' }));
			createDiaryEntry(database.db, ada.id, series, entry({ season: 3 }));

			expect(listDiaryEntries(database.db, ada.id, series).map((item) => item.season)).toEqual([
				3, 2
			]);
			expect(state(ada, series)).toMatchObject({ watched: true, status: 'watching' });

			createDiaryEntry(database.db, ada.id, series, entry({ status: 'abandoned' }));
			expect(state(ada, series).status).toBe('abandoned');
		});

		it('lists the entries of one work', () => {
			createDiaryEntry(database.db, ada.id, film, entry());
			createDiaryEntry(database.db, ada.id, sequel, entry());

			expect(listDiaryEntries(database.db, ada.id, film)).toHaveLength(1);
		});

		it('updates an entry', () => {
			const id = createDiaryEntry(database.db, ada.id, film, entry({ tags: ['cinema'] }));

			const updated = updateDiaryEntry(
				database.db,
				ada.id,
				id,
				entry({ watchedOn: '2026-06-01', rating: 10, rewatch: true, tags: ['home'] })
			);

			expect(updated).toBe(true);
			expect(listDiaryEntries(database.db, ada.id)).toMatchObject([
				{ watchedOn: '2026-06-01', rating: 10, rewatch: true, tags: ['home'] }
			]);
			expect(listTagNames(database.db, ada.id, 'diary')).toEqual(['home']);
		});

		it('does not let an account change or delete the entry of another account', () => {
			const id = createDiaryEntry(database.db, ada.id, film, entry({ review: 'Mine.' }));

			expect(updateDiaryEntry(database.db, grace.id, id, entry({ review: 'Hijacked.' }))).toBe(
				false
			);
			expect(deleteDiaryEntry(database.db, grace.id, id)).toBe(false);
			expect(listDiaryEntries(database.db, ada.id)).toMatchObject([{ review: 'Mine.' }]);
		});

		it('deletes an entry and leaves the work watched', () => {
			const id = createDiaryEntry(database.db, ada.id, film, entry({ tags: ['cinema'] }));

			expect(deleteDiaryEntry(database.db, ada.id, id)).toBe(true);

			expect(state()).toMatchObject({ watched: true, logCount: 0 });
			expect(listTagNames(database.db, ada.id, 'diary')).toEqual([]);
		});

		it('remembers deleted entries for thirty days and never gives their id again', () => {
			const deletedAt = new Date('2026-03-01T10:00:00Z');
			const id = createDiaryEntry(database.db, ada.id, film, entry({ watchedOn: '2026-02-28' }));
			deleteDiaryEntry(database.db, ada.id, id, deletedAt);
			const again = createDiaryEntry(database.db, ada.id, film, entry());

			expect(again).toBeGreaterThan(id);
			expect(listDeletedEntries(database.db, ada.id, new Date('2026-03-20'))).toMatchObject([
				{ id, title: 'Blade Runner', watchedOn: '2026-02-28', deletedAt }
			]);
			expect(listDeletedEntries(database.db, grace.id, new Date('2026-03-20'))).toEqual([]);
			expect(listDeletedEntries(database.db, ada.id, new Date('2026-04-01'))).toEqual([]);
		});

		it('keeps diary tags and watchlist tags apart', () => {
			createDiaryEntry(database.db, ada.id, film, entry({ tags: ['cinema'] }));
			addToWatchlist(database.db, ada.id, sequel, { note: '', tags: ['cinema'] });

			deleteFromWatchlist(database.db, ada.id, sequel);

			expect(listTagNames(database.db, ada.id, 'diary')).toEqual(['cinema']);
		});
	});
});
