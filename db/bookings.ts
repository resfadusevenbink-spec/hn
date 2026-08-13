import { env } from "cloudflare:workers";

export type PublicBooking = {
  id: number;
  modelId: string;
  modelName: string;
  date: string;
  time: string;
  status: string;
  createdAt: string;
};

type CreateBookingInput = {
  name: string;
  contact: string;
  notes: string;
  modelId: string;
  modelName: string;
  date: string;
  time: string;
};

let schemaReady: Promise<void> | null = null;

function getD1() {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  return env.DB;
}

async function ensureBookingSchema() {
  if (!schemaReady) {
    const db = getD1();
    schemaReady = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact TEXT NOT NULL,
          model_id TEXT NOT NULL,
          model_name TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_date_time_unique ON bookings (date, time)",
        ),
        db.prepare("CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (date)"),
      ])
      .then(async () => {
        await db.prepare("PRAGMA optimize").run();
      })
      .catch((error: unknown) => {
        schemaReady = null;
        throw error;
      });
  }

  await schemaReady;
}

export async function listPublicBookings(start: string, end: string) {
  await ensureBookingSchema();

  const result = await getD1()
    .prepare(
      `SELECT
        id,
        model_id AS modelId,
        model_name AS modelName,
        date,
        time,
        status,
        created_at AS createdAt
      FROM bookings
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC, time ASC`,
    )
    .bind(start, end)
    .all<PublicBooking>();

  return result.results ?? [];
}

export async function createBooking(input: CreateBookingInput) {
  await ensureBookingSchema();

  try {
    const booking = await getD1()
      .prepare(
        `INSERT INTO bookings (
          name,
          contact,
          model_id,
          model_name,
          date,
          time,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING
          id,
          model_id AS modelId,
          model_name AS modelName,
          date,
          time,
          status,
          created_at AS createdAt`,
      )
      .bind(
        input.name,
        input.contact,
        input.modelId,
        input.modelName,
        input.date,
        input.time,
        input.notes,
      )
      .first<PublicBooking>();

    if (!booking) {
      throw new Error("Booking insert failed.");
    }

    return booking;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.includes("constraint")) {
      throw new Error("already booked");
    }

    throw error;
  }
}
