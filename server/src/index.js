import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import guildRoutes from "./routes/guilds.js";
import panelRoutes from "./routes/panels.js";
import ticketRoutes from "./routes/tickets.js";
import customizationRoutes from "./routes/customization.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: process.env.DASHBOARD_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/auth", authRoutes);
app.use("/api/guilds", guildRoutes);
app.use("/api/panels", panelRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/customization", customizationRoutes);

app.get("/health", (req, res) => res.json({ ok: true, name: "Ticket Zick API" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Ticket Zick API running on http://localhost:${PORT}`));
