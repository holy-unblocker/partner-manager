import { registerCommand } from "../commands.js";
import db from "../db.js";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  SlashCommandBooleanOption,
  EmbedBuilder,
} from "discord.js";

async function fetchOrgs(user: string) {
  const { rows: orgs } = await db.query<{
    id: number;
    vid: string;
    name: string;
    enabled: boolean;
  }>(
    "SELECT o.NAME, o.ID, o.VID, o.ENABLED FROM ORGANIZATIONS o JOIN MEMBERSHIPS m ON o.ID = m.ORGANIZATION WHERE m.ID = $1;",
    [user]
  );

  const res: {
    id: number;
    vid: string;
    name: string;
    enabled: boolean;
    members: { id: string; owner: boolean }[];
  }[] = [];

  for (const org of orgs) {
    const { rows: members } = await db.query<{
      id: string;
      owner: boolean;
    }>("SELECT ID, OWNER FROM MEMBERSHIPS WHERE ORGANIZATION = $1;", [org.id]);

    res.push({
      ...org,
      members,
    });
  }

  return res;
}

registerCommand({
  data: new SlashCommandBuilder()
    .setName("orgs")
    .setDescription("Lists your organizations"),
  async execute(interaction) {
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
});

registerCommand({
  data: new SlashCommandBuilder()
    .setName("new-org")
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
  async execute(interaction) {
    const vid = interaction.options.getString("id", true).toLowerCase();
    const name = interaction.options.getString("name", true);

    const { rowCount: existingOrgs } = await db.query<{ id: string }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1",
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

    if (rowCount !== 1) throw new RangeError("Couldn't add member");

    await interaction.reply({
      ephemeral: true,
      content: "User has been added to organization ABC",
    });
  },
});

registerCommand({
  data: new SlashCommandBuilder()
    .setName("delete-org")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("id")
        .setDescription("Short identifier for the organization")
        .setRequired(true)
    )
    .setDescription("Deletes an organization"),
  async execute(interaction) {
    await interaction.reply({
      content:
        ":x: Only the organization owner (<@1058825174935404654>) can delete it.",
      ephemeral: true,
    });
  },
});

registerCommand({
  data: new SlashCommandBuilder()
    .setName("invite")
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
        .setName("owner")
        .setDescription("Whether the user will be added as an owner")
        .setRequired(false)
    )
    .setDescription("Invites a user to an organization"),
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);
    const user = interaction.options.getUser("user", true);
    const owner = interaction.options.getBoolean("owner", false) || false;

    // Locate an organization with the VID and get the ID
    // Then add a membership to the MEMBERSHIPS table
    // We can't just use the VID because that is a virtual ID which is like a memorizable ID. We need to resolve the real organization ID
    const {
      rows: [{ id }],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1",
      [vid]
    );

    const { rowCount: isOwner } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
      [interaction.user.id, id]
    );

    if (isOwner !== 1)
      return void (await interaction.reply({
        content: "You aren't the owner of this organization.",
        ephemeral: true,
      }));

    const { rowCount: inOrg } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2;",
      [user.id, id]
    );

    if (inOrg !== 0)
      return void (await interaction.reply({
        content: "User is already in organization.",
        ephemeral: true,
      }));

    const { rowCount } = await db.query<{ id: string }>(
      "INSERT INTO MEMBERSHIPS (ID, ORGANIZATION, OWNER) VALUES($1, $2, $3);",
      [user.id, id, owner]
    );

    if (rowCount !== 1) throw new RangeError("Couldn't add member");

    await interaction.reply({
      ephemeral: true,
      content: `<@${user.id}> has been added to organization ${vid}`,
    });
  },
});
