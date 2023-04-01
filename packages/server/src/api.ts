import db from "./db.js";
import { API_KEY, PORT } from "./env.js";
import { validAddress } from "@shared-server/util";
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

server.post(
  "/add",
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
      // array of domains separated by commas
      body: {
        type: "string",
      },
    },
  },
  async (req, reply) => {
    const auth = req.headers.authorization; // authorization is just a string

    const domains = (req.body as string).split(",").filter(validAddress);

    if (!domains.length) {
      return reply.status(400).send({ message: "Domain is required" });
    }

    // Check if the token is valid
    const org = (
      await db.query<{ id: number }>(
        "SELECT iIDd FROM ORGANIZATIONS WHERE TOKENS = $1;",
        [auth]
      )
    ).rows[0];

    if (!org) {
      return reply.status(401).send({ message: "Invalid authorization token" });
    }

    // Use the organization ID to insert multiple domains into the domains table
    try {
      const result = await db.query(
        `INSERT INTO DOMAINS (DOMAIN, ORGANIAZTION) SELECT unnest($1::text[]), $2 ON CONFLICT (DOMAIN) DO NOTHING RETURNING *;`,
        [domains, org.id]
      );

      if (result.rowCount === 0) {
        return reply
          .status(200)
          .send({ message: "No new domains added, all domains already exist" });
      }

      reply
        .status(201)
        .send({ message: `${result.rowCount} domains added successfully` });
    } catch (error) {
      reply.status(500).send({ message: "Failed to add domains", error });
    }
  }
);

await server.listen({
  port: PORT,
});

console.log(`Listening on :${PORT}`);
