import { getWorkImages, putWorkImages } from '#lib/server/api/work-images.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => getWorkImages('series', event);

export const PUT: RequestHandler = (event) => putWorkImages('series', event);
