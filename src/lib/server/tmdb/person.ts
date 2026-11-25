import {
	jobRoles,
	type PersonCredit,
	type PersonDetails,
	type PersonRole
} from '../../catalog/person';
import type { Studio } from '../../catalog/studio';
import { yearOf } from './film';
import type { RawCompany, RawPerson } from './schemas';

/** TMDB genres of series that are not works of a person: talk shows, news and reality. */
const hiddenSeriesGenres = new Set([10763, 10764, 10767]);

/** Fewest episodes of a series an actor must play in for the series to be among their works. */
const actorEpisodeMinimum = 3;

/** Characters of people appearing as themselves. */
const selfPattern = /^(self|himself|herself|themselves)\b/i;

type RawCredit = RawPerson['combined_credits']['cast'][number];

function toCredit(raw: RawCredit, role: PersonRole, character: string): PersonCredit | null {
	if (raw.media_type !== 'movie' && raw.media_type !== 'tv') return null;
	const film = raw.media_type === 'movie';
	if (!film && raw.genre_ids.some((genre) => hiddenSeriesGenres.has(genre))) return null;
	if (
		!film &&
		role === 'actor' &&
		(selfPattern.test(character) || (raw.episode_count ?? Infinity) < actorEpisodeMinimum)
	) {
		return null;
	}
	return {
		kind: film ? 'film' : 'series',
		id: raw.id,
		title: (film ? raw.title : raw.name) ?? '',
		year: yearOf(film ? raw.release_date : raw.first_air_date),
		posterPath: raw.poster_path ?? null,
		role,
		character,
		votes: raw.vote_count,
		rating: raw.vote_average,
		genres: raw.genre_ids
	};
}

/** Credits of a person, one per work and role, joining the characters of an actor. */
export function toCredits(raw: RawPerson['combined_credits']): PersonCredit[] {
	const credits = new Map<string, PersonCredit>();
	const add = (credit: PersonCredit | null) => {
		if (!credit) return;
		const key = `${credit.role}:${credit.kind}:${String(credit.id)}`;
		const known = credits.get(key);
		if (!known) {
			credits.set(key, credit);
		} else if (credit.character && !known.character.split(' / ').includes(credit.character)) {
			known.character = known.character
				? `${known.character} / ${credit.character}`
				: credit.character;
		}
	};
	for (const entry of raw.cast) add(toCredit(entry, 'actor', entry.character?.trim() ?? ''));
	for (const entry of raw.crew) {
		const role = jobRoles[entry.job];
		if (role) add(toCredit(entry, role, ''));
	}
	return [...credits.values()];
}

export function toPerson(raw: RawPerson): PersonDetails {
	return {
		id: raw.id,
		name: raw.name,
		biography: raw.biography?.replaceAll('\u00a0', ' ').trim() ?? '',
		birthday: raw.birthday || null,
		deathday: raw.deathday || null,
		placeOfBirth: raw.place_of_birth || null,
		profilePath: raw.profile_path ?? null,
		department: raw.known_for_department ?? '',
		credits: toCredits(raw.combined_credits)
	};
}

export function toStudio(raw: RawCompany): Studio {
	return {
		id: raw.id,
		name: raw.name,
		description: raw.description?.trim() ?? '',
		headquarters: raw.headquarters || null,
		country: raw.origin_country || null,
		logoPath: raw.logo_path ?? null
	};
}
