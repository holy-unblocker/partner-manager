import db from "./db.js";
import { API_KEY, PORT } from "./env.js";
import fastify from "fastify";

const server = fastify();

server.get(
  "/",
  {
    schema: {
      headers: {
        type: "object",
        required: ["authorization"],
        properties: {
          authorization: {
            type: "string",
          },
        },
      },
    },
  },
  async (req, reply) => {
    const auth = Buffer.from(req.headers.authorization || "", "base64url");

    if (!auth.equals(API_KEY)) return reply.status(401).send();

    reply.send(
      (
        await db.query<{ domain: string }>(
          "SELECT d.domain FROM domains d JOIN organizations o ON d.organization = o.id WHERE o.enabled = TRUE;"
        )
      ).rows
        .map((row) => row.domain)
        .join(" ")
    );
  }
);

await server.listen({
  port: PORT,
});

console.log(`Listening on :${PORT}`);
