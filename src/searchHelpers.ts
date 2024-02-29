import FlexSearch from 'flexsearch';
import uFuzzy from '@leeoniya/ufuzzy';
import type { RedirectOption } from 'src/commands.ts';

export enum SearchIndexName {
	HELP = 'helpIndex',
	DOCS = 'docsIndex',
}

export const SearchIndexNames = Object.values(SearchIndexName) as SearchIndexName[];

export interface SearchIndex {
	name: SearchIndexName;
	error: Error | undefined;
	index: EncodedIndex[];
}

export interface EncodedIndex {
	key: string | number;
	data: string;
}

export async function createIndex(indices: SearchIndex[], name: SearchIndexName): Promise<FlexSearch.Index> {
	const index = new FlexSearch.Index('default');

	const searchIndex = indices.find(index => index.name === name);

	if (searchIndex === undefined) {
		throw new Error(`Index ${name} not found`);
	}

	console.log(searchIndex);

	if (searchIndex.error) {
		throw searchIndex.error;
	}

	if (searchIndex.index) {
		console.log('import data');
		for (const { key, data } of searchIndex.index) {
			await index.import(key, data);
		}
	}

	return index;
}

function sortResults(results: string[], query: string, limit: number): RedirectOption[] {
	const fuzzy = new uFuzzy({});

	const idxs = fuzzy.filter(results, query);
	if (idxs === null) {
		throw new Error('No search results found');
	}

	let info = fuzzy.info(idxs, results, query);
	let order = fuzzy.sort(info, results, query);

	let redirects: RedirectOption[] = [];
	for (let i = 0; i < Math.min(order.length, limit); i++) {
		const itemId = order[i];
		const item = results[info.idx[itemId]];

		redirects.push({
			name: item,
			target: '',
			highlights: uFuzzy.highlight(
				item,
				info.ranges[itemId],
				(part, matched) => [part, matched] as [string, boolean],
				[] as [string, boolean][],
				(accum, part) => {
					accum.push(part);
					return accum;
				},
			),
		});
	}

	for (const result of results) {
		if (redirects.length >= limit) {
			break;
		}

		if (!redirects.some(redirect => redirect.name === result)) {
			redirects.push({
				name: result,
				target: '',
				highlights: [[result, false]],
			});
		}
	}

	console.log(results, redirects);

	return redirects;
}

export async function searchFirstResult(indices: SearchIndex[], name: SearchIndexName, query: string): Promise<RedirectOption> {
	const index = await createIndex(indices, name);

	const results = index.search(query).map(x => String(x));

	if (results.length === 0) {
		throw new Error('No search results found');
	}

	const result = sortResults(results, query, 1)[0];

	if (result === undefined) {
		throw new Error('No search results found');
	}

	return result;
}

export async function search(indices: SearchIndex[], name: SearchIndexName, query: string): Promise<RedirectOption[]> {
	const index = await createIndex(indices, name);

	const results = index.search(query).map(key => String(key));

	return sortResults(results, query, results.length);
}
