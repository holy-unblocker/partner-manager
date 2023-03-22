import type {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

type CommandExecutor = (
  interaction: ChatInputCommandInteraction
) => Promise<void> | void;

export class CommandOptionsOnly {
  data: SlashCommandBuilder;
  private execute: CommandExecutor;
  constructor(data: SlashCommandBuilder, execute: CommandExecutor) {
    this.data = data;
    this.execute = execute;
  }
  handle(interaction: ChatInputCommandInteraction) {
    return this.execute(interaction);
  }
}

interface SubCommand {
  data: SlashCommandSubcommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

export class CommandSubOnly {
  data: SlashCommandSubcommandsOnlyBuilder;
  private subcommands = new Map<string, CommandExecutor>();
  constructor(
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder,
    ...subcommands: SubCommand[]
  ) {
    for (const s of subcommands) {
      data = data.addSubcommand(s.data);
      this.subcommands.set(s.data.name, s.execute);
    }
    this.data = data;
  }
  handle(interaction: ChatInputCommandInteraction) {
    const sc = interaction.options.getSubcommand(true);
    const executor = this.subcommands.get(sc);
    if (!executor) throw new TypeError(`No executor for ${sc}`);
    return executor(interaction);
  }
}

type Command = CommandOptionsOnly | CommandSubOnly;

export const commands = new Map<string, Command>();

export function registerCommand(command: Command) {
  commands.set(command.data.name, command);
}
