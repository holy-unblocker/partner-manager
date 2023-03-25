import db from "./db.js";
import { testPermission } from "./permissions.js";
import type { ChatInputCommandInteraction } from "discord.js";

export async function fetchOrgs(user: string) {
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

export async function getCommandID(interaction: ChatInputCommandInteraction) {
  const vid = interaction.options.getString("id", true).trim().toLowerCase();

  const {
    rows: [idData],
  } = await db.query<{ id: number; name: string }>(
    "SELECT ID, NAME FROM ORGANIZATIONS WHERE VID = $1;",
    [vid]
  );

  if (!idData)
    return void (await interaction.reply({
      content: "The organization with ID doesn't exist.",
      ephemeral: true,
    }));

  return {
    id: idData.id,
    displayID: vid,
    name: idData.name,
  };
}

export async function commandIsOwner(
  interaction: ChatInputCommandInteraction,
  organizationID: number
) {
  const {
    rows: [{ count: isOwner }],
  } = await db.query<{ count: string }>(
    "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
    [interaction.user.id, organizationID]
  );

  if (isOwner !== "1")
    return void (await interaction.reply({
      content: "You aren't an owner in this organization.",
      ephemeral: true,
    }));

  return true;
}

export async function commandIsMember(
  interaction: ChatInputCommandInteraction,
  organizationID: number
) {
  const {
    rows: [{ count: isMember }],
  } = await db.query<{ count: string }>(
    "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2;",
    [interaction.user.id, organizationID]
  );

  if (isMember !== "1")
    return void (await interaction.reply({
      content: "You aren't in this organization.",
      ephemeral: true,
    }));

  return true;
}

export async function commandIsAuthorized(
  interaction: ChatInputCommandInteraction
) {
  if (
    !interaction.member ||
    !interaction.guild ||
    !(await testPermission(interaction.member, interaction.guild))
  ) {
    await interaction.reply({
      content: "You don't have permission to perform this operation.",
      ephemeral: true,
    });
    return false;
  }

  return true;
}
