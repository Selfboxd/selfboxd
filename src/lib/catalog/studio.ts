/** Whether a company page shows a production company or a television network. */
export type CompanyKind = 'studio' | 'network';

/** A production company or a television network, as shown on its page. */
export interface Studio {
	id: number;
	name: string;
	description: string;
	headquarters: string | null;
	/** ISO 3166-1 code of the country of origin. */
	country: string | null;
	logoPath: string | null;
}
