import { getWorkImages, putWorkImages } from '#lib/server/api/work-images.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => getWorkImages('film', event);

export const PUT: RequestHandler = (event) => putWorkImages('film', event);
