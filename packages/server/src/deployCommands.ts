import "./allCommands.js";
import { commands } from "./commands.js";
import { DISCORD_TOKEN } from "./env.js";
import type { RESTPutAPIApplicationGuildCommandsResult } from "discord.js";
import { REST, Routes } from "discord.js";
import type { RawUserData } from "discord.js/typings/rawDataTypes.js";
import { argv } from "process";

const [, , guildID] = argv;

if (!guildID) {
  console.log("Usage:");
  console.log(`\t${argv.slice(0, 1).join(" ")} <guildID>`);
  process.exit();
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

// and deploy your commands!
console.log(`Started refreshing ${commands.size} application (/) commands.`);

const user = (await rest.get(Routes.user("@me"))) as RawUserData;

// The put method is used to fully refresh all commands in the guild with the current set
const data = (await rest.put(
  Routes.applicationGuildCommands(user.id, guildID),
  {
    body: [...commands.entries()].map(([, cmd]) => cmd.data.toJSON()),
  }
)) as RESTPutAPIApplicationGuildCommandsResult;

console.log(`Successfully reloaded ${data.length} application (/) commands.`);

process.exit();
