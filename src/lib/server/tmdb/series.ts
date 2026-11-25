import type { Season, Series, SeriesSummary } from '../../catalog/series';
import { findTrailer, groupCrew, otherTitles, toWatch, yearOf } from './film';
import type { RawSeriesDetails, RawSeriesSummary } from './schemas';

/** TMDB statuses of a series that will air no new episode. */
const endedStatuses = new Set(['Ended', 'Canceled']);

export function toSeriesSummary(raw: RawSeriesSummary): SeriesSummary {
	return {
		id: raw.id,
		title: raw.name,
		year: yearOf(raw.first_air_date),
		posterPath: raw.poster_path ?? null
	};
}

function toSeasons(raw: RawSeriesDetails['seasons']): Season[] {
	const seasons = raw.map((season) => ({
		number: season.season_number,
		name: season.name,
		year: yearOf(season.air_date),
		posterPath: season.poster_path ?? null,
		episodeCount: season.episode_count
	}));
	return [
		...seasons.filter((season) => season.number > 0),
		...seasons.filter((season) => season.number === 0)
	];
}

/** Converts a TMDB series into the series shown by the interface, for the given country. */
export function toSeries(raw: RawSeriesDetails, region: string): Series {
	const ended = endedStatuses.has(raw.status ?? '');
	const runtime = raw.episode_run_time.find((minutes) => minutes > 0);
	return {
		...toSeriesSummary(raw),
		originalTitle: raw.original_name,
		tagline: raw.tagline ?? '',
		overview: raw.overview ?? '',
		backdropPath: raw.backdrop_path ?? null,
		rating: { average: raw.vote_average, count: raw.vote_count },
		creators: raw.created_by.map((person) => ({ id: person.id, name: person.name })),
		cast: raw.credits.cast.map((member) => ({
			id: member.id,
			name: member.name,
			character: member.character ?? ''
		})),
		crew: groupCrew(raw.credits.crew, null),
		genres: raw.genres.map((genre) => genre.name),
		networks: raw.networks.map((network) => network.name),
		studios: raw.production_companies.map((company) => company.name),
		countries: raw.origin_country,
		originalLanguage: raw.original_language,
		spokenLanguages: raw.spoken_languages.map((language) => language.iso_639_1),
		trailerKey: findTrailer(raw.videos.results),
		watch: toWatch(raw['watch/providers'], region),
		seasonCount: raw.number_of_seasons,
		episodeCount: raw.number_of_episodes,
		ended,
		endYear: ended ? yearOf(raw.last_air_date) : null,
		episodeRuntime: runtime ?? null,
		seasons: toSeasons(raw.seasons),
		alternativeTitles: otherTitles(
			raw.alternative_titles.results.map((entry) => entry.title),
			[raw.name, raw.original_name]
		)
	};
}
