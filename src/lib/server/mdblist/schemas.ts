import * as v from 'valibot';

export const listSchema = v.object({
	id: v.number(),
	name: v.string(),
	user_name: v.nullish(v.string()),
	items: v.nullish(v.number()),
	likes: v.nullish(v.number())
});

export const listArraySchema = v.array(listSchema);

const listItemSchema = v.object({
	id: v.number(),
	title: v.string(),
	rank: v.nullish(v.number()),
	mediatype: v.nullish(v.string()),
	release_year: v.nullish(v.number()),
	ids: v.nullish(v.object({ tmdb: v.nullish(v.number()) }))
});

export type ListItemRaw = v.InferOutput<typeof listItemSchema>;

/** Items of a list, given either by kind or as one array where each item tells its kind. */
export const listItemsSchema = v.pipe(
	v.union([
		v.array(listItemSchema),
		v.object({
			movies: v.optional(v.array(listItemSchema), []),
			shows: v.optional(v.array(listItemSchema), [])
		})
	]),
	v.transform((body) =>
		Array.isArray(body)
			? {
					movies: body.filter((item) => item.mediatype !== 'show'),
					shows: body.filter((item) => item.mediatype === 'show')
				}
			: body
	)
);

/** Shape of a cached MDBList response: the body and whether more pages follow. */
export const cachedSchema = v.object({ body: v.unknown(), hasMore: v.boolean() });
