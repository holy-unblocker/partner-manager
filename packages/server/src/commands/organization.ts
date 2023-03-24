import { commandIsOwner, getCommandID, fetchOrgs } from "../commandUtil.js";
import { CommandSubOnly, registerCommand } from "../commands.js";
import db from "../db.js";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  EmbedBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandBooleanOption,
  SlashCommandUserOption,
} from "discord.js";

async function doPromotion(
  interaction: ChatInputCommandInteraction,
  owner: boolean
) {
  const id = await getCommandID(interaction);
  if (!id) return;
  const user = interaction.options.getUser("user", true);
  const notify = interaction.options.getBoolean("notify", false) || false;

  if (!(await commandIsOwner(interaction, id.id))) return;

  await db.query(
    "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER = $3;",
    [user.id, id.id, owner]
  );

  let failureDMing = false;

  if (notify)
    try {
      const dm = await user.createDM();
      await dm.send(
        `You've been set to ${owner ? "owner" : "member"} in the organization ${
          id.name
        } by <@${interaction.user.id}>`
      );
    } catch {
      failureDMing = true;
    }

  await interaction.reply({
    ephemeral: true,
    content: `<@${user.id}> has been set to ${
      owner ? "owner" : "member"
    } of organization ${id.name}.${
      notify
        ? failureDMing
          ? " However, I was unable to DM them."
          : " They have been notified."
        : ""
    }`,
  });
}

