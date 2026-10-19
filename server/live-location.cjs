// Shared SQL works in PostgreSQL and SQLite; rows are scoped to the authenticated owner.
const LEASE = 45000;
const idOK = (id) => typeof id === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(id);
function createLiveLocation(db, prefix = "") {
  const table = `${prefix}live_locations`,
    sessions = `${prefix}sessions`;
  async function state(username) {
    const now = Date.now();
    await db.query(
      `DELETE FROM ${table} WHERE expires <= $1 OR session_hash NOT IN (SELECT token_hash FROM ${sessions} WHERE expires > $1)`,
      [now],
    );
    const rows = (
      await db.query(
        `SELECT username,share_id,latitude,longitude,accuracy,captured,updated,expires,photo FROM ${table}`,
      )
    ).rows;
    const visible = (row) =>
      row
        ? {
            username: row.username,
            shareId: row.username === username ? row.share_id : undefined,
            latitude: row.latitude,
            longitude: row.longitude,
            accuracy: row.accuracy,
            captured: row.captured,
            updated: row.updated,
            expires: row.expires,
            photo: row.photo,
          }
        : null;
    return {
      mine: visible(rows.find((r) => r.username === username)),
      partner: visible(
        rows.find(
          (r) => r.username === (username === "alih" ? "nana" : "alih"),
        ),
      ),
      serverNow: now,
    };
  }
  async function handle(action, input, username, sessionHash) {
    const now = Date.now();
    if (!idOK(input.shareId))
      return { status: 400, data: { error: "Sesi lokasi tidak valid." } };
    if (action === "start") {
      if (
        input.mode !== undefined &&
        !["foreground", "background"].includes(input.mode)
      )
        return { status: 400, data: { error: "Mode lokasi tidak valid." } };
      const lease = input.mode === "background" ? 120000 : LEASE;
      if (
        input.photo != null &&
        (typeof input.photo !== "string" ||
          input.photo.length > 40000 ||
          !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(input.photo))
      )
        return { status: 400, data: { error: "Foto penanda tidak valid." } };
      await db.query(
        `INSERT INTO ${table}(username,session_hash,share_id,started,expires,sequence,photo,lease_ms)
        VALUES($1,$2,$3,$4,$5,0,$6,$7) ON CONFLICT(username) DO UPDATE SET
        session_hash=excluded.session_hash,share_id=excluded.share_id,started=excluded.started,expires=excluded.expires,
        sequence=0,photo=excluded.photo,lease_ms=excluded.lease_ms,latitude=NULL,longitude=NULL,accuracy=NULL,captured=NULL,updated=NULL`,
        [
          username,
          sessionHash,
          input.shareId,
          now,
          now + lease,
          input.photo || null,
          lease,
        ],
      );
      return {
        status: 201,
        data: {
          ok: true,
          expires: now + lease,
          endsAt: now + 3600000,
          serverNow: now,
        },
      };
    }
    if (action === "stop") {
      await db.query(
        `DELETE FROM ${table} WHERE username=$1 AND session_hash=$2 AND share_id=$3`,
        [username, sessionHash, input.shareId],
      );
      return { status: 200, data: { ok: true } };
    }
    if (action !== "update")
      return { status: 404, data: { error: "Endpoint tidak tersedia." } };
    const { latitude, longitude, accuracy, captured, sequence } = input;
    if (
      ![latitude, longitude, accuracy, captured].every(Number.isFinite) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      accuracy < 0 ||
      accuracy > 100000 ||
      captured < now - 30000 ||
      captured > now + 10000 ||
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      sequence > 2147483647
    )
      return {
        status: 400,
        data: {
          error: "Titik GPS tidak valid atau sudah lama. Menunggu lokasi baru.",
        },
      };
    const result = await db.query(
      `UPDATE ${table} SET latitude=$1,longitude=$2,accuracy=$3,captured=$4,updated=$5,
      expires=CASE WHEN started+3600000<$6+lease_ms*1.0 THEN started+3600000 ELSE $6+lease_ms*1.0 END,sequence=$7
      WHERE username=$8 AND session_hash=$9 AND share_id=$10 AND expires>$5 AND started+3600000>$5
      AND sequence<$7 AND (captured IS NULL OR captured<=$4) RETURNING username,expires,started`,
      [
        latitude,
        longitude,
        accuracy,
        captured,
        now,
        now,
        sequence,
        username,
        sessionHash,
        input.shareId,
      ],
    );
    return result.rows.length
      ? {
          status: 200,
          data: {
            ok: true,
            expires: result.rows[0].expires,
            endsAt: result.rows[0].started + 3600000,
            serverNow: now,
          },
        }
      : {
          status: 409,
          data: {
            error: "Sesi live berakhir atau diganti. Mulai berbagi lagi.",
          },
        };
  }
  return { state, handle };
}
module.exports = { createLiveLocation };
