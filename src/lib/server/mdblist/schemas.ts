import * as v from 'valibot';

export const listSchema = v.object({
	id: v.number(),
	name: v.string(),
	user_name: v.nullish(v.string()),
	items: v.nullish(v.number()),
	likes: v.nullish(v.number())
});

export const listArraySchema = v.array(listSchema);

export const listItemsSchema = v.object({
	movies: v.optional(
		v.array(
			v.object({
				id: v.number(),
				title: v.string(),
				release_year: v.nullish(v.number()),
				ids: v.nullish(v.object({ tmdb: v.nullish(v.number()) }))
			})
		),
		[]
	)
});

/** Shape of a cached MDBList response: the body and whether more pages follow. */
export const cachedSchema = v.object({ body: v.unknown(), hasMore: v.boolean() });
