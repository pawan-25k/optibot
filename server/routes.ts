import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get or create user by wallet address
  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        user = await storage.createUser({ walletAddress });
      }

      res.json(user);
    } catch (error) {
      console.error("Error in /api/auth/wallet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get trips for authenticated user
  app.get("/api/trips/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const trips = await storage.getTripsByUserId(user.id);
      res.json(trips);
    } catch (error) {
      console.error("Error in /api/trips:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new trip
  app.post("/api/trips", async (req, res) => {
    try {
      const { walletAddress, mode, distance, tokensEarned } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Get or create user
      let user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        user = await storage.createUser({ walletAddress });
      }

      // Validate trip data
      const tripData = insertTripSchema.parse({
        userId: user.id,
        mode,
        distance,
        tokensEarned
      });

      const trip = await storage.createTrip(tripData);
      res.json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid trip data", 
          errors: error.errors 
        });
      }
      
      console.error("Error in POST /api/trips:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
