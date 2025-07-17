import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userTable = pgTable("users", {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    phone: varchar({ length: 255 }).notNull(),
    profileImage: text(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});