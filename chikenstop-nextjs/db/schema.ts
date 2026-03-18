import { index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { OfficialCartLine } from "@/types/types";

// for now, neondb will only store temporary carts that are already validated
// this is the drizzle table with the attributes for the temporary carts
export const temporaryCarts = pgTable(
  "temporary_carts",
  {
    id: uuid("id").primaryKey(),
    currency: text("currency").notNull(),
    items: jsonb("items").$type<OfficialCartLine[]>().notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    verifiedAt: timestamp("verified_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow()
      .notNull(),
  },
  (table) => [index("temporary_carts_expires_at_idx").on(table.expiresAt)],
);
