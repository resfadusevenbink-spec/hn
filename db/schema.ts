import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    contact: text("contact").notNull(),
    modelId: text("model_id").notNull(),
    modelName: text("model_name").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_bookings_date_time_unique").on(table.date, table.time),
    index("idx_bookings_date").on(table.date),
  ],
);
