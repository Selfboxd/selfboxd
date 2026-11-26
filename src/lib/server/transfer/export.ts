import type { Work } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { listDiaryEntries } from '../library/diary';
import { getList, listLists } from '../library/lists';
import { getProfile, listFavourites, listLiked } from '../library/profile';
import { listWatched } from '../library/watched';
import { listWatchlist } from '../library/watchlist';
import { toCsv } from './csv';

/** Columns that name a work in every file of the export. */
const workHeader = ['Name', 'Year', 'Type', 'TMDB ID'];

function workColumns(work: Work): (string | number | null)[] {
	return [work.title, work.year, work.kind, work.externalId];
}

/** A file name made of the letters and digits of a list name, unique among the others. */
function fileName(name: string, taken: Set<string>): string {
	const base =
		name
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 60) || 'list';
	let candidate = base;
	for (let index = 2; taken.has(candidate); index++) candidate = `${base}-${String(index)}`;
	taken.add(candidate);
	return candidate;
}

/**
 * The data of an account as CSV files, one per part of the library, ratings on a scale of
 * half stars from 0.5 to 5 like the files of Letterboxd.
 */
export function buildAccountExport(
	db: DatabaseExecutor,
	userId: number
): { name: string; content: string }[] {
	const stars = (rating: number | null) => (rating === null ? null : rating / 2);
	const profile = getProfile(db, userId);
	const favourites = listFavourites(db, userId)
		.filter((work) => work !== null)
		.map((work) => `${work.kind}/${work.externalId}`);

	const files = [
		{
			name: 'profile.csv',
			content: toCsv(
				['Bio', 'Location', 'Website', 'Instagram', 'X', 'Favourites'],
				[
					[
						profile.bio,
						profile.location,
						profile.links.website,
						profile.links.instagram,
						profile.links.x,
						favourites.join(', ')
					]
				]
			)
		},
		{
			name: 'diary.csv',
			content: toCsv(
				[
					'Watched Date',
					...workHeader,
					'Season',
					'Rating',
					'Liked',
					'Rewatch',
					'Review',
					'Spoilers',
					'Tags'
				],
				listDiaryEntries(db, userId).map((entry) => [
					entry.watchedOn,
					...workColumns(entry.work),
					entry.season,
					stars(entry.rating),
					entry.liked ? 'Yes' : '',
					entry.rewatch ? 'Yes' : '',
					entry.review,
					entry.containsSpoilers ? 'Yes' : '',
					entry.tags.join(', ')
				])
			)
		},
		{
			name: 'watched.csv',
			content: toCsv(
				[...workHeader, 'Rating', 'Liked'],
				listWatched(db, userId).map((entry) => [
					...workColumns(entry.work),
					stars(entry.rating),
					entry.liked ? 'Yes' : ''
				])
			)
		},
		{
			name: 'likes.csv',
			content: toCsv(
				workHeader,
				listLiked(db, userId).map((entry) => workColumns(entry.work))
			)
		},
		{
			name: 'watchlist.csv',
			content: toCsv(
				['Date', ...workHeader, 'Note', 'Tags'],
				listWatchlist(db, userId).map((item) => [
					item.addedAt.toISOString().slice(0, 10),
					...workColumns(item.work),
					item.note,
					item.tags.join(', ')
				])
			)
		}
	];

	const taken = new Set<string>();
	for (const summary of listLists(db, userId)) {
		const list = getList(db, userId, summary.id);
		if (!list) continue;
		const header = toCsv(
			['Name', 'Description', 'Ranked'],
			[[list.name, list.description, list.ranked ? 'Yes' : '']]
		);
		const items = toCsv(
			['Position', ...workHeader, 'Note'],
			list.items.map((item, index) => [index + 1, ...workColumns(item.work), item.note])
		);
		files.push({
			name: `lists/${fileName(list.name, taken)}.csv`,
			content: `${header}\r\n${items}`
		});
	}
	return files;
}
