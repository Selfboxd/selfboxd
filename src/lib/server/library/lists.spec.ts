import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from '../auth/users';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { parseId, parseListForm } from './forms';
import {
	createList,
	appendToList,
	createListWithWorks,
	deleteList,
	getList,
	listLists,
	listMembership,
	removeListItem,
	reorderList,
	setListItemNote,
	setMembership,
	updateList
} from './lists';
import { saveWork } from './works';

const input = { name: 'Favourites', description: '', ranked: false };

describe('lists', () => {
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

	function titles(listId: number, user = ada): string[] {
		return getList(database.db, user.id, listId)?.items.map((item) => item.work.title) ?? [];
	}

	function filled(): number {
		const id = createList(database.db, ada.id, input);
		for (const index of [0, 1, 2]) setMembership(database.db, ada.id, work(index), [id]);
		return id;
	}

	it('creates a list and reads it back', () => {
		const now = new Date('2026-05-01T10:00:00Z');
		const id = createList(
			database.db,
			ada.id,
			{ ...input, description: 'Best.', ranked: true },
			now
		);

		expect(getList(database.db, ada.id, id)).toEqual({
			id,
			name: 'Favourites',
			description: 'Best.',
			ranked: true,
			updatedAt: now.toISOString(),
			items: []
		});
	});

	it('creates a list holding works in order, each once', () => {
		const id = createListWithWorks(
			database.db,
			ada.id,
			input,
			[works[2], works[0], works[2]].map(Number)
		);

		expect(getList(database.db, ada.id, id)?.items.map((item) => item.work.title)).toEqual([
			'Three',
			'One'
		]);
	});

	it('appends works in the order they are added', () => {
		expect(titles(filled())).toEqual(['One', 'Two', 'Three']);
	});

	it('appends the works a list misses, in order, and only to a list of the account', () => {
		const id = createListWithWorks(
			database.db,
			ada.id,
			{ name: 'Some', description: '', ranked: false },
			[work(1)]
		);

		expect(appendToList(database.db, ada.id, id, [work(2), work(1), work(0), work(2)])).toBe(true);
		expect(titles(id)).toEqual(['Two', 'Three', 'One']);
		expect(appendToList(database.db, grace.id, id, [work(0)])).toBe(false);
		expect(appendToList(database.db, ada.id, 9999, [work(0)])).toBe(false);
		expect(titles(id)).toEqual(['Two', 'Three', 'One']);
	});

	it('puts a work in exactly the requested lists', () => {
		const first = createList(database.db, ada.id, input);
		const second = createList(database.db, ada.id, input);
		setMembership(database.db, ada.id, work(0), [first, second]);

		setMembership(database.db, ada.id, work(0), [second]);

		expect(listMembership(database.db, ada.id, work(0))).toEqual([second]);
		expect(titles(first)).toEqual([]);
	});

	it('does not add a work twice', () => {
		const id = createList(database.db, ada.id, input);

		setMembership(database.db, ada.id, work(0), [id, id]);
		setMembership(database.db, ada.id, work(0), [id]);

		expect(titles(id)).toEqual(['One']);
	});

	it('summarises lists with their count and first works, latest change first', () => {
		const old = createList(database.db, ada.id, input, new Date('2026-01-01'));
		const recent = createList(
			database.db,
			ada.id,
			{ ...input, name: 'Recent' },
			new Date('2026-02-01')
		);
		setMembership(database.db, ada.id, work(0), [old], new Date('2026-03-01'));

		expect(listLists(database.db, ada.id)).toMatchObject([
			{ id: old, count: 1, preview: [{ title: 'One' }] },
			{ id: recent, count: 0, preview: [] }
		]);
	});

	it('applies a new order', () => {
		const id = filled();

		expect(reorderList(database.db, ada.id, id, [work(2), work(0), work(1)])).toBe(true);

		expect(titles(id)).toEqual(['Three', 'One', 'Two']);
	});

	it('refuses an order that misses, repeats or adds a work', () => {
		const id = createList(database.db, ada.id, input);
		setMembership(database.db, ada.id, work(0), [id]);
		setMembership(database.db, ada.id, work(1), [id]);

		expect(reorderList(database.db, ada.id, id, [work(1)])).toBe(false);
		expect(reorderList(database.db, ada.id, id, [work(1), work(1)])).toBe(false);
		expect(reorderList(database.db, ada.id, id, [work(1), work(2)])).toBe(false);
		expect(reorderList(database.db, ada.id, id, [work(1), work(0), work(2)])).toBe(false);
		expect(titles(id)).toEqual(['One', 'Two']);
	});

	it('removes a work and keeps the order of the others', () => {
		const id = filled();

		expect(removeListItem(database.db, ada.id, id, work(1))).toBe(true);

		expect(titles(id)).toEqual(['One', 'Three']);
		expect(removeListItem(database.db, ada.id, id, work(1))).toBe(false);
	});

	it('stores a note for a work of the list', () => {
		const id = filled();

		expect(setListItemNote(database.db, ada.id, id, work(0), 'The best.')).toBe(true);

		expect(getList(database.db, ada.id, id)?.items[0]?.note).toBe('The best.');
	});

	it('updates and deletes a list with its items', () => {
		const id = filled();

		expect(updateList(database.db, ada.id, id, { ...input, name: 'Renamed' })).toBe(true);
		expect(getList(database.db, ada.id, id)?.name).toBe('Renamed');
		expect(deleteList(database.db, ada.id, id)).toBe(true);
		expect(getList(database.db, ada.id, id)).toBeUndefined();
		expect(listMembership(database.db, ada.id, work(0))).toEqual([]);
	});

	it('never lets an account read or change the list of another account', () => {
		const id = filled();

		expect(getList(database.db, grace.id, id)).toBeUndefined();
		expect(listLists(database.db, grace.id)).toEqual([]);
		expect(updateList(database.db, grace.id, id, { ...input, name: 'Hijacked' })).toBe(false);
		expect(deleteList(database.db, grace.id, id)).toBe(false);
		expect(removeListItem(database.db, grace.id, id, work(0))).toBe(false);
		expect(reorderList(database.db, grace.id, id, [work(2), work(1), work(0)])).toBe(false);
		expect(setListItemNote(database.db, grace.id, id, work(0), 'Hijacked')).toBe(false);
		setMembership(database.db, grace.id, work(0), []);
		setMembership(database.db, grace.id, work(1), [id]);

		expect(titles(id)).toEqual(['One', 'Two', 'Three']);
		expect(getList(database.db, ada.id, id)?.name).toBe('Favourites');
	});
});

