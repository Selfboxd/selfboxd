/** Page a browse is shown on: the catalogue, or the works of a studio or a network. */
export type BrowseTarget = { page: 'browse' } | { page: 'studio' | 'network'; id: number };
