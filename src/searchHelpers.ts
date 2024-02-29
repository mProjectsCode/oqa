import FlexSearch from 'flexsearch';

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
	const index = new FlexSearch.Index("default");

	const searchIndex = indices.find((index) => index.name === name);

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

export async function searchFirstResult(indices: SearchIndex[], name: SearchIndexName, query: string): Promise<string> {
	const index = await createIndex(indices, name);

	const result = index.search(query,{
		limit: 1,
	}).at(0);

	if (result === undefined) {
		throw new Error('No search results found');
	}

	return String(result);
}

export async function search(indices: SearchIndex[], name: SearchIndexName, query: string): Promise<string[]> {
	const index = await createIndex(indices, name);

	const result = index.search(query);

	return result.map((key) =>  String(key));
}