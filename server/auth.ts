import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config(); // Load env vars

export const auth = betterAuth({
    database: new Database("better-auth.db"),
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
        }
    }
});
