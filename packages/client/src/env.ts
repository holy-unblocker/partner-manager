import { config } from "dotenv-flow";
import { env } from "node:process";

config();

/**
 * Path to write NGINX snippet
 */
export const OUTPUT_FILE =
  env.OUTPUT_FILE || "/etc/nginx/snippets/domains.conf";

/**
 * Private API key
 */
export const API_KEY = Buffer.from(env.API_KEY || "", "base64url");
if (!API_KEY.length) throw new TypeError("Need API_KEY var");

/**
 * API to request domains from
 */
export const API_URL = env.API_URL || "https://holyubofficial.net/she/";
