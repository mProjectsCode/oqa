import { describe, test, expect } from 'bun:test';
import { runCommandString } from 'src/commands.ts';

describe('command parser', () => {
	test('test', () => {
		console.log(
			runCommandString('gh r', {
				getSearchIndices: async () => [],
			}),
		);

		expect(1).toBe(1);
	});
});
