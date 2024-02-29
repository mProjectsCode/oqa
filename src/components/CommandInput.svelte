<script lang="ts">
	import { type CommandFailure, type RedirectOption, runCommandString } from 'src/commands';
	import { onMount } from 'svelte';
	import { type SearchIndex, SearchIndexNames } from 'src/searchHelpers';

	let command = '';
	let commandRunning = false;
	let error: CommandFailure | undefined = undefined;

	let searchIndices: SearchIndex[] | undefined = undefined;
	let searchIndexPromiseResolve: (value: SearchIndex[]) => void;
	let searchIndexPromise: Promise<SearchIndex[]> = new Promise<SearchIndex[]>(resolve => {
		searchIndexPromiseResolve = resolve;
	});

	let modal: HTMLDialogElement;
	let redirectOptions: RedirectOption[] = [];

	async function runCommand(command: string): void {
		if (commandRunning) return;

		commandRunning = true;
		error = undefined;
		console.log(command);

		const commandRes = await runCommandString(command, {
			getSearchIndices: () => getSearchIndices(),
		});

		if (commandRes.success) {
			if (Array.isArray(commandRes.redirect)) {
				redirectOptions = commandRes.redirect;
				modal.showModal();
				return;
			} else {
				redirect(commandRes.redirect);
			}
		} else {
			error = commandRes;
		}

		resetCommand();
	}

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const commandParam = urlParams.get('q');
		if (commandParam) {
			void runCommand(commandParam);
		}

		void fetchSearchIndices();
	});

	async function fetchSearchIndices() {
		const indexDataPromises = [];

		for (const index of SearchIndexNames) {
			indexDataPromises.push(fetch(`/oqa/${index}.json`));
		}

		const indexData = await Promise.allSettled(indexDataPromises);

		searchIndices = await Promise.all(
			indexData.map<SearchIndex>(async (datum, i) => {
				console.log('fetched', datum);

				if (datum.status === 'fulfilled') {
					const response = datum.value as Response;

					if (response.status !== 200) {
						return {
							name: SearchIndexNames[i],
							index: undefined,
							error: new Error(`Failed to fetch index data. Status: ${response.status}`),
						};
					}

					return {
						name: SearchIndexNames[i],
						index: await datum.value.json(),
						error: undefined,
					};
				} else {
					return {
						name: SearchIndexNames[i],
						index: undefined,
						error: datum.reason as Error,
					};
				}
			}),
		);

		searchIndexPromiseResolve(searchIndices);

		console.log(searchIndices);
	}

	async function getSearchIndices(): Promise<SearchIndex[]> {
		if (searchIndices === undefined) {
			return await searchIndexPromise;
		} else {
			return searchIndices;
		}
	}

	function redirect(target: string) {
		history.pushState({}, '', '/');
		window.location.replace(target);
	}

	function resetCommand() {
		command = '';
		commandRunning = false;
	}
</script>

<div class="command-input">
	<span>oqa</span>
	<input
		bind:value={command}
		aria-label="Command input"
		type="text"
		disabled={commandRunning}
		autofocus={true}
		on:keydown={e => {
			if (e.key === 'Enter') runCommand(command);
		}}
	/>
	<button on:click={() => runCommand(command)}>{commandRunning ? '...' : 'Access!'}</button>
</div>

{#if error}
	{#if error.error instanceof Error}
		<p class="text-error">
			{error.error.message}
		</p>
	{:else}
		<p class="text-error">
			Failed to parse command. <br />
			Expected {error.error.expected.join(' or ')} at position {error.error.furthest.index + 1}.
		</p>
	{/if}
{/if}

<dialog
	bind:this={modal}
	on:click={e => {
		if (e.target === modal) {
			modal.close();
		}
	}}
	on:close={() => resetCommand()}
>
	<div class="modal">
		{#each redirectOptions as r, i}
			<div
				class="option-card"
				tabindex="0"
				autofocus={i === 0}
				on:click={() => redirect(r.target)}
				role="link"
				on:keydown={e => {
					if (e.key === 'Enter' || e.key === ' ') {
						redirect(r.target);
						e.preventDefault();
					}
				}}
			>
				<span class="option-card-name">
					{#each r.highlights as h}
						{#if h[1] === true}
							<mark>{h[0]}</mark>
						{:else}
							{h[0]}
						{/if}
					{/each}
				</span>
				<span class="option-card-target">{r.target}</span>
			</div>
		{/each}
	</div>
</dialog>
