import "source-map-support";
import { config } from "dotenv-flow";
import { env } from "node:process";

// Read dotenv files
config();

/**
 * Discord bot token
 */
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
if (!DISCORD_TOKEN) throw new TypeError("Need DISCORD_TOKEN var");

/**
 * Port to listen on
 */
export const PORT = Number(env.PORT || "8080");
if (isNaN(PORT)) throw new TypeError("Need PORT var");

/**
 * Postgres server URI
 */
export const PG_URL = env.PG_URL || "";
if (!PG_URL) throw new TypeError("Need PG_URL var");

/**
 * Private API key
 */
export const API_KEY = Buffer.from(env.API_KEY || "", "base64url");
if (!API_KEY.length) throw new TypeError("Need API_KEY var");
