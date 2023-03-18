import { randomBytes } from "node:crypto";

// Key used in API_KEY
console.log(randomBytes(128).toString("base64url"));
