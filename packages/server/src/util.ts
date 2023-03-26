import permissions from "./config.js";
import { PermissionType } from "./configTypes.js";
import db from "./db.js";
import type { GuildMember } from "discord.js";

declare module "discord.js" {
  interface GuildMember {
    _roles: string[];
  }
}

export async function testPermission(member: GuildMember) {
  if (member.permissions.has("Administrator")) return true;

  for (const permission of permissions)
    switch (permission.type) {
      case PermissionType.User:
        if (permission.id === member.user.id) return true;
        break;
      case PermissionType.Role:
        if (member._roles.includes(permission.id)) return true;
        break;
    }

  return false;
}

export async function userIsOwner(user: string, organizationID: number) {
  const {
    rows: [{ count: isMember }],
  } = await db.query<{ count: string }>(
    "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2 AND OWNER;",
    [user, organizationID]
  );

  return isMember === "1";
}

export async function userIsMember(user: string, organizationID: number) {
  const {
    rows: [{ count: isMember }],
  } = await db.query<{ count: string }>(
    "SELECT COUNT(*) FROM MEMBERSHIPS WHERE ID = $1 AND ORGANIZATION = $2;",
    [user, organizationID]
  );

  return isMember === "1";
}

export async function resolveOrg(vid: string) {
  const {
    rows: [idData],
  } = await db.query<{ id: number; name: string }>(
    "SELECT ID, NAME FROM ORGANIZATIONS WHERE VID = $1;",
    [vid]
  );

  if (!idData) throw new TypeError("Bad vid");

  return {
    id: idData.id,
    displayID: vid,
    name: idData.name,
  };
}

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
