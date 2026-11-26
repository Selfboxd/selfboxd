import type { WorkKind } from '../../catalog/library';
import {
	applyWatchedOptions,
	parseWatchedOptions,
	watchedDecades,
	type WatchedOptions
} from '../../catalog/watched-view';
import { getDatabase } from '../db/index';
import { getTmdbContext } from '../tmdb/index';
import { genreChoices } from './list-page';
import { loadWorkDetails } from './resolve';
import { chosenServices, streamingOn } from './services';
import { listWatched } from './watched';

/** The watched films or series of an account, filtered and sorted as the query string asks. */
export async function loadWatchedPage(userId: number, kind: WorkKind, params: URLSearchParams) {
	const all = listWatched(getDatabase(), userId).filter((row) => row.work.kind === kind);
	const parsed = parseWatchedOptions(params);
	const services = await chosenServices(userId);
	const options: WatchedOptions = {
		...parsed,
		service: services.some((service) => service.id === parsed.service) ? parsed.service : null
	};
	const context = getTmdbContext();
	const needsDetails = (options.genre !== null || options.service !== null) && context;
	const rows = needsDetails
		? await Promise.all(
				all.map(async (row) => {
					const { externalId } = row.work;
					const [details, streams] = await Promise.all([
						options.genre === null ? undefined : loadWorkDetails(context, kind, externalId),
						options.service === null ? undefined : streamingOn(kind, externalId)
					]);
					return {
						...row,
						...(details ? { genres: details.ok ? details.value.genres : [] } : {}),
						...(streams ? { services: streams } : {})
					};
				})
			)
		: all;
	return {
		options,
		works: applyWatchedOptions(rows, options),
		total: all.length,
		decades: watchedDecades(all),
		genres: await genreChoices(),
		services
	};
}
