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
    .setName("add-domain")
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
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);
    const domains = interaction.options
      .getString("domains", true)
      .replace(/\s/, "")
      .split(", ");

    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: isMember } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2;",
      [interaction.user.id, id]
    );

    if (isMember !== 1)
      return void (await interaction.reply({
        content: "You aren't in this organization.",
        ephemeral: true,
      }));

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
});

registerCommand({
  data: new SlashCommandBuilder()
    .setName("delete-domain")
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
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);
    const domains = interaction.options
      .getString("domains", true)
      .replace(/\s/, "")
      .split(", ");

    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: isMember } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2;",
      [interaction.user.id, id]
    );

    if (isMember !== 1)
      return void (await interaction.reply({
        content: "You aren't in this organization.",
        ephemeral: true,
      }));

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
});

registerCommand({
  data: new SlashCommandBuilder()
    .setName("delete-all-domains")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("id")
        .setDescription("Short identifier for the organization")
        .setRequired(true)
    )
    .setDescription("Deletes all the domains from your organization"),
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);

    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: isOwner } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
      [interaction.user.id, id]
    );

    if (isOwner !== 1)
      return void (await interaction.reply({
        content: "You aren't the owner of this organization.",
        ephemeral: true,
      }));

    const { rowCount } = await db.query(
      "DELETE FROM DOMAINS WHERE ORGANIZATION = $1;",
      [id]
    );

    await interaction.reply({
      content: `Deleted ${rowCount} domains.`,
      ephemeral: true,
    });
  },
});

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
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
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
      content: "User has been added to organization.",
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
    const vid = interaction.options.getString("id", true);

    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: isOwner } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
      [interaction.user.id, id]
    );

    if (isOwner !== 1)
      return void (await interaction.reply({
        content: "You aren't the owner of this organization.",
        ephemeral: true,
      }));

    await interaction.reply({
      content: "TODO.",
      ephemeral: true,
    });

    const { rowCount: memberRowCount } = await db.query<{ id: string }>(
      `DELETE FROM MEMBERS WHERE ORGANIZATION = $1;`,
      [id]
    );

    const { rowCount: domainRowCount } = await db.query<{ id: string }>(
      `DELETE FROM DOMAINS WHERE ORGANIZATION = $1;`,
      [id]
    );

    const { rowCount: orgRowCount } = await db.query<{ id: string }>(
      `DELETE FROM ORGANIZATIONS WHERE ID = $1;`,
      [id]
    );

    if (orgRowCount !== 1)
      return void (await interaction.reply({
        ephemeral: true,
        content:
          "An error occured when attempting to add user to organization. Try again later or report this to the bot maintainer.",
      }));

    await interaction.reply({
      ephemeral: true,
      content: `Fired ${memberRowCount} members and deleted ${domainRowCount} domains.`,
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
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

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

registerCommand({
  data: new SlashCommandBuilder()
    .setName("update")
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
        .setName("owner")
        .setDescription("Whether the user will be set to an owner")
        .setRequired(false)
    )
    .setDescription("Promotes/demotes a user in the organization"),
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);
    const user = interaction.options.getUser("user", true);
    const owner = interaction.options.getBoolean("owner", true);

    // Locate an organization with the VID and get the ID
    // Then add a membership to the MEMBERSHIPS table
    // We can't just use the VID because that is a virtual ID which is like a memorizable ID. We need to resolve the real organization ID
    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: isOwner } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
      [interaction.user.id, id]
    );

    if (isOwner !== 1)
      return void (await interaction.reply({
        content: "You aren't the owner of this organization.",
        ephemeral: true,
      }));

    const { rowCount: promoted } = await db.query(
      "UPDATE MEMBERSHIPS SET OWNER = $1 WHERE ID = $2 AND ORGANIZATION = $3;",
      [owner, user.id, id]
    );

    if (promoted !== 0)
      return void (await interaction.reply({
        content: "User not found/already set to status.",
        ephemeral: true,
      }));

    await interaction.reply({
      ephemeral: true,
      content: `<@${user.id}> has been set to ${
        owner ? "owner" : "member"
      } of organization.`,
    });
  },
});

registerCommand({
  data: new SlashCommandBuilder()
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
    .setDescription("Fires a user from the organization"),
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);
    const user = interaction.options.getUser("user", true);

    // Locate an organization with the VID and get the ID
    // Then add a membership to the MEMBERSHIPS table
    // We can't just use the VID because that is a virtual ID which is like a memorizable ID. We need to resolve the real organization ID
    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: isOwner } = await db.query(
      "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
      [interaction.user.id, id]
    );

    if (isOwner !== 1)
      return void (await interaction.reply({
        content: "You aren't the owner of this organization.",
        ephemeral: true,
      }));

    const { rowCount: promoted } = await db.query(
      "DELETE FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND NOT OWNER;",
      [user.id, id]
    );

    if (promoted !== 0)
      return void (await interaction.reply({
        content: "User is not in the organization/is an owner.",
        ephemeral: true,
      }));

    await interaction.reply({
      ephemeral: true,
      content: `<@${user.id}> has been fired from organization.`,
    });
  },
});

registerCommand({
  data: new SlashCommandBuilder()
    .setName("quit")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("id")
        .setDescription("Short identifier for the organization")
        .setRequired(true)
    )
    .setDescription("Quits the organization"),
  async execute(interaction) {
    const vid = interaction.options.getString("id", true);

    // Locate an organization with the VID and get the ID
    // Then add a membership to the MEMBERSHIPS table
    // We can't just use the VID because that is a virtual ID which is like a memorizable ID. We need to resolve the real organization ID
    const {
      rows: [idData],
    } = await db.query<{ id: number }>(
      "SELECT ID FROM ORGANIZATIONS WHERE VID = $1;'",
      [vid]
    );

    if (!idData)
      return void (await interaction.reply({
        content: "The organization with ID doesn't exist.",
        ephemeral: true,
      }));

    const { id } = idData;

    const { rowCount: promoted } = await db.query(
      "DELETE FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND NOT OWNER;",
      [interaction.user.id, id]
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
});
