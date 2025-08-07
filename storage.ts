import { type User, type InsertUser, type EmailAccount, type EmailResult } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Define the structure for a single bounce record
export type BounceRecord = {
    id: string;
    recipient: string;
    bounceType: string;
    accountKey: string;
    createdAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountsPath = path.join(__dirname, '..', 'accounts.json');
// NEW: Define the path for our new bounces.json file
const bouncesPath = path.join(__dirname, '..', 'bounces.json');

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getEmailAccounts(): Promise<EmailAccount[]>;
  addEmailAccount(account: EmailAccount): Promise<EmailAccount>; // Updated to expect full account
  storeEmailResults(results: EmailResult[]): Promise<void>;
  getEmailResults(sessionId?: string): Promise<EmailResult[]>;
  // NEW: Functions to handle reading and writing bounces
  storeBounce(bounce: Omit<BounceRecord, 'id' | 'createdAt'>): Promise<BounceRecord>;
  getBounces(): Promise<BounceRecord[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private emailResults: Map<string, EmailResult[]>;

  constructor() {
    this.users = new Map();
    this.emailResults = new Map();
    // Ensure the bounces.json file exists when the app starts
    if (!fs.existsSync(bouncesPath)) {
        fs.writeFileSync(bouncesPath, JSON.stringify([]));
    }
  }

  // --- NEW: Function to get all bounces from bounces.json ---
  async getBounces(): Promise<BounceRecord[]> {
      try {
          const bouncesData = fs.readFileSync(bouncesPath, 'utf8');
          return JSON.parse(bouncesData);
      } catch (error) {
          console.error('Error loading bounces:', error);
          return [];
      }
  }

  // --- NEW: Function to add a single bounce to bounces.json ---
  async storeBounce(bounce: Omit<BounceRecord, 'id' | 'createdAt'>): Promise<BounceRecord> {
      const allBounces = await this.getBounces();
      const newBounce: BounceRecord = {
          ...bounce,
          id: randomUUID(),
          createdAt: new Date().toISOString(),
      };
      allBounces.push(newBounce);
      fs.writeFileSync(bouncesPath, JSON.stringify(allBounces, null, 2));
      return newBounce;
  }

  // --- The rest of the functions remain the same ---
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

  async addEmailAccount(account: EmailAccount): Promise<EmailAccount> {
    try {
      const currentAccounts = await this.getEmailAccounts();
      currentAccounts.push(account);
      fs.writeFileSync(accountsPath, JSON.stringify(currentAccounts, null, 2));
      return account;
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