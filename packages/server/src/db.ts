import { PG_URL } from "./env.js";
import pg from "pg";

const db = new pg.Client(PG_URL);

export default db;
