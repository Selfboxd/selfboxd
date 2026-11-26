import { describe, expect, it } from 'vitest';
import { describeAgent } from './agent';

describe('describeAgent', () => {
	it('names the browser and the system', () => {
		expect(
			describeAgent(
				'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36'
			)
		).toBe('Chrome, Linux');
		expect(
			describeAgent(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
			)
		).toBe('Safari, iOS');
		expect(
			describeAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
			)
		).toBe('Edge, Windows');
		expect(describeAgent('Mozilla/5.0 (Macintosh; rv:132.0) Gecko/20100101 Firefox/132.0')).toBe(
			'Firefox, macOS'
		);
	});

	it('keeps a label it does not know', () => {
		expect(describeAgent('Pixel phone')).toBe('Pixel phone');
	});
});
