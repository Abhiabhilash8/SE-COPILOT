// backend/ingestion/fileScanner.js

const fs = require("fs");
const path = require("path");

// Directories to skip entirely during scanning
const SKIP_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    "out",
    "vendor"
]);

// File extensions we can parse
const ALLOWED_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

/**
 * Recursively scans a directory and returns all parseable source files.
 * @param {string} dirPath - Root directory to scan
 * @returns {string[]} - Array of absolute file paths
 */
function scanFiles(dirPath) {
    const results = [];

    function walk(currentPath) {
        let entries;
        try {
            entries = fs.readdirSync(currentPath, { withFileTypes: true });
        } catch {
            return; // Skip unreadable directories
        }

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) {
                    walk(fullPath);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (ALLOWED_EXTENSIONS.has(ext)) {
                    results.push(fullPath);
                }
            }
        }
    }

    walk(dirPath);
    return results;
}

module.exports = { scanFiles };
