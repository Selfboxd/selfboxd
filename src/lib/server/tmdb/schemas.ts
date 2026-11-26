import * as v from 'valibot';

const optionalText = v.nullish(v.string());

const provider = v.object({
	provider_id: v.number(),
	provider_name: v.string(),
	logo_path: optionalText
});

const providerList = v.optional(v.array(provider), []);

export const filmSummarySchema = v.object({
	id: v.number(),
	title: v.string(),
	release_date: optionalText,
	poster_path: optionalText,
	backdrop_path: optionalText
});

export const filmDetailsSchema = v.object({
	id: v.number(),
	title: v.string(),
	original_title: v.string(),
	original_language: v.string(),
	release_date: optionalText,
	tagline: optionalText,
	overview: optionalText,
	runtime: v.nullish(v.number()),
	poster_path: optionalText,
	backdrop_path: optionalText,
	vote_average: v.number(),
	vote_count: v.number(),
	genres: v.array(v.object({ id: v.number(), name: v.string() })),
	production_companies: v.array(v.object({ id: v.number(), name: v.string() })),
	production_countries: v.array(v.object({ iso_3166_1: v.string() })),
	spoken_languages: v.array(v.object({ iso_639_1: v.string() })),
	belongs_to_collection: v.nullish(v.object({ id: v.number(), name: v.string() })),
	alternative_titles: v.optional(
		v.object({ titles: v.optional(v.array(v.object({ title: v.string() })), []) }),
		{ titles: [] }
	),
	credits: v.object({
		cast: v.array(
			v.object({
				id: v.number(),
				name: v.string(),
				character: optionalText,
				profile_path: optionalText
			})
		),
		crew: v.array(v.object({ id: v.number(), name: v.string(), job: v.string() }))
	}),
	videos: v.object({
		results: v.array(
			v.object({
				site: v.string(),
				type: v.string(),
				key: v.string(),
				official: v.optional(v.boolean(), false)
			})
		)
	}),
	release_dates: v.object({
		results: v.array(
			v.object({
				iso_3166_1: v.string(),
				release_dates: v.array(
					v.object({
						release_date: v.string(),
						type: v.number(),
						certification: v.optional(v.string(), '')
					})
				)
			})
		)
	}),
	'watch/providers': v.object({
		results: v.record(
			v.string(),
			v.object({
				link: v.string(),
				flatrate: providerList,
				rent: providerList,
				buy: providerList
			})
		)
	})
});

export const collectionSchema = v.object({
	id: v.number(),
	name: v.string(),
	parts: v.array(filmSummarySchema)
});

export const filmSearchSchema = v.object({
	page: v.number(),
	total_pages: v.number(),
	total_results: v.number(),
	results: v.array(v.object({ ...filmSummarySchema.entries, original_title: v.string() }))
});

export type RawFilmDetails = v.InferOutput<typeof filmDetailsSchema>;
export type RawFilmSummary = v.InferOutput<typeof filmSummarySchema>;
export type RawCollection = v.InferOutput<typeof collectionSchema>;

export const filmListSchema = v.object({ results: v.array(filmSummarySchema) });

export const filmPageSchema = v.object({
	page: v.number(),
	total_pages: v.number(),
	total_results: v.optional(v.number(), 0),
	results: v.array(filmSummarySchema)
});

export const genreListSchema = v.object({
	genres: v.array(v.object({ id: v.number(), name: v.string() }))
});

export const seriesSummarySchema = v.object({
	id: v.number(),
	name: v.string(),
	first_air_date: optionalText,
	poster_path: optionalText,
	backdrop_path: optionalText
});

export type RawSeriesSummary = v.InferOutput<typeof seriesSummarySchema>;

export const seriesListSchema = v.object({ results: v.array(seriesSummarySchema) });

export const seriesPageSchema = v.object({
	page: v.number(),
	total_pages: v.number(),
	total_results: v.optional(v.number(), 0),
	results: v.array(seriesSummarySchema)
});

