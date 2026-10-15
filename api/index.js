const { waitUntil, attachDatabasePool } = require("@vercel/functions");
const { createDatabase } = require("../server/postgres-db.cjs");
const { createPostgresApi, send } = require("../server/postgres-api.cjs");
let api;
module.exports = async (req, res) => {
  if (!process.env.DATABASE_URL) {
    send(res, 503, {
      error:
        "Backend sudah tersedia, tetapi DATABASE_URL belum diatur. Pemilik aplikasi perlu menambahkannya di Vercel lalu deploy ulang.",
    });
    return;
  }
  if (!api) {
    try {
      const db = createDatabase(process.env.DATABASE_URL);
      attachDatabasePool(db.pool);
      api = createPostgresApi({ db, defer: waitUntil });
    } catch {
      send(res, 503, {
        error:
          "Konfigurasi database belum valid. Periksa DATABASE_URL di Vercel, lalu deploy ulang.",
      });
      return;
    }
  }
  return api.handle(req, res);
};
