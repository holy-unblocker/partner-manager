import {
  resolveOrg,
  sanitizeOrgID,
  testPermission,
  userIsMember,
  userIsOwner,
} from "./util.js";
import { validAddress } from "@shared-server/util";
import type { ChatInputCommandInteraction } from "discord.js";

export async function commandValidDomain(
  interaction: ChatInputCommandInteraction,
  domain: string
) {
  if (validAddress(domain)) return true;

  await interaction.reply({
    content: "Invalid domain",
    ephemeral: true,
  });

  return false;
}

export async function getCommandID(interaction: ChatInputCommandInteraction) {
  const vid = sanitizeOrgID(interaction.options.getString("id", true));

  try {
    return await resolveOrg(vid);
  } catch (err) {
    await interaction.reply({
      content: "The organization with ID doesn't exist.",
      ephemeral: true,
    });
  }
}

export async function commandIsOwner(
  interaction: ChatInputCommandInteraction,
  organizationID: number
) {
  if (await userIsOwner(interaction.user.id, organizationID)) return true;

  await interaction.reply({
    content: "You aren't an owner of this organization.",
    ephemeral: true,
  });

  return false;
}

export async function commandIsMember(
  interaction: ChatInputCommandInteraction,
  organizationID: number
) {
  if (await userIsMember(interaction.user.id, organizationID)) return true;

  await interaction.reply({
    content: "You aren't in this organization.",
    ephemeral: true,
  });

  return false;
}

export async function commandIsAuthorized(
  interaction: ChatInputCommandInteraction
) {
  if (!interaction.guild) throw new Error("No guild");
  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (!member || !(await testPermission(member))) {
    await interaction.reply({
      content: "You don't have permission to perform this operation.",
      ephemeral: true,
    });
    return false;
  }

  return true;
}
