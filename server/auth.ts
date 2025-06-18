import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login request body:", req.body); // Debug log
    
    // Ensure we have a username
    if (!req.body.username) {
      return res.status(400).json({ message: "Username is required" });
    }
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Passport error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed for user:", req.body.username);
        return res.status(401).json({ message: "Invalid username" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        console.log("Login successful for user:", user.username);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Role switching endpoint for super admin
  app.post("/api/user/switch-role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { role } = req.body;
    const user = req.user;
    
    // Only super admin can switch roles
    if (user?.role !== 'super_admin') {
      return res.status(403).json({ message: "Only super admin can switch roles" });
    }
    
    // Valid roles for switching
    const validRoles = ['super_admin', 'facility_admin', 'nurse_manager', 'rn', 'lpn', 'cna', 'contractor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    try {
      // Update user role temporarily
      const updatedUser = await storage.updateUser(user.id, { role });
      if (updatedUser) {
        // Update session
        req.user = updatedUser;
        res.json(updatedUser);
      } else {
        res.status(500).json({ message: "Failed to switch role" });
      }
    } catch (error) {
      console.error('Role switching error:', error);
      res.status(500).json({ message: "Failed to switch role" });
    }
  });
}
