import { getState, patchState } from '#lib/server/api/work-state.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => getState('film', event);

export const PATCH: RequestHandler = (event) => patchState('film', event);
