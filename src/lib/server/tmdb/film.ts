import type { RawCollection, RawFilmDetails, RawFilmSummary } from './schemas';

import {
	releaseTypes,
	type CrewGroup,
	type Film,
	type FilmCollection,
	type FilmSummary,
	type Person,
	type Release,
	type WatchProviders
} from '../../catalog/film';

const directorJob = 'Director';

/** Only links to this site are accepted from TMDB responses. */
const tmdbSite = 'https://www.themoviedb.org/';

export function yearOf(date: string | null | undefined): number | null {
	const year = Number(date?.slice(0, 4));
	return Number.isInteger(year) && year > 0 ? year : null;
}

export function toFilmSummary(raw: RawFilmSummary): FilmSummary {
	return {
		id: raw.id,
		title: raw.title,
		year: yearOf(raw.release_date),
		posterPath: raw.poster_path ?? null
	};
}

/** Groups the crew by job, in order of first appearance, leaving out one job. */
export function groupCrew(
	crew: RawFilmDetails['credits']['crew'],
	excluded: string | null = directorJob
): CrewGroup[] {
	const groups = new Map<string, Person[]>();
	for (const member of crew) {
		if (member.job === excluded) continue;
		const people = groups.get(member.job) ?? [];
		if (!people.some((person) => person.id === member.id)) {
			people.push({ id: member.id, name: member.name });
		}
		groups.set(member.job, people);
	}
	return [...groups].map(([job, people]) => ({ job, people }));
}

export function findTrailer(videos: RawFilmDetails['videos']['results']): string | null {
	const trailers = videos.filter((video) => video.site === 'YouTube' && video.type === 'Trailer');
	return (trailers.find((video) => video.official) ?? trailers[0])?.key ?? null;
}

function toReleases(raw: RawFilmDetails['release_dates']['results']): Release[] {
	const releases: Release[] = [];
	for (const country of raw) {
		for (const release of country.release_dates) {
			const type = releaseTypes[release.type - 1];
			if (!type) continue;
			releases.push({
				country: country.iso_3166_1,
				date: release.release_date.slice(0, 10),
				type,
				certification: release.certification
			});
		}
	}
	return releases.sort(
		(a, b) => a.date.localeCompare(b.date) || a.country.localeCompare(b.country)
	);
}

export function toProviders(raw: RawFilmDetails['watch/providers']['results'][string]['flatrate']) {
	return raw.map((provider) => ({
		id: provider.provider_id,
		name: provider.provider_name,
		logoPath: provider.logo_path ?? null
	}));
}

/** Distinct titles, leaving out the given ones, in their first order. */
export function otherTitles(titles: string[], known: string[]): string[] {
	const seen = new Set(known.map((title) => title.toLowerCase()));
	return titles.filter((title) => {
		const key = title.trim().toLowerCase();
		if (key === '' || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Offers of a film or a series in the given country, or `null` when TMDB knows none. */
export function toWatch(
	raw: RawFilmDetails['watch/providers'],
	region: string
): WatchProviders | null {
	const offers = raw.results[region];
	return offers
		? {
				link: offers.link.startsWith(tmdbSite) ? offers.link : tmdbSite,
				stream: toProviders(offers.flatrate),
				rent: toProviders(offers.rent),
				buy: toProviders(offers.buy)
			}
		: null;
}

/** Converts a TMDB film into the film shown by the interface, for the given country. */
export function toFilm(raw: RawFilmDetails, region: string): Film {
	return {
		...toFilmSummary(raw),
		originalTitle: raw.original_title,
		tagline: raw.tagline ?? '',
		overview: raw.overview ?? '',
		runtime: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
		backdropPath: raw.backdrop_path ?? null,
		rating: { average: raw.vote_average, count: raw.vote_count },
		directors: raw.credits.crew
			.filter((member) => member.job === directorJob)
			.map((member) => ({ id: member.id, name: member.name })),
		cast: raw.credits.cast.map((member) => ({
			id: member.id,
			name: member.name,
			character: member.character ?? ''
		})),
		crew: groupCrew(raw.credits.crew),
		genres: raw.genres.map((genre) => genre.name),
		studios: raw.production_companies.map(({ id, name }) => ({ id, name })),
		countries: raw.production_countries.map((country) => country.iso_3166_1),
		originalLanguage: raw.original_language,
		spokenLanguages: raw.spoken_languages.map((language) => language.iso_639_1),
		trailerKey: findTrailer(raw.videos.results),
		releases: toReleases(raw.release_dates.results),
		watch: toWatch(raw['watch/providers'], region),
		collection: raw.belongs_to_collection ?? null,
		alternativeTitles: otherTitles(
			raw.alternative_titles.titles.map((entry) => entry.title),
			[raw.title, raw.original_title]
		)
	};
}

/** Converts a TMDB collection, with its films in order of release. */
export function toCollection(raw: RawCollection): FilmCollection {
	const films = raw.parts.map(toFilmSummary);
	films.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity));
	return { id: raw.id, name: raw.name, films };
}