describe('parseListForm', () => {
	function form(fields: Record<string, string>): FormData {
		const data = new FormData();
		for (const [name, value] of Object.entries(fields)) data.set(name, value);
		return data;
	}

	it('trims the fields and reads the ranking', () => {
		expect(parseListForm(form({ name: ' Noir ', description: ' Dark. ', ranked: 'on' }))).toEqual({
			ok: true,
			value: { name: 'Noir', description: 'Dark.', ranked: true }
		});
	});

	it('requires a name', () => {
		expect(parseListForm(form({ name: '   ' }))).toEqual({
			ok: false,
			error: 'list_name_required'
		});
	});

	it('refuses a name or a description that is too long', () => {
		expect(parseListForm(form({ name: 'a'.repeat(101) }))).toEqual({
			ok: false,
			error: 'list_name_too_long'
		});
		expect(parseListForm(form({ name: 'a', description: 'a'.repeat(2001) }))).toEqual({
			ok: false,
			error: 'list_description_too_long'
		});
	});
});

describe('parseId', () => {
	it('accepts positive whole numbers only', () => {
		expect(parseId('42')).toBe(42);
		for (const value of ['', '0', '-1', '1.5', '1e3', ' 1', 'abc', '1'.repeat(13)]) {
			expect(parseId(value)).toBeUndefined();
		}
	});
});
