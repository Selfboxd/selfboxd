import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import type { WorkMatch } from '../tmdb/service';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { createDiaryEntry, listDiaryEntries } from '../library/diary';
import { createList, getList, listLists } from '../library/lists';
import { getProfile, listFavourites, setFavourite, updateProfile } from '../library/profile';
import { getWorkState, setLiked, setRating } from '../library/states';
import { listWatchlist } from '../library/watchlist';
import { saveWork } from '../library/works';
import { applyImport, defaultImportChoices, reviewImport, type FilmMatches } from './importer';
import { parseLetterboxd, type LetterboxdExport } from './letterboxd';

const files: Record<string, string> = {
	'profile.csv':
		'Date Joined,Username,Given Name,Family Name,Email Address,Location,Website,Bio,Pronoun,Favorite Films\n' +
		'2025-01-17,ada,Ada,,,Lisbon,ada.example,"Night owl",,"https://boxd.it/a1, https://boxd.it/b2"\n',
	'watched.csv':
		'Date,Name,Year,Letterboxd URI\n' +
		'2025-01-17,Blade Runner,1982,https://boxd.it/a1\n' +
		'2025-01-18,Alien,1979,https://boxd.it/b2\n' +
		'2025-01-19,Lost Film,1901,https://boxd.it/c3\n',
	'ratings.csv':
		'Date,Name,Year,Letterboxd URI,Rating\n' +
		'2025-01-17,Blade Runner,1982,https://boxd.it/a1,4.5\n',
	'diary.csv':
		'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
		'2025-01-17,Blade Runner,1982,https://boxd.it/e1,4.5,,"cinema, 35mm",2025-01-16\n' +
		'2025-01-20,Alien,1979,https://boxd.it/e2,3,Yes,,2025-01-19\n',
	'reviews.csv':
		'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\n' +
		'2025-01-17,Blade Runner,1982,https://boxd.it/e1,4.5,,"Tears in rain,\nstill.",,2025-01-16\n' +
		'2025-02-01,Dune,2021,https://boxd.it/e9,4,,"Sand.",,2025-01-31\n',
	'likes/films.csv': 'Date,Name,Year,Letterboxd URI\n2025-01-17,Alien,1979,https://boxd.it/b2\n',
	'watchlist.csv': 'Date,Name,Year,Letterboxd URI\n2025-03-01,Dune,2021,https://boxd.it/d4\n',
	'lists/top.csv':
		'Letterboxd list export v7\nDate,Name,Tags,URL,Description\n2025-01-01,Top Scott,"profile, noir",https://boxd.it/l1,Best of Scott\n\n' +
		'Position,Name,Year,URL,Description\n1,Alien,1979,https://boxd.it/b2,\n2,Blade Runner,1982,https://boxd.it/a1,The cut\n',
	'deleted/diary.csv':
		'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2025-01-01,Gone,2000,x,3,,,2025-01-01\n',
	'comments.csv': 'Date,Content,Comment\n2025-01-01,https://boxd.it/x,Nice\n'
};

function exported(): LetterboxdExport {
	const encoded = new Map(
		Object.entries(files).map(([name, text]) => [name, new TextEncoder().encode(text)])
	);
	const data = parseLetterboxd(encoded);
	if (!data) throw new Error('Not an export');
	return data;
}

const film = (id: number, title: string, year: number): WorkMatch => ({
	kind: 'film',
	id,
	title,
	year,
	posterPath: null
});

const matches: FilmMatches = new Map([
	['blade runner|1982', film(78, 'Blade Runner', 1982)],
	['alien|1979', film(348, 'Alien', 1979)],
	['dune|2021', film(438631, 'Dune', 2021)]
]);

describe('parseLetterboxd', () => {
	it('reads every part of the export and joins reviews to their diary entries', () => {
		const data = exported();
		expect(data.films.size).toBe(4);
		expect(data.diary).toEqual([
			{
				film: 'blade runner|1982',
				watchedOn: '2025-01-16',
				rating: 9,
				rewatch: false,
				review: 'Tears in rain,\nstill.',
				tags: ['cinema', '35mm']
			},
			{
				film: 'alien|1979',
				watchedOn: '2025-01-19',
				rating: 6,
				rewatch: true,
				review: '',
				tags: []
			},
			{
				film: 'dune|2021',
				watchedOn: '2025-01-31',
				rating: 8,
				rewatch: false,
				review: 'Sand.',
				tags: []
			}
		]);
		expect(data.ratings).toEqual([{ film: 'blade runner|1982', rating: 9 }]);
		expect(data.likes).toEqual(['alien|1979']);
		expect(data.watchlist).toEqual([{ film: 'dune|2021', addedOn: '2025-03-01' }]);
		expect(data.lists).toEqual([
			{
				name: 'Top Scott',
				description: 'Best of Scott',
				tags: ['profile', 'noir'],
				items: [
					{ film: 'alien|1979', note: '' },
					{ film: 'blade runner|1982', note: 'The cut' }
				]
			}
		]);
		expect(data.profile).toEqual({
			bio: 'Night owl',
			location: 'Lisbon',
			website: 'ada.example',
			favourites: ['blade runner|1982', 'alien|1979']
		});
	});

	it('refuses an archive that is not a Letterboxd export', () => {
		expect(parseLetterboxd(new Map([['photo.jpg', new Uint8Array(1)]]))).toBeNull();
	});
});

