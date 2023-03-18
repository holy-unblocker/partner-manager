import { registerCommand } from "../commands.js";
import { SlashCommandBuilder } from "discord.js";

registerCommand({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction) {
    await interaction.reply("Pong!");
  },
});
