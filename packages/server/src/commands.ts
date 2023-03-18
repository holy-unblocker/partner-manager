import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Collection } from "discord.js";

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

export const commands = new Collection<string, Command>();

export function registerCommand(command: Command) {
  commands.set(command.data.name, command);
}
