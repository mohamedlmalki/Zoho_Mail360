import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Email account schema
export const emailAccountSchema = z.object({
  name: z.string(),
  account_key: z.string(),
  fromAddress: z.string().email(),
  client_id: z.string(),
  client_secret: z.string(),
  refresh_token: z.string(),
});

export type EmailAccount = z.infer<typeof emailAccountSchema>;

// Single email schema
export const singleEmailSchema = z.object({
  accountSelect: z.string(),
  toAddress: z.string().email(),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

export type SingleEmail = z.infer<typeof singleEmailSchema>;

// Bulk email schema
export const bulkEmailSchema = z.object({
  accountSelect: z.string(),
  recipients: z.string().min(1, "Recipients are required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

export type BulkEmail = z.infer<typeof bulkEmailSchema>;

// Email result schema
export const emailResultSchema = z.object({
  recipient: z.string(),
  status: z.enum(["Success", "Failed"]),
  messageId: z.string().nullable(),
  responseCode: z.number().nullable(),
  error: z.any().nullable(),
  fullResponse: z.any().nullable(), // Store the complete response from Zoho
});

export type EmailResult = z.infer<typeof emailResultSchema>;
