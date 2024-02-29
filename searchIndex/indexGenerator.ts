import { Index } from 'flexsearch';
import fs from 'node:fs/promises';
import type { EncodedIndex } from 'src/searchHelpers';

async function listFiles(dir: string, pathDir: string = ''): Promise<string[]> {
	const files = await fs.readdir(dir, { withFileTypes: true });

	const filteredFiles = await Promise.all(
		files.map(async file => {
			const niceName = pathDir ? `${pathDir}/${file.name}` : file.name;

			if (file.isDirectory()) {
				if (file.name === '.git') {
					return [];
				}

				return await listFiles(`${dir}/${file.name}`, niceName);
			} else {
				return [niceName];
			}
		}),
	);

	return filteredFiles.flat();
}

async function buildIndex(dir: string, outfile: string) {
	const index = new Index('default');

	const files = await listFiles(dir);

	for (const file of files) {
		if (!file.endsWith('.md')) {
			continue;
		}

		const content = await fs.readFile(`${dir}/${file}`, 'utf-8');
		index.add(file, content);
	}

	const indexData: EncodedIndex[] = [];

	await index.export((key, data) => {
		return indexData.push({ key, data });
	});

	await fs.writeFile(outfile, JSON.stringify(indexData));
}

async function main() {
	await buildIndex('./searchIndex/obsidian-help/en', './public/helpIndex.json');
	await buildIndex('./searchIndex/obsidian-developer-docs/en', './public/docsIndex.json');
}

await main();
