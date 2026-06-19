// backend/server.js

const express = require("express");
const path = require("path");

// Load environment variables from the root .env
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const apiRouter = require("./routes/api");
const { closeDriver } = require("./graph/neo4jClient");

const app = express();
const PORT = process.env.PORT || 3000;

// Custom CORS middleware to avoid external dependencies
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Request logger middleware
app.use((req, res, next) => {
    console.log(`[server] ${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

// Mount the API router
app.use("/api", apiRouter);

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "UP", 
        timestamp: new Date(),
        env: {
            nodeVersion: process.version,
            neo4jUri: process.env.NEO4J_URI || "bolt://localhost:7687"
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("[server] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: err.message || "Internal Server Error"
    });
});

// Start listening
const server = app.listen(PORT, () => {
    console.log(`\n🚀 SE Copilot REST Server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   API endpoints mounted under: http://localhost:${PORT}/api\n`);
});

// Graceful shutdown handler
const shutdown = async () => {
    console.log("\n[server] Shutting down gracefully...");
    server.close(async () => {
        console.log("[server] HTTP server closed.");
        try {
            await closeDriver();
            console.log("[server] Neo4j driver connection closed.");
            process.exit(0);
        } catch (err) {
            console.error("[server] Error closing Neo4j driver connection:", err);
            process.exit(1);
        }
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
