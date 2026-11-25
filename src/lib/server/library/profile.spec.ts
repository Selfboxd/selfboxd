import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import {
	createDiaryEntry,
	listDiaryEntries,
	updateDiaryEntry,
	type DiaryEntryInput
} from './diary';
import { parseProfileForm } from './forms';
import { createList } from './lists';
import {
	clearFavourite,
	getProfile,
	getProfileStats,
	getRatingHistogram,
	listFavourites,
	listLiked,
	listTagCounts,
	setBanner,
	setFavourite,
	setPinned,
	updateProfile
} from './profile';
import { setLiked, setRating, setWatched } from './states';
import { saveWork } from './works';

function entry(overrides: Partial<DiaryEntryInput> = {}): DiaryEntryInput {
	return {
		watchedOn: '2026-06-15',
		rating: null,
		liked: false,
		rewatch: false,
		review: 'A review.',
		containsSpoilers: false,
		tags: [],
		...overrides
	};
}

describe('profile', () => {
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
		works = ['One', 'Two', 'Three', 'Four', 'Five'].map(
			(title, index) =>
				saveWork(database.db, {
					kind: 'film',
					externalId: String(index + 1),
					title,
					year: null,
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

	function favouriteTitles(user = ada): (string | null)[] {
		return listFavourites(database.db, user.id).map((favourite) => favourite?.title ?? null);
	}

	it('starts empty and stores the bio, location and banner', () => {
		expect(getProfile(database.db, ada.id)).toEqual({ bio: '', location: '', bannerPath: null });

		updateProfile(database.db, ada.id, { bio: 'Hermit.', location: 'Adrift' });
		setBanner(database.db, ada.id, '/banner.jpg');

		expect(getProfile(database.db, ada.id)).toEqual({
			bio: 'Hermit.',
			location: 'Adrift',
			bannerPath: '/banner.jpg'
		});
		expect(getProfile(database.db, grace.id).bio).toBe('');
	});

	it('keeps four favourite slots', () => {
		expect(favouriteTitles()).toEqual([null, null, null, null]);

		expect(setFavourite(database.db, ada.id, 2, work(0))).toBe(true);
		expect(setFavourite(database.db, ada.id, 4, work(1))).toBe(true);

		expect(favouriteTitles()).toEqual([null, 'One', null, 'Two']);
		expect(favouriteTitles(grace)).toEqual([null, null, null, null]);
	});

	it('replaces a slot, moves a work between slots and clears a slot', () => {
		setFavourite(database.db, ada.id, 1, work(0));
		setFavourite(database.db, ada.id, 1, work(1));
		expect(favouriteTitles()).toEqual(['Two', null, null, null]);

		setFavourite(database.db, ada.id, 3, work(1));
		expect(favouriteTitles()).toEqual([null, null, 'Two', null]);

		clearFavourite(database.db, ada.id, 3);
		expect(favouriteTitles()).toEqual([null, null, null, null]);
	});

	it('refuses a slot that does not exist', () => {
		for (const slot of [0, 5, -1, 1.5, Number.NaN]) {
			expect(setFavourite(database.db, ada.id, slot, work(0))).toBe(false);
		}
		expect(favouriteTitles()).toEqual([null, null, null, null]);
	});

	it('counts watched works, entries of the year and lists', () => {
		setWatched(database.db, ada.id, work(0), true);
		createDiaryEntry(database.db, ada.id, work(1), entry({ watchedOn: '2026-03-01' }));
		createDiaryEntry(database.db, ada.id, work(1), entry({ watchedOn: '2026-04-01' }));
		createDiaryEntry(database.db, ada.id, work(2), entry({ watchedOn: '2025-12-31' }));
		createList(database.db, ada.id, { name: 'A', description: '', ranked: false });
		setWatched(database.db, grace.id, work(3), true);

		expect(getProfileStats(database.db, ada.id, new Date('2026-06-01'))).toEqual({
			watched: 3,
			thisYear: 2,
			lists: 1
		});
	});

	it('counts the works for each rating', () => {
		setRating(database.db, ada.id, work(0), 8);
		setRating(database.db, ada.id, work(1), 8);
		setRating(database.db, ada.id, work(2), 1);
		setRating(database.db, grace.id, work(3), 10);

		expect(getRatingHistogram(database.db, ada.id)).toEqual([1, 0, 0, 0, 0, 0, 0, 2, 0, 0]);
	});

	it('lists liked works of the account only', () => {
		setLiked(database.db, ada.id, work(0), true);
		setLiked(database.db, grace.id, work(1), true);

		expect(listLiked(database.db, ada.id)).toMatchObject([{ work: { title: 'One' }, liked: true }]);
	});

	it('counts diary tags, most used first', () => {
		createDiaryEntry(database.db, ada.id, work(0), entry({ tags: ['cinema', '35mm'] }));
		createDiaryEntry(database.db, ada.id, work(1), entry({ tags: ['cinema'] }));
		createDiaryEntry(database.db, grace.id, work(2), entry({ tags: ['cinema'] }));

		expect(listTagCounts(database.db, ada.id)).toEqual([
			{ name: 'cinema', count: 2 },
			{ name: '35mm', count: 1 }
		]);
	});

	describe('pinned reviews', () => {
		function pinnedIds(): number[] {
			return listDiaryEntries(database.db, ada.id)
				.filter((item) => item.pinned)
				.map((item) => item.id);
		}

		it('pins and unpins a review', () => {
			const id = createDiaryEntry(database.db, ada.id, work(0), entry());

			expect(setPinned(database.db, ada.id, id, true)).toBe('done');
			expect(pinnedIds()).toEqual([id]);
			expect(setPinned(database.db, ada.id, id, false)).toBe('done');
			expect(pinnedIds()).toEqual([]);
		});

		it('pins two reviews at most', () => {
			const ids = [0, 1, 2].map((index) =>
				createDiaryEntry(database.db, ada.id, work(index), entry())
			);

			expect(setPinned(database.db, ada.id, ids[0] ?? 0, true)).toBe('done');
			expect(setPinned(database.db, ada.id, ids[1] ?? 0, true)).toBe('done');
			expect(setPinned(database.db, ada.id, ids[2] ?? 0, true)).toBe('limit_reached');
			expect(setPinned(database.db, ada.id, ids[1] ?? 0, true)).toBe('done');
			expect(pinnedIds()).toHaveLength(2);
		});

		it('refuses an entry without review or of another account', () => {
			const silent = createDiaryEntry(database.db, ada.id, work(0), entry({ review: '' }));
			const foreign = createDiaryEntry(database.db, grace.id, work(1), entry());

			expect(setPinned(database.db, ada.id, silent, true)).toBe('not_found');
			expect(setPinned(database.db, ada.id, foreign, true)).toBe('not_found');
			expect(setPinned(database.db, ada.id, 9999, true)).toBe('not_found');
		});

		it('unpins a review once its text is removed', () => {
			const id = createDiaryEntry(database.db, ada.id, work(0), entry());
			setPinned(database.db, ada.id, id, true);

			updateDiaryEntry(database.db, ada.id, id, entry({ review: '' }));

			expect(pinnedIds()).toEqual([]);
		});
	});
});

describe('parseProfileForm', () => {
	function form(fields: Record<string, string>): FormData {
		const data = new FormData();
		for (const [name, value] of Object.entries(fields)) data.set(name, value);
		return data;
	}

	it('trims the fields', () => {
		expect(parseProfileForm(form({ bio: ' Hi. ', location: ' Here ' }))).toEqual({
			ok: true,
			value: { bio: 'Hi.', location: 'Here' }
		});
	});

	it('refuses fields that are too long', () => {
		expect(parseProfileForm(form({ bio: 'a'.repeat(1001) }))).toEqual({
			ok: false,
			error: 'bio_too_long'
		});
		expect(parseProfileForm(form({ location: 'a'.repeat(101) }))).toEqual({
			ok: false,
			error: 'location_too_long'
		});
	});
});
