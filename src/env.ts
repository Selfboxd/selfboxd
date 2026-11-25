import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATA_DIR: {
		description: 'Directory holding the database, uploaded images and keys.',
		schema: (value) => value || './data'
	}
});
