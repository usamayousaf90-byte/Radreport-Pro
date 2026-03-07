const fs = require("node:fs");
const path = require("node:path");
const { isDbConfigured, query, withTransaction } = require("../lib/db");

async function main() {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is missing. Set it before running migrations.");
  }

  var migrationsDir = path.resolve(__dirname, "..", "migrations");
  var files = fs.readdirSync(migrationsDir).filter(function(file) {
    return file.endsWith(".sql");
  }).sort();

  await query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  var appliedRows = await query("select name from schema_migrations");
  var applied = new Set(appliedRows.map(function(row) { return row.name; }));

  for (var i = 0; i < files.length; i += 1) {
    var file = files[i];
    if (applied.has(file)) continue;
    var sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log("Applying", file);
    await withTransaction(async function(client) {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
    });
  }

  console.log("Migrations complete");
}

main().catch(function(err) {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
