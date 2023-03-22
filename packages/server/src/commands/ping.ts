import { CommandOptionsOnly, registerCommand } from "../commands.js";
import { SlashCommandBuilder } from "discord.js";

registerCommand(
  new CommandOptionsOnly(
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Replies with Pong!"),
    async (interaction) => {
      await interaction.reply("Pong!");
    }
  )
);
