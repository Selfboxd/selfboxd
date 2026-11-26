import { getStates } from '#lib/server/api/work-state.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => getStates(event);
