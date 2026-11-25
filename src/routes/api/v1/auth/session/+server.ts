import { apiJson } from '#lib/server/api/responses.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => apiJson({ user: locals.user });
