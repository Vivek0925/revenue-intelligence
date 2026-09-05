import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import prisma from "./lib/prisma";
import seedRouter from "./routes/seed";
import analyzeRouter from "./routes/analyze";
import recoveryRoutes from "./routes/recovery";
import orchestratorRoutes from "./routes/orchestrator";
import childRecoveryRoutes from "./routes/child-recovery";
import recoveryAggregatorRoutes from "./routes/recovery-aggregator";
import dashboardRoutes from "./routes/dashboard";
import incidentsRoutes from "./routes/incidents";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/seed", seedRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/recovery", recoveryRoutes);
app.use("/api/orchestrate", orchestratorRoutes);
app.use("/api/child-recovery", childRecoveryRoutes);
app.use("/api/recovery-aggregate", recoveryAggregatorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/incidents", incidentsRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Revenue Intelligence API is running 🚀",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Revenue Intelligence API is healthy 🚀",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "API is running but database connection failed",
      database: "disconnected",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