describe('import', () => {
	let database: TestDatabase;
	let ada: User;

	beforeEach(async () => {
		database = createTestDatabase();
		const created = await createUser(database.db, {
			username: 'ada',
			password: 'password-1',
			isAdmin: false
		});
		if (!created) throw new Error('No account');
		ada = created;
	});

	afterEach(() => {
		database.cleanup();
	});

	it('adds everything to an empty library', () => {
		const summary = applyImport(database.db, ada.id, exported(), matches, defaultImportChoices);

		expect(summary).toMatchObject({
			diary: 3,
			ratings: 1,
			watchlist: 1,
			lists: 1,
			likes: 1,
			skipped: 0
		});
		const diary = listDiaryEntries(database.db, ada.id);
		expect(diary.map((entry) => entry.work.title)).toEqual(['Dune', 'Alien', 'Blade Runner']);
		expect(diary[2]).toMatchObject({
			review: 'Tears in rain,\nstill.',
			tags: ['35mm', 'cinema'],
			rating: 9
		});
		expect(listWatchlist(database.db, ada.id).map((item) => item.work.title)).toEqual(['Dune']);
		const alien = diary[1]?.work.id ?? 0;
		expect(getWorkState(database.db, ada.id, alien)).toMatchObject({ liked: true, watched: true });
		const [list] = listLists(database.db, ada.id);
		expect(list).toMatchObject({
			name: 'Top Scott',
			ranked: true,
			count: 2,
			tags: ['noir', 'profile']
		});
		expect(getList(database.db, ada.id, list?.id ?? 0)?.items.map((item) => item.note)).toEqual([
			'',
			'The cut'
		]);
		expect(getProfile(database.db, ada.id)).toMatchObject({
			bio: 'Night owl',
			location: 'Lisbon',
			links: { website: 'https://ada.example/' }
		});
		expect(listFavourites(database.db, ada.id).map((work) => work?.title ?? null)).toEqual([
			'Blade Runner',
			'Alien',
			null,
			null
		]);
	});

	describe('with a library', () => {
		let blade: number;

		beforeEach(() => {
			blade = saveWork(database.db, {
				kind: 'film',
				externalId: '78',
				title: 'Blade Runner',
				year: 1982,
				posterPath: null
			}).id;
			createDiaryEntry(database.db, ada.id, blade, {
				watchedOn: '2025-01-16',
				season: null,
				status: null,
				rating: 6,
				liked: true,
				rewatch: false,
				review: '',
				containsSpoilers: false,
				tags: []
			});
			setRating(database.db, ada.id, blade, 6);
			setLiked(database.db, ada.id, blade, true);
			updateProfile(database.db, ada.id, {
				bio: 'Mine',
				location: '',
				links: { website: '', instagram: '', x: '' }
			});
			setFavourite(database.db, ada.id, 1, blade);
			createList(database.db, ada.id, { name: 'top scott', description: '', ranked: false });
		});

		it('lists what disagrees before importing', () => {
			const review = reviewImport(database.db, ada.id, exported(), matches);

			expect(review.counts).toMatchObject({ films: 4, found: 3, diary: 3, reviews: 2, lists: 1 });
			expect(review.missing).toEqual([{ name: 'Lost Film', year: 1901 }]);
			expect(review.conflicts).toEqual({
				duplicates: 1,
				ratings: [{ title: 'Blade Runner', mine: 6, theirs: 9 }],
				profile: ['bio'],
				favourites: true,
				lists: ['Top Scott']
			});
		});

		it('keeps what the library holds by default', () => {
			applyImport(database.db, ada.id, exported(), matches, defaultImportChoices);

			expect(
				listDiaryEntries(database.db, ada.id).filter((entry) => entry.work.id === blade)
			).toHaveLength(1);
			expect(getWorkState(database.db, ada.id, blade)).toMatchObject({ rating: 6, liked: true });
			expect(getProfile(database.db, ada.id)).toMatchObject({ bio: 'Mine', location: 'Lisbon' });
			expect(listFavourites(database.db, ada.id)[0]?.id).toBe(blade);
			expect(listFavourites(database.db, ada.id)[1]).toBeNull();
			expect(listLists(database.db, ada.id)).toMatchObject([{ name: 'top scott', count: 2 }]);
		});

		it('takes the export over the library when chosen', () => {
			applyImport(database.db, ada.id, exported(), matches, {
				duplicates: 'add',
				ratings: 'replace',
				profile: 'replace',
				favourites: 'replace',
				lists: 'copy',
				ranked: false
			});

			expect(
				listDiaryEntries(database.db, ada.id).filter((entry) => entry.work.id === blade)
			).toHaveLength(2);
			expect(getWorkState(database.db, ada.id, blade).rating).toBe(9);
			expect(getProfile(database.db, ada.id).bio).toBe('Night owl');
			expect(listFavourites(database.db, ada.id)[1]?.title).toBe('Alien');
			expect(
				listLists(database.db, ada.id)
					.map((list) => [list.name, list.ranked])
					.sort()
			).toEqual([
				['Top Scott (Letterboxd)', false],
				['top scott', false]
			]);
		});

		it('leaves out the lists named like one of the account when chosen', () => {
			applyImport(database.db, ada.id, exported(), matches, {
				...defaultImportChoices,
				lists: 'skip'
			});

			expect(listLists(database.db, ada.id)).toMatchObject([{ name: 'top scott', count: 0 }]);
		});
	});
});
