import { commandIsAuthorized, getCommandID } from "../commandUtil.js";
import { CommandSubOnly, registerCommand } from "../commands.js";
import db from "../db.js";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";

const admin = new CommandSubOnly(
  new SlashCommandBuilder().setName("admin").setDescription("Administration")
);

async function setOrgStatus(
  interaction: ChatInputCommandInteraction,
  enabled: boolean
) {
  if (!(await commandIsAuthorized(interaction))) return;

  const id = await getCommandID(interaction);
  if (!id) return id;

  await db.query("UPDATE ORGANIZATIONS SET ENABLED = $1 WHERE ID = $2;", [
    enabled,
    id.id,
  ]);

  await interaction.reply({
    ephemeral: true,
    content: `${enabled ? "Enabled" : "Disabled"} organization ${id.name}`,
  });
}

admin.addSubcommand(
  new SlashCommandSubcommandBuilder()
    .setName("enable")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("id")
        .setDescription("Short identifier for the organization")
        .setRequired(true)
    )
    .setDescription("Enables an organization"),
  (interaction) => setOrgStatus(interaction, true)
);

admin.addSubcommand(
  new SlashCommandSubcommandBuilder()
    .setName("disable")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("id")
        .setDescription("Short identifier for the organization")
        .setRequired(true)
    )
    .setDescription("Disables an organization"),
  (interaction) => setOrgStatus(interaction, false)
);

registerCommand(admin);
