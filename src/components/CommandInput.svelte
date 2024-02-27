<script lang="ts">
	import { type CommandFailure, parseCommandStr } from 'src/commands';
	import { onMount } from 'svelte';

	let command = '';
	let error: CommandFailure | undefined = undefined;

	function submitCommand(command: string): void {
		error = undefined;
		console.log(command);

		const commandRes = parseCommandStr(command);

		if (commandRes.success) {
			history.pushState({}, '/oqa');
			window.location.replace(commandRes.redirect);
		} else {
			error = commandRes;
		}
	}

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const commandParam = urlParams.get('q');
		if (commandParam) {
			submitCommand(commandParam);
		}
	});
</script>

<div class="command-input">
	<span>oqa</span>
	<input
		bind:value={command}
		type="text"
		on:keydown={e => {
			if (e.key === 'Enter') submitCommand(command);
		}}
	/>
	<button on:click={() => submitCommand(command)}>Jump!</button>
</div>

{#if error}
	<p class="text-error">
		Failed to parse command. <br />
		Expected {error.error.expected.join(' or ')} at position {error.error.furthest.index + 1}.
	</p>
{/if}
