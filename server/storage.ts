import { type User, type InsertUser, type Trip, type InsertTrip, users, trips } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trip methods
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripsByUserId(userId: string): Promise<Trip[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trips: Map<string, Trip>;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Trip methods
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = randomUUID();
    const trip: Trip = {
      ...insertTrip,
      id,
      createdAt: new Date()
    };
    this.trips.set(id, trip);
    return trip;
  }

  async getTripsByUserId(userId: string): Promise<Trip[]> {
    return Array.from(this.trips.values())
      .filter(trip => trip.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Attempt to insert, ignoring conflicts on unique wallet address
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          walletAddress: insertUser.walletAddress.toLowerCase()
        })
        .onConflictDoNothing({ target: users.walletAddress })
        .returning();
      
      // If no user returned due to conflict, fetch the existing user
      if (user) {
        return user;
      } else {
        const existingUser = await this.getUserByWalletAddress(insertUser.walletAddress);
        if (existingUser) {
          return existingUser;
        }
        throw new Error('Failed to create or retrieve user');
      }
    } catch (error) {
      // Fallback: try to get existing user in case of any error
      const existingUser = await this.getUserByWalletAddress(insertUser.walletAddress);
      if (existingUser) {
        return existingUser;
      }
      throw error;
    }
  }

  // Trip methods
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values(insertTrip)
      .returning();
    return trip;
  }

  async getTripsByUserId(userId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.createdAt));
  }
}

export const storage = new DatabaseStorage();
