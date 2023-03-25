import type { Permission } from "./configTypes.js";

async function tryPermissions() {
  try {
    // @ts-ignore
    return (await import("../config.js")).default as Permission[];
  } catch {
    console.error("Could not import ../config.js");
    return [] as Permission[];
  }
}

const permissions = await tryPermissions();

export default permissions;
