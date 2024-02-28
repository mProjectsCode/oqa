import type { Parser } from '@lemons_dev/parsinom/lib/Parser';
import type { ParseFailure } from '@lemons_dev/parsinom/lib/HelperTypes';
import { P_UTILS } from '@lemons_dev/parsinom/lib/ParserUtils';
import { P } from '@lemons_dev/parsinom/lib/ParsiNOM';
import slug from 'slug';

type Tuple<T> = [T, ...T[]];

export enum ArgsType {
	REQUIRED = 'required',
	OPTIONAL = 'optional',
	NONE = 'none',
}

export interface ActionCommandRequired<T> {
	keyword: string;
	description: string;
	parser: Parser<T>;
	argsType: ArgsType.REQUIRED;
	argsDescription: string;
	getRedirect: (args: CommandParseResult<T>) => string;
}

export interface ActionCommandOptional<T> {
	keyword: string;
	description: string;
	parser: Parser<T>;
	argsType: ArgsType.OPTIONAL;
	argsDescription: string;
	getRedirect: (args: CommandParseResult<T | undefined>) => string;
}

export interface ActionCommandNone {
	keyword: string;
	description: string;
	argsType: ArgsType.NONE;
	getRedirect: (args: CommandParseResult<undefined>) => string;
}

export interface CommandGroup {
	keyword: string;
	subcommands: Tuple<Command<any>>;
}

export type ActionCommand<T> = ActionCommandRequired<T> | ActionCommandOptional<T> | ActionCommandNone;

export type Command<T> = ActionCommand<T> | CommandGroup;

export interface CommandParseResult<T> {
	str: string;
	result: T;
}

export interface CommandSuccess {
	success: true;
	command: string;
	redirect: string;
}

export interface CommandFailure {
	success: false;
	command: string;
	error: ParseFailure;
}

export type CommandResult = CommandSuccess | CommandFailure;

export const commands = [
	{
		keyword: 'gh',
		subcommands: [
			createAction({
				keyword: 'r',
				description: 'Releases Repo',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://github.com/obsidianmd/obsidian-releases/pulls',
			}),
			createAction({
				keyword: 'a',
				description: 'API Definitions',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts',
			}),
			createAction({
				keyword: 'pa',
				description: 'Publish API Definitions',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://github.com/obsidianmd/obsidian-api/blob/master/publish.d.ts',
			}),
		],
	},
	{
		keyword: 'hub',
		subcommands: [
			createAction({
				keyword: 'i',
				description: 'Obsidian Hub Index',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://publish.obsidian.md/hub/00+-+Start+here',
			}),
		],
	},
	{
		keyword: 'st',
		subcommands: [
			createAction({
				keyword: 'i',
				description: 'Obsidian Stats Index',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://www.moritzjung.dev/obsidian-stats/',
			}),
			createAction({
				keyword: 's',
				description: 'Obsidian Stats Search',
				argsType: ArgsType.REQUIRED,
				argsDescription: 'Search term',
				parser: P_UTILS.remaining(),
				getRedirect: x => `https://www.moritzjung.dev/obsidian-stats/?s=${encodeURIComponent(x.result)}`,
			}),
			createAction({
				keyword: 'p',
				description: 'Obsidian Stats go to plugin page',
				argsType: ArgsType.OPTIONAL,
				argsDescription: 'Plugin id',
				parser: P_UTILS.remaining(),
				getRedirect: x => {
					if (x.result) {
						return `https://www.moritzjung.dev/obsidian-stats/plugins/${slug(x.result)}/`;
					} else {
						return 'https://www.moritzjung.dev/obsidian-stats/pluginstats/';
					}
				},
			}),
			createAction({
				keyword: 't',
				description: 'Obsidian Stats go to theme page',
				argsType: ArgsType.OPTIONAL,
				argsDescription: 'Theme name',
				parser: P_UTILS.remaining(),
				getRedirect: x => {
					if (x.result) {
						return `https://www.moritzjung.dev/obsidian-stats/themes/${slug(x.result)}/`;
					} else {
						return 'https://www.moritzjung.dev/obsidian-stats/themestats/';
					}
				},
			}),
		],
	},
	{
		keyword: 'h',
		subcommands: [
			createAction({
				keyword: 'i',
				description: 'Obsidian Help Index',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://help.obsidian.md/Home',
			}),
		],
	},
	{
		keyword: 'd',
		subcommands: [
			createAction({
				keyword: 'i',
				description: 'Obsidian Docs Index',
				argsType: ArgsType.NONE,
				getRedirect: () => 'https://docs.obsidian.md/Home',
			}),
		],
	},
] as const satisfies Command<unknown>[];

interface CommandParserResult<T> {
	commandChain: CommandGroup[];
	lastCommand: ActionCommand<T>;
	args: T;
}

function createAction<T>(action: ActionCommand<T>): ActionCommand<T> {
	return action;
}

function getEmptyCommandParser<T>(c: ActionCommandOptional<T> | ActionCommandNone): Parser<CommandParserResult<undefined>> {
	return P.string(c.keyword)
		.map(() => {
			return {
				commandChain: [],
				lastCommand: c,
				args: undefined,
			};
		})
		.thenEof() as Parser<CommandParserResult<undefined>>;
}

function getArgsCommandParser<T>(c: ActionCommandRequired<T> | ActionCommandOptional<T>): Parser<CommandParserResult<T>> {
	return P.sequenceMap((_1, _2, p) => p, P.string(c.keyword), P_UTILS.whitespace(), c.parser).map(x => {
		return {
			commandChain: [],
			lastCommand: c,
			args: x,
		};
	});
}

function generateCommandParser(commands: Command<unknown>[]): Parser<CommandParserResult<any>> {
	return P.or(
		...commands.map((c): Parser<CommandParserResult<any>> => {
			if ('subcommands' in c) {
				return P.sequenceMap(
					(_1, _2, p) => p,
					P.string(c.keyword),
					P_UTILS.whitespace(),
					generateCommandParser(c.subcommands).map(x => {
						x.commandChain.unshift(c);
						return x;
					}),
				);
			} else {
				if (c.argsType === ArgsType.REQUIRED) {
					return getArgsCommandParser(c);
				} else if (c.argsType === ArgsType.OPTIONAL) {
					return P.or(getEmptyCommandParser(c), getArgsCommandParser(c));
				} else {
					return getEmptyCommandParser(c);
				}
			}
		}),
	);
}

const commandParser = generateCommandParser(commands);

export function parseCommandStr(commandStr: string): CommandResult {
	const commandParse = commandParser.tryParse(commandStr);

	if (!commandParse.success) {
		return {
			success: false,
			command: commandStr,
			error: commandParse,
		};
	}

	const commandResult = commandParse.value;

	console.log(commandResult);

	return {
		success: true,
		command: commandStr,
		redirect: commandResult.lastCommand.getRedirect({
			str: commandStr,
			result: commandResult.args,
		}),
	};
}

export function flattenCommands(command: Command<any>, keywordList: string[] = []): ActionCommand<any>[] {
	if ('subcommands' in command) {
		return command.subcommands.flatMap(x => flattenCommands(x, [...keywordList, command.keyword]));
	} else {
		return [
			{
				...command,
				keyword: keywordList.concat(command.keyword).join(' '),
			},
		];
	}
}

export const flatCommands = commands.flatMap(x => flattenCommands(x));
