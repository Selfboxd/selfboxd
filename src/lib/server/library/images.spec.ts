import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import { workImages } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { getImageChoice, listImageChoices, setImageChoice } from './images';
import { saveWork } from './works';

describe('image choices', () => {
	let database: TestDatabase;
	let ada: User;
	let grace: User;
	let film: number;

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
			posterPath: '/default.jpg'
		}).id;
	});

	afterEach(() => {
		database.cleanup();
	});

	it('keeps the poster and the backdrop chosen by an account, by work', () => {
		setImageChoice(database.db, ada.id, film, { poster: '/other.jpg' });
		setImageChoice(database.db, ada.id, film, { backdrop: '/wide.jpg' });

		expect(listImageChoices(database.db, ada.id)).toEqual({
			'film:78': { poster: '/other.jpg', backdrop: '/wide.jpg' }
		});
		expect(listImageChoices(database.db, grace.id)).toEqual({});
	});

	it('forgets a work once both pictures go back to those of TMDB', () => {
		setImageChoice(database.db, ada.id, film, { poster: '/other.jpg', backdrop: '/wide.jpg' });
		setImageChoice(database.db, ada.id, film, { poster: null });
		expect(getImageChoice(database.db, ada.id, film)).toEqual({
			poster: null,
			backdrop: '/wide.jpg'
		});

		setImageChoice(database.db, ada.id, film, { backdrop: null });
		expect(database.db.select().from(workImages).all()).toEqual([]);
	});
});
