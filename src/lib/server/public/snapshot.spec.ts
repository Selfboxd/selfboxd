import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { createDiaryEntry } from '../library/diary';
import { setImageChoice } from '../library/images';
import { createListWithWorks } from '../library/lists';
import { setBanner, setFavourite, updateProfile } from '../library/profile';
import { setLiked } from '../library/states';
import { addToWatchlist } from '../library/watchlist';
import { saveWork } from '../library/works';
import { buildSnapshot } from './snapshot';
import { suggestedHandle } from './profile';

describe('public profile snapshot', () => {
	let database: TestDatabase;
	let ada: User;
	let film: number;
	let series: number;

	beforeEach(async () => {
		database = createTestDatabase();
		const created = await createUser(database.db, {
			username: 'Ada',
			password: 'password-1',
			isAdmin: false
		});
		if (!created) throw new Error('No account');
		ada = created;
		film = saveWork(database.db, {
			kind: 'film',
			externalId: '78',
			title: 'Blade Runner',
			year: 1982,
			posterPath: '/default.jpg'
		}).id;
		series = saveWork(database.db, {
			kind: 'series',
			externalId: '1400',
			title: 'Neon Precinct',
			year: 2019,
			posterPath: null
		}).id;
	});

	afterEach(() => {
		database.cleanup();
	});

	it('holds the profile, its works once each, and references by index', () => {
		updateProfile(database.db, ada.id, { bio: 'Night owl', location: 'Lisbon' });
		setBanner(database.db, ada.id, '/banner.jpg');
		setFavourite(database.db, ada.id, 2, film);
		createDiaryEntry(database.db, ada.id, film, {
			watchedOn: '2026-03-14',
			season: null,
			status: null,
			rating: 9,
			liked: true,
			rewatch: false,
			review: 'Tears in rain.',
			containsSpoilers: false,
			tags: ['35mm']
		});
		addToWatchlist(database.db, ada.id, series, { note: 'Later', tags: [] });
		createListWithWorks(database.db, ada.id, { name: 'Neon', description: '', ranked: true }, [
			series,
			film
		]);

		const snapshot = buildSnapshot(database.db, ada.id);

		expect(snapshot).toMatchObject({
			version: 1,
			name: 'Ada',
			bio: 'Night owl',
			location: 'Lisbon',
			bannerPath: '/banner.jpg',
			favourites: [{ slot: 2, work: 0 }],
			diary: [
				{ work: 0, watchedOn: '2026-03-14', rating: 9, review: 'Tears in rain.', tags: ['35mm'] }
			],
			watched: [{ work: 0, rating: 9, liked: true }],
			likes: [0],
			watchlist: [{ work: 1 }],
			lists: [{ name: 'Neon', ranked: true, items: [{ work: 1 }, { work: 0 }] }]
		});
		expect(snapshot.works).toEqual([
			{ kind: 'film', id: 78, title: 'Blade Runner', year: 1982, posterPath: '/default.jpg' },
			{ kind: 'series', id: 1400, title: 'Neon Precinct', year: 2019, posterPath: null }
		]);
	});

	it('sends the poster chosen by the account', () => {
		setLiked(database.db, ada.id, film, true);
		setImageChoice(database.db, ada.id, film, { poster: '/chosen.jpg' });

		expect(buildSnapshot(database.db, ada.id).works[0]?.posterPath).toBe('/chosen.jpg');
	});

	it('suggests an address from the username', () => {
		expect(suggestedHandle('Ada.Lovelace')).toBe('ada_lovelace');
		expect(suggestedHandle('x')).toBe('x_');
	});
});
