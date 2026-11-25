import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATA_DIR: {
		description: 'Directory holding the database, uploaded images and keys.',
		schema: (value) => value || './data'
	},
	TMDB_API_URL: {
		description: 'Base URL of the TMDB API.',
		schema: (value) => value || 'https://api.themoviedb.org/3'
	},
	JOURNAL_FEED_URL: {
		description: 'Address of the RSS feed shown on the Journal page.',
		schema: (value) => value || 'https://letterboxd.com/journal/rss/'
	},
	TMDB_IMAGE_URL: {
		description: 'Base URL of the TMDB image host.',
		public: true,
		schema: (value) => value || 'https://image.tmdb.org/t/p'
	}
});
