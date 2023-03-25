/*
 * Fetch periodically
 *
 * Script is ran persistently
 */
import fetchDomains from "./fetchDomains.js";

fetchDomains();

// Every 30 minutes, fetch the domains
setInterval(fetchDomains, 60e3 * 30);
