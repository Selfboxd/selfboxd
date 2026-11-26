import type { RequestEvent } from '@sveltejs/kit';
import type { ImageChoice, WorkImages } from '../../catalog/images';
import type { WorkKind } from '../../catalog/library';
import { requireUser } from '../auth/guards';
import { getDatabase } from '../db/index';
import { getImageChoice, setImageChoice } from '../library/images';
import { getProfile, setBanner } from '../library/profile';
import { filmIdPattern, loadWorkDetails, saveDetails } from '../library/resolve';
import { findWork } from '../library/works';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage } from '../tmdb/page';
import { getImages } from '../tmdb/service';
import { tmdbErrorStatus } from '../tmdb/status';
import { apiError, apiJson, readJsonObject } from './responses';

type ImagesEvent = Pick<RequestEvent<{ id: string }>, 'locals' | 'params' | 'request'>;

/** Everything the poster and backdrop dialogs show for a work. */
export interface WorkImagesView {
	title: string;
	year: number | null;
	/** Directors of a film, creators of a series. */
	people: string[];
	/** Pictures TMDB gives the work by default. */
	defaults: ImageChoice;
	images: WorkImages;
	choice: ImageChoice;
	/** Banner of the profile of the account. */
	banner: string | null;
}

async function load(kind: WorkKind, id: string) {
	const context = getTmdbContext();
	if (!context) return { error: apiError(503, 'tmdb_not_configured') } as const;
	const [details, images] = await Promise.all([
		loadWorkDetails(context, kind, id),
		getImages(context, kind, Number(id), requestLanguage())
	]);
	if (!details.ok)
		return { error: apiError(tmdbErrorStatus(details.error), details.error) } as const;
	if (!images.ok) return { error: apiError(tmdbErrorStatus(images.error), images.error) } as const;
	return { details: details.value, images: images.value } as const;
}

function view(
	userId: number,
	details: Extract<Awaited<ReturnType<typeof load>>, { details: unknown }>['details'],
	images: WorkImages,
	choice: ImageChoice
): WorkImagesView {
	const people = 'directors' in details ? details.directors : details.creators;
	return {
		title: details.title,
		year: details.year,
		people: people.map((person) => person.name),
		defaults: { poster: details.posterPath, backdrop: details.backdropPath },
		images,
		choice,
		banner: getProfile(getDatabase(), userId).bannerPath
	};
}

/** Answers with the pictures of a work and those the signed-in account chose. */
export async function getWorkImages(
	kind: WorkKind,
	{ locals, params }: ImagesEvent
): Promise<Response> {
	const { user } = requireUser(locals);
	if (!filmIdPattern.test(params.id)) return apiError(404, 'not_found');
	const loaded = await load(kind, params.id);
	if ('error' in loaded) return loaded.error;
	const work = findWork(getDatabase(), kind, params.id);
	const choice = work
		? getImageChoice(getDatabase(), user.id, work.id)
		: { poster: null, backdrop: null };
	return apiJson(view(user.id, loaded.details, loaded.images, choice));
}

/**
 * Reads a picture of the body: `undefined` when absent, `null` to go back to TMDB,
 * or a path TMDB offers for the work. Returns `false` for anything else.
 */
function picture(
	body: Record<string, unknown>,
	name: string,
	offered: string[]
): string | null | undefined | false {
	const value = body[name];
	if (value === undefined || value === null) return value;
	return typeof value === 'string' && offered.includes(value) ? value : false;
}

/** Changes the poster, the backdrop or the profile banner of the signed-in account. */
export async function putWorkImages(
	kind: WorkKind,
	{ locals, params, request }: ImagesEvent
): Promise<Response> {
	const { user } = requireUser(locals);
	if (!filmIdPattern.test(params.id)) return apiError(404, 'not_found');
	const body = await readJsonObject(request);
	if (!body) return apiError(400, 'invalid_request');
	const loaded = await load(kind, params.id);
	if ('error' in loaded) return loaded.error;

	const { details, images } = loaded;
	const posters = [...images.posters.map((image) => image.path), details.posterPath ?? ''];
	const backdrops = [...images.backdrops.map((image) => image.path), details.backdropPath ?? ''];
	const poster = picture(body, 'poster', posters);
	const backdrop = picture(body, 'backdrop', backdrops);
	const banner = picture(body, 'banner', backdrops);
	if (poster === false || backdrop === false || banner === false) {
		return apiError(400, 'invalid_request');
	}

	const db = getDatabase();
	const work = saveDetails(kind, details);
	const change: Partial<ImageChoice> = {};
	if (poster !== undefined) change.poster = poster === details.posterPath ? null : poster;
	if (backdrop !== undefined) change.backdrop = backdrop === details.backdropPath ? null : backdrop;
	const choice =
		Object.keys(change).length > 0
			? setImageChoice(db, user.id, work.id, change)
			: getImageChoice(db, user.id, work.id);
	if (banner !== undefined) setBanner(db, user.id, banner);
	return apiJson(view(user.id, details, images, choice));
}
