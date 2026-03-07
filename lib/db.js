const { Pool } = require("pg");

let pool;

function isDbConfigured() {
  return !!String(process.env.DATABASE_URL || "").trim();
}

function isMultiTenantEnabled() {
  return process.env.MULTI_TENANT_MODE === "enabled" && isDbConfigured();
}

function getSslConfig() {
  var url = String(process.env.DATABASE_URL || "");
  if (!url) return false;
  if (process.env.DATABASE_SSL === "disable") return false;
  if (process.env.DATABASE_SSL === "require") return { rejectUnauthorized: false };
  if (url.indexOf("localhost") !== -1 || url.indexOf("127.0.0.1") !== -1) return false;
  return { rejectUnauthorized: false };
}

function getPool() {
  if (!isDbConfigured()) throw new Error("DATABASE_URL is missing");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: getSslConfig()
    });
  }
  return pool;
}

async function query(text, params) {
  var result = await getPool().query(text, params || []);
  return result.rows;
}

async function withTransaction(work) {
  var client = await getPool().connect();
  try {
    await client.query("BEGIN");
    var result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  isDbConfigured,
  isMultiTenantEnabled,
  query,
  withTransaction
};
