import {
  resolveOrg,
  testPermission,
  userIsMember,
  userIsOwner,
} from "./util.js";
import type { ChatInputCommandInteraction } from "discord.js";

export async function getCommandID(interaction: ChatInputCommandInteraction) {
  const vid = interaction.options.getString("id", true).trim().toLowerCase();

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
