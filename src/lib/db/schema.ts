import { boolean, integer, json, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import {z, } from "zod"
import {createInsertSchema} from "drizzle-zod";
import { relations } from "drizzle-orm";

export const userTable = pgTable("users", {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    phone: varchar({ length: 255 }).notNull(),
    profileImage: text(),
    isActive: boolean().default(true),
    isAdmin: boolean().notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const createUserSchema = createInsertSchema(userTable);
export type User = z.infer<typeof createUserSchema>;

export const otpTable = pgTable("otps", {
    id: serial().primaryKey(),
    userId: integer("user_id_fk").references(() => userTable.id).notNull(),
    code: varchar({ length: 255 }).notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
});

export const otpTableRelations = relations(otpTable, ({ one }) => ({
    user: one(userTable, {
        fields: [otpTable.userId],
        references: [userTable.id],
    }),
}));

export const otpTableSchema = createInsertSchema(otpTable);

export type Otp = z.infer<typeof otpTableSchema>;

export const idCardTemplateTable = pgTable("id_card_templates", {
    id: serial().primaryKey(),
    admissionYear: varchar("admission_year", {length:255}).notNull(),
    nameCoordinates: json("name_coordinates").notNull(),
    courseCoordinates: json("course_coordinates").notNull(),
    uidCoordinates: json("uid_coordinates").notNull(),
    mobileCoordinates: json("mobile_coordinates").notNull(),
    bloodGroupCoordinates: json("bloodGroup_coordinates").notNull(),
    sportsQuotaCoordinates: json("sports_quota_coordinates").notNull(),
    qrcodeCoordinates: json("qrcode_coordinates").notNull(),
    qrcodeSize: integer("qrcode_size").notNull(),
    validTillDateCoordinates: json("valid_till_date_coordinates"),
    photoDimension: json("photo_dimensions").notNull(),
    disabled: boolean().default(false),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
});
export const createIdCardTemplateSchema = createInsertSchema(idCardTemplateTable);
export type IdCardTemplate = z.infer<typeof createIdCardTemplateSchema>;