import { type User, type InsertUser, type EmailAccount, type EmailResult } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountsPath = path.join(__dirname, '..', 'accounts.json');

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getEmailAccounts(): Promise<EmailAccount[]>;
  addEmailAccount(account: Omit<EmailAccount, "account_key">): Promise<EmailAccount>;
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
    try {
      const accountsData = fs.readFileSync(accountsPath, 'utf8');
      const accounts = JSON.parse(accountsData);
      return accounts;
    } catch (error) {
      console.error('Error loading accounts:', error);
      return [];
    }
  }

  async addEmailAccount(account: Omit<EmailAccount, "account_key">): Promise<EmailAccount> {
    try {
      const newAccountKey = randomUUID();
      const newAccount = { ...account, account_key: newAccountKey };
      const currentAccounts = await this.getEmailAccounts();
      currentAccounts.push(newAccount);
      fs.writeFileSync(accountsPath, JSON.stringify(currentAccounts, null, 2));
      return newAccount;
    } catch (error) {
      console.error('Error adding account:', error);
      throw new Error("Failed to add new account to storage.");
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
    const entries = Array.from(this.emailResults.entries());
    return entries.length > 0 ? entries[entries.length - 1][1] : [];
  }
}

export const storage = new MemStorage();