const { Pool } = require("pg");

function createDatabase(connectionString) {
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    statement_timeout: 15000,
    query_timeout: 20000,
    allowExitOnIdle: true,
  });
  // Never log connection objects or errors containing database credentials.
  pool.on("error", () => console.error("PostgreSQL idle connection failed."));
  return {
    pool,
    query: (sql, values) => pool.query(sql, values),
    async transaction(task) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout = '15s'");
        const result = await task(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
module.exports = { createDatabase };
