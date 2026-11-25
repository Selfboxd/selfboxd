import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LikedList } from '../../catalog/list-view';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { isListLiked, listLikedLists, setListLiked } from './list-likes';
import { createList, deleteList } from './lists';

function liked(target: LikedList['target'], name = 'Neon Noir'): LikedList {
	return {
		target,
		name,
		owner: 'curator',
		itemCount: 45,
		preview: [{ id: 78, kind: 'film', title: 'Blade Runner', year: 1982, posterPath: null }]
	};
}

describe('list likes', () => {
	let database: TestDatabase;
	let ada: User;
	let grace: User;

	beforeEach(async () => {
		database = createTestDatabase();
		const created = await Promise.all(
			['ada', 'grace'].map((username) =>
				createUser(database.db, { username, password: 'password-1', isAdmin: false })
			)
		);
		[ada, grace] = created as [User, User];
	});

	afterEach(() => {
		database.cleanup();
	});

	it('likes and unlikes a list for one account', () => {
		setListLiked(database.db, ada.id, liked({ public: 101 }), true);

		expect(isListLiked(database.db, ada.id, { public: 101 })).toBe(true);
		expect(isListLiked(database.db, grace.id, { public: 101 })).toBe(false);
		expect(listLikedLists(database.db, ada.id)).toEqual([liked({ public: 101 })]);

		setListLiked(database.db, ada.id, liked({ public: 101 }), false);
		expect(listLikedLists(database.db, ada.id)).toEqual([]);
	});

	it('lists the most recently liked first and keeps each list once', () => {
		setListLiked(database.db, ada.id, liked({ chart: 'popular' }, 'Popular'), true, new Date(1000));
		setListLiked(database.db, ada.id, liked({ public: 101 }), true, new Date(2000));
		setListLiked(database.db, ada.id, liked({ public: 101 }, 'Renamed'), true, new Date(3000));

		expect(listLikedLists(database.db, ada.id).map((list) => list.name)).toEqual([
			'Renamed',
			'Popular'
		]);
	});

	it('forgets the likes of a personal list when it is deleted', () => {
		const listId = createList(database.db, ada.id, {
			name: 'Mine',
			description: '',
			ranked: false
		});
		setListLiked(database.db, grace.id, liked({ personal: listId }), true);

		deleteList(database.db, ada.id, listId);

		expect(listLikedLists(database.db, grace.id)).toEqual([]);
	});
});
