import {
  commandIsMember,
  commandIsOwner,
  getCommandID,
} from "../commandUtil.js";
import { CommandSubOnly, registerCommand } from "../commands.js";
import db from "../db.js";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";

registerCommand(
  new CommandSubOnly(
    new SlashCommandBuilder()
      .setName("domain")
      .setDescription("Domain management"),
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("add")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addStringOption(
          new SlashCommandStringOption()
            .setName("domains")
            .setDescription("Comma separated list of domains")
            .setRequired(true)
        )
        .setDescription("Adds domains to your organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;

        const domains = interaction.options
          .getString("domains", true)
          .replace(/\s/, "")
          .split(", ");

        if (!(await commandIsMember(interaction, id.id))) return;

        for (const domain of domains)
          await db.query(
            "INSERT INTO DOMAINS (DOMAIN, ORGANIZATION) VALUES ($1, $2);",
            [domain, id]
          );

        await interaction.reply({
          content: `Added ${domains.length} domains.`,
          ephemeral: true,
        });
      },
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("delete")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addStringOption(
          new SlashCommandStringOption()
            .setName("domains")
            .setDescription("Comma separated list of domains")
            .setRequired(true)
        )
        .setDescription("Deletes domains from your organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;

        const domains = interaction.options
          .getString("domains", true)
          .replace(/\s/, "")
          .split(", ");

        if (!(await commandIsMember(interaction, id.id))) return;

        for (const domain of domains)
          await db.query(
            "DELETE FROM DOMAINS WHERE ORGANIZATION = $1 AND DOMAIN = $2;",
            [id, domain]
          );

        await interaction.reply({
          content: `Deleted ${domains.length} domains.`,
          ephemeral: true,
        });
      },
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("clear")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .setDescription("Deletes all the domains your organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;

        if (!(await commandIsOwner(interaction, id.id))) return;

        const { rowCount } = await db.query(
          "DELETE FROM DOMAINS WHERE ORGANIZATION = $1;",
          [id]
        );

        await interaction.reply({
          content: `Deleted ${rowCount} domains.`,
          ephemeral: true,
        });
      },
    },

    {
      data: new SlashCommandSubcommandBuilder()
        .setName("list")
        .setDescription("Lists the domains in the organization")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        ),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;

        await interaction.reply({
          content: `Domains for ${id.displayID}: ${(
            await db.query<{ domain: string }>(
              "SELECT DOMAIN FROM DOMAINS WHERE ORGANIZATION = $1;",
              [id]
            )
          ).rows
            .map((m) => m.domain)
            .join("\n")}`,
          ephemeral: true,
        });
      },
    }
  )
);