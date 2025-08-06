import { type User, type InsertUser, type EmailAccount, type EmailResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getEmailAccounts(): Promise<EmailAccount[]>;
  storeEmailResults(results: EmailResult[]): Promise<void>;
  getEmailResults(sessionId?: string): Promise<EmailResult[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private emailResults: Map<string, EmailResult[]>;

  constructor() {
    this.users = new Map();
    this.emailResults = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEmailAccounts(): Promise<EmailAccount[]> {
    // Load accounts from accounts.json
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const accountsPath = path.join(__dirname, '..', 'accounts.json');
      
      const accountsData = fs.readFileSync(accountsPath, 'utf8');
      const accounts = JSON.parse(accountsData);
      return accounts;
    } catch (error) {
      console.error('Error loading accounts:', error);
      return [];
    }
  }

  async storeEmailResults(results: EmailResult[]): Promise<void> {
    const sessionId = randomUUID();
    this.emailResults.set(sessionId, results);
  }

  async getEmailResults(sessionId?: string): Promise<EmailResult[]> {
    if (sessionId) {
      return this.emailResults.get(sessionId) || [];
    }
    // Return latest results if no sessionId provided
    const entries = Array.from(this.emailResults.entries());
    return entries.length > 0 ? entries[entries.length - 1][1] : [];
  }
}

export const storage = new MemStorage();
