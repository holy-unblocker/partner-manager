import type { APIInteractionGuildMember, Guild, GuildMember } from "discord.js";

export enum PermissionType {
  User,
  Role,
}

export interface Permission {
  type: PermissionType;
  id: string;
}

export const permissions: Permission[] = [];

const mainGuild = "419123358698045453";

export async function testPermission(
  member: GuildMember | APIInteractionGuildMember,
  guild: Guild
) {
  if (guild.id !== mainGuild) return false;

  for (const permission of permissions)
    switch (permission.type) {
      case PermissionType.User:
        if (permission.id === member.user.id) return true;
        break;
      case PermissionType.Role:
        if (
          Array.isArray(member.roles)
            ? member.roles.includes(permission.id)
            : member.roles.cache.has(permission.id)
        )
          return true;
        break;
    }

  // if (member.permissions.has("Administrator")) return true;

  return false;
}