export const seriesDetailsSchema = v.object({
	id: v.number(),
	name: v.string(),
	original_name: v.string(),
	original_language: v.string(),
	first_air_date: optionalText,
	last_air_date: optionalText,
	tagline: optionalText,
	overview: optionalText,
	poster_path: optionalText,
	backdrop_path: optionalText,
	vote_average: v.number(),
	vote_count: v.number(),
	status: optionalText,
	number_of_seasons: v.optional(v.number(), 0),
	number_of_episodes: v.optional(v.number(), 0),
	episode_run_time: v.optional(v.array(v.number()), []),
	genres: v.array(v.object({ id: v.number(), name: v.string() })),
	created_by: v.optional(v.array(v.object({ id: v.number(), name: v.string() })), []),
	networks: v.optional(v.array(v.object({ id: v.number(), name: v.string() })), []),
	production_companies: v.optional(v.array(v.object({ id: v.number(), name: v.string() })), []),
	origin_country: v.optional(v.array(v.string()), []),
	spoken_languages: v.optional(v.array(v.object({ iso_639_1: v.string() })), []),
	seasons: v.optional(
		v.array(
			v.object({
				season_number: v.number(),
				name: v.string(),
				air_date: optionalText,
				poster_path: optionalText,
				episode_count: v.optional(v.number(), 0)
			})
		),
		[]
	),
	alternative_titles: v.optional(
		v.object({ results: v.optional(v.array(v.object({ title: v.string() })), []) }),
		{ results: [] }
	),
	credits: filmDetailsSchema.entries.credits,
	videos: filmDetailsSchema.entries.videos,
	'watch/providers': filmDetailsSchema.entries['watch/providers']
});

export type RawSeriesDetails = v.InferOutput<typeof seriesDetailsSchema>;

export const multiSearchSchema = v.object({
	page: v.number(),
	total_pages: v.number(),
	total_results: v.number(),
	results: v.array(
		v.object({
			id: v.number(),
			media_type: v.optional(v.string(), ''),
			title: optionalText,
			name: optionalText,
			original_title: optionalText,
			original_name: optionalText,
			release_date: optionalText,
			first_air_date: optionalText,
			poster_path: optionalText,
			profile_path: optionalText,
			known_for_department: optionalText,
			known_for: v.optional(v.array(v.object({ title: optionalText, name: optionalText })), [])
		})
	)
});

const personCredit = {
	id: v.number(),
	media_type: v.optional(v.string(), ''),
	title: optionalText,
	name: optionalText,
	release_date: optionalText,
	first_air_date: optionalText,
	poster_path: optionalText,
	vote_average: v.optional(v.number(), 0),
	vote_count: v.optional(v.number(), 0),
	genre_ids: v.optional(v.array(v.number()), []),
	episode_count: v.nullish(v.number())
};

export const personSchema = v.object({
	id: v.number(),
	name: v.string(),
	biography: optionalText,
	birthday: optionalText,
	deathday: optionalText,
	place_of_birth: optionalText,
	profile_path: optionalText,
	known_for_department: optionalText,
	combined_credits: v.optional(
		v.object({
			cast: v.optional(v.array(v.object({ ...personCredit, character: optionalText })), []),
			crew: v.optional(v.array(v.object({ ...personCredit, job: v.string() })), [])
		}),
		{ cast: [], crew: [] }
	)
});

export type RawPerson = v.InferOutput<typeof personSchema>;

export const companySchema = v.object({
	id: v.number(),
	name: v.string(),
	description: optionalText,
	headquarters: optionalText,
	homepage: optionalText,
	logo_path: optionalText,
	origin_country: optionalText
});

export type RawCompany = v.InferOutput<typeof companySchema>;

export const regionListSchema = v.object({
	results: v.array(v.object({ iso_3166_1: v.string(), english_name: v.string() }))
});

export const providerListSchema = v.object({
	results: v.array(
		v.object({
			provider_id: v.number(),
			provider_name: v.string(),
			logo_path: optionalText,
			display_priority: v.optional(v.number(), 999)
		})
	)
});

const imageSchema = v.object({
	file_path: v.string(),
	width: v.optional(v.number(), 0),
	height: v.optional(v.number(), 0)
});

export const imagesSchema = v.object({
	posters: v.optional(v.array(imageSchema), []),
	backdrops: v.optional(v.array(imageSchema), [])
});
