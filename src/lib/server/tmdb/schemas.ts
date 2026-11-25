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
	poster_path: optionalText
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
	results: v.array(filmSummarySchema)
});

export type RawFilmDetails = v.InferOutput<typeof filmDetailsSchema>;
export type RawFilmSummary = v.InferOutput<typeof filmSummarySchema>;
export type RawCollection = v.InferOutput<typeof collectionSchema>;
