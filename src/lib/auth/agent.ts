const browsers: [RegExp, string][] = [
	[/Edg(?:e|A|iOS)?\//, 'Edge'],
	[/OPR\/|Opera/, 'Opera'],
	[/Firefox\/|FxiOS\//, 'Firefox'],
	[/Chrome\/|CriOS\//, 'Chrome'],
	[/Safari\//, 'Safari']
];

const systems: [RegExp, string][] = [
	[/Android/, 'Android'],
	[/iPhone|iPad|iPod/, 'iOS'],
	[/Windows/, 'Windows'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/CrOS/, 'ChromeOS'],
	[/Linux/, 'Linux']
];

/** A short name for a browser user agent, such as "Chrome, Linux", or the label itself when unknown. */
export function describeAgent(label: string): string {
	const browser = browsers.find(([pattern]) => pattern.test(label))?.[1];
	const system = systems.find(([pattern]) => pattern.test(label))?.[1];
	if (!browser && !system) return label;
	return [browser, system].filter(Boolean).join(', ');
}
