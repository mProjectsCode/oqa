import { describe, test, expect } from 'bun:test';
import { parseCommandStr } from 'src/commands.ts';

describe('command parser', () => {
	test('test', () => {
		console.log(parseCommandStr('gh r'));

		expect(1).toBe(1);
	});
});
