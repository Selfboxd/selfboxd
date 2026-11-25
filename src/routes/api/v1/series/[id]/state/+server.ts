import { getState, patchState } from '#lib/server/api/work-state.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => getState('series', event);

export const PATCH: RequestHandler = (event) => patchState('series', event);
