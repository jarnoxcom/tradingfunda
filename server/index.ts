import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import * as dotenv from "dotenv";

import { rssRouter, startRssScheduler } from "./routes/rss";
import { marketRouter, startMarketScheduler } from "./routes/market";
import { aiRouter } from "./routes/ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Enable standard CORS
app.use(cors());

// 2. Parse JSON payloads
app.use(
  express.json({
    limit: "10mb",
  }),
);

// 3. API Rate Limiting (100 req/min per IP per spec)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    error: "Too many requests from this IP. Rate limit is 100 req/min.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

// 4. Wire routes
app.use("/api/rss", rssRouter);
app.use("/api/market", marketRouter);
app.use("/api/ai", aiRouter);

// Base health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 5. Start Background Schedulers
function startBackgroundSchedulers() {
  console.log("Server: Starting background RSS crawling loop...");
  startRssScheduler();

  console.log("Server: Starting background live NSE market poller...");
  startMarketScheduler();
}

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  INDIA MARKET MONITOR BACKEND RELAY SERVER      `);
  console.log(`  Listening on Port: ${PORT}                      `);
  console.log(`==================================================`);

  startBackgroundSchedulers();
});