registerCommand(
  new CommandSubOnly(
    new SlashCommandBuilder()
      .setName("org")
      .setDescription("Manage your organizations"),
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("list")
        .setDescription("List the organizations you're in"),
      execute: async (interaction) => {
        const orgs = await fetchOrgs(interaction.user.id);

        await interaction.reply({
          embeds: [
            new EmbedBuilder().setTitle("Organizations").addFields(
              orgs.map((o) => ({
                name: o.name,
                value: `Enabled: ${o.enabled}\nOwner: ${o.members
                  .filter((m) => m.owner)
                  .map((m) => `<@${m.id}>`)
                  .join(" ")}\nMembers:\n${o.members
                  .map((m) => `<@${m.id}>`)
                  .join("\n")}`,
              }))
            ),
          ],
          ephemeral: true,
        });
      },
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("new")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addStringOption(
          new SlashCommandStringOption()
            .setName("name")
            .setDescription("Description of the organization")
            .setRequired(true)
        )
        .setDescription("Creates an organization"),
      execute: async (interaction) => {
        const vid = interaction.options
          .getString("id", true)
          .trim()
          .toLowerCase();
        const name = interaction.options.getString("name", true);

        const { rowCount: existingOrgs } = await db.query<{ id: string }>(
          "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;",
          [vid]
        );

        if (existingOrgs !== 0)
          return void (await interaction.reply({
            content: "Organization with ID already exists",
            ephemeral: true,
          }));

        const {
          rows: [{ id }],
        } = await db.query<{ id: string }>(
          `INSERT INTO ORGANIZATIONS (VID, NAME) VALUES ($1, $2) RETURNING ID;`,
          [vid, name]
        );

        const { rowCount } = await db.query<{ id: string }>(
          `INSERT INTO MEMBERSHIPS (ID, ORGANIZATION, OWNER) VALUES ($1, $2, $3);`,
          [interaction.user.id, id, true]
        );

        if (rowCount !== 1)
          return void (await interaction.reply({
            ephemeral: true,
            content:
              "An error occured when attempting to add user to organization. Try again later or report this to the bot maintainer.",
          }));

        await interaction.reply({
          ephemeral: true,
          content: "Organization created.",
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
        .setDescription("Deletes an organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;

        if (!(await commandIsOwner(interaction, id.id))) return;

        await interaction.reply({
          content: "TODO.",
          ephemeral: true,
        });
      },
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("add")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName("user")
            .setDescription("User to invite to organization")
            .setRequired(true)
        )
        .addBooleanOption(
          new SlashCommandBooleanOption()
            .setName("notify")
            .setDescription("Whether the user should be notified")
            .setRequired(false)
        )
        .setDescription("Invites a user to an organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;
        const user = interaction.options.getUser("user", true);
        const notify = interaction.options.getBoolean("notify", false) || false;

        if (!(await commandIsOwner(interaction, id.id))) return;

        const {
          rows: [{ count: inOrg }],
        } = await db.query<{ count: string }>(
          "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2;",
          [user.id, id.id]
        );

        if (inOrg !== "0")
          return void (await interaction.reply({
            content: "User is already in organization.",
            ephemeral: true,
          }));

        const { rowCount } = await db.query<{ id: string }>(
          "INSERT INTO MEMBERSHIPS (ID, ORGANIZATION) VALUES($1, $2);",
          [user.id, id.id]
        );

        if (rowCount !== 1) throw new RangeError("Couldn't add member");

        let failureDMing = false;

        if (notify)
          try {
            const dm = await user.createDM();
            await dm.send(
              `You've been added to the organization ${id.name} by <@${interaction.user.id}>`
            );
          } catch {
            failureDMing = true;
          }

        await interaction.reply({
          ephemeral: true,
          content: `<@${user.id}> has been added to organization ${
            id.displayID
          }.${
            notify
              ? failureDMing
                ? " However, I was unable to DM them."
                : " They have been notified."
              : ""
          }`,
        });
      },
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("demote")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName("user")
            .setDescription("User to promote")
            .setRequired(true)
        )
        .addBooleanOption(
          new SlashCommandBooleanOption()
            .setName("notify")
            .setDescription("Whether the user should be notified")
            .setRequired(false)
        )
        .setDescription("Demotes an organization owner to a member"),
      execute: (interaction) => doPromotion(interaction, true),
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("promote")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName("user")
            .setDescription("User to promote")
            .setRequired(true)
        )
        .addBooleanOption(
          new SlashCommandBooleanOption()
            .setName("notify")
            .setDescription("Whether the user should be notified")
            .setRequired(false)
        )
        .setDescription("Promotes an organization member to an owner"),
      execute: (interaction) => doPromotion(interaction, true),
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("fire")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName("user")
            .setDescription("User to fire")
            .setRequired(true)
        )
        .addBooleanOption(
          new SlashCommandBooleanOption()
            .setName("notify")
            .setDescription("Whether the user should be notified")
            .setRequired(false)
        )
        .setDescription("Fires a user from the organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;
        const user = interaction.options.getUser("user", true);
        const notify = interaction.options.getBoolean("notify", false) || false;

        if (!(await commandIsOwner(interaction, id.id))) return;

        // allow organization takeovers:
        /*const { rowCount: fireIsOwner } = await db.query(
            "DELETE FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND NOT OWNER;",
            [user.id, id]
          );

          if (fireIsOwner !== 0)
            return void (await interaction.reply({
              content: "User is not in the organization/is an owner.",
              ephemeral: true,
            }));*/

        let failureDMing = false;

        if (notify)
          try {
            const dm = await user.createDM();
            await dm.send(
              `You've been fired from ${id} by <@${interaction.user.id}>`
            );
          } catch {
            failureDMing = true;
          }

        await interaction.reply({
          ephemeral: true,
          content: `<@${user.id}> has been fired from the organization ${
            id.displayID
          }.${
            notify
              ? failureDMing
                ? " However, I was unable to DM them."
                : " They have been notified."
              : ""
          }`,
        });
      },
    },
    {
      data: new SlashCommandSubcommandBuilder()
        .setName("leave")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("id")
            .setDescription("Short identifier for the organization")
            .setRequired(true)
        )
        .setDescription("Leave the organization"),
      execute: async (interaction) => {
        const id = await getCommandID(interaction);
        if (!id) return;

        const { rowCount: promoted } = await db.query(
          "DELETE FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND NOT OWNER;",
          [interaction.user.id, id.id]
        );

        if (promoted !== 0)
          return void (await interaction.reply({
            content: "You're not in the organization.",
            ephemeral: true,
          }));

        await interaction.reply({
          ephemeral: true,
          content: `You have quit the organization.`,
        });
      },
    }
  )
);
