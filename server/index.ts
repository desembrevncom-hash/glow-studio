import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import photoshootsRouter from "./routes/photoshoots";

const app = express();
const portStr = process.env.PORT || "8080";
const port = parseInt(portStr, 10);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const APP_VERSION = "1.1.0";
const BUILD_TARGET = process.env.NODE_ENV === "production" ? "Cloud Run (Production)" : "Local Development";
const START_TIME = new Date().toISOString();

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    version: APP_VERSION,
    buildTarget: BUILD_TARGET,
    timestamp: START_TIME,
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-image",
  });
});

// API Routes
app.use("/api", photoshootsRouter);

// Catch-all for undefined /api/* routes (Prevent returning index.html)
app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    code: "API_NOT_FOUND",
    message: "API endpoint not found"
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Studio Glow server running on http://0.0.0.0:${port}`);
  });
}

startServer();
