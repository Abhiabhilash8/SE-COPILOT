// backend/ingestion/graphBuilder.js
//
// Converts raw Tree-sitter facts (from all parsed files) into
// a flat nodes[] and edges[] array matching our Neo4j schema.

const path = require("path");

/**
 * Sanitize a file path into a clean node ID string.
 * e.g. "/workspace/my-repo/app/routes/index.js" → "file:app/routes/index.js"
 */
function fileNodeId(filePath, repoRoot) {
    const relative = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    return `file:${relative}`;
}

/**
 * Make a sanitized ID for a function node.
 * e.g. "function:app/routes/index.js:exports.login"
 */
function functionNodeId(filePath, repoRoot, funcName) {
    const relative = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const safe = funcName.replace(/[^a-zA-Z0-9_.]/g, "_");
    return `function:${relative}:${safe}`;
}

/**
 * Make a sanitized ID for a class node.
 */
function classNodeId(filePath, repoRoot, className) {
    const relative = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    return `class:${relative}:${className}`;
}

/**
 * Make a sanitized ID for a route endpoint node.
 * e.g. "endpoint:GET:/api/users"
 */
function routeNodeId(method, routePath) {
    const safePath = routePath.replace(/[^a-zA-Z0-9_/:-]/g, "_");
    return `endpoint:${method}:${safePath}`;
}

/**
 * Resolve a require/import source path to an absolute file path.
 * Returns null if the path is a node_modules import.
 * @param {string} importSource  - The raw require() argument
 * @param {string} fromFile      - The file doing the importing
 * @param {string} repoRoot      - Root directory of the repo
 */
function resolveImport(importSource, fromFile, repoRoot) {
    // Skip external packages (no leading ./ or /)
    if (!importSource.startsWith(".")) return null;

    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importSource);

    // Try with extensions
    for (const ext of [".js", ".mjs", "/index.js"]) {
        const candidate = resolved.endsWith(".js") ? resolved : resolved + ext;
        try {
            require("fs").accessSync(candidate);
            return candidate;
        } catch {
            // not found with this extension
        }
    }

    return null;
}

/**
 * Build the full nodes[] and edges[] graph from all file facts.
 *
 * @param {Array<object>} allFacts - Array of fact objects from treeSitterParser.parseFile()
 * @param {string} repoRoot        - Absolute path to root of the repository
 * @param {string} repoName        - Human-readable repo name (used as label)
 * @returns {{ nodes: Array, edges: Array }}
 */
function buildGraph(allFacts, repoRoot, repoName) {
    const nodes = [];
    const edges = [];

    // Track all created node IDs to avoid duplicates
    const nodeIds = new Set();

    function addNode(node) {
        if (nodeIds.has(node.id)) return;
        nodeIds.add(node.id);
        nodes.push(node);
    }

    function addEdge(edge) {
        edges.push(edge);
    }

    // ── Step 1: Add a root project node
    addNode({
        id: `project:${repoName}`,
        type: "Project",
        name: repoName,
        file: "",
        description: `Root node for repository: ${repoName}`
    });

    // ── Step 2: Build a map of absolute file path → nodeId for import resolution
    const filePathToNodeId = new Map();
    for (const facts of allFacts) {
        const id = fileNodeId(facts.filePath, repoRoot);
        filePathToNodeId.set(facts.filePath, id);
    }

    // ── Step 3: Process each file's facts
    for (const facts of allFacts) {
        const relPath = path.relative(repoRoot, facts.filePath).replace(/\\/g, "/");
        const fid = fileNodeId(facts.filePath, repoRoot);

        // Add File node
        addNode({
            id: fid,
            type: "File",
            name: relPath,
            file: relPath,
            description: `Source file: ${relPath}`
        });

        // Connect root → file
        addEdge({
            from: `project:${repoName}`,
            relation: "CONTAINS",
            to: fid,
            reason: `Repository contains file ${relPath}`
        });

        // ── Functions
        for (const func of facts.functions) {
            const fnId = functionNodeId(facts.filePath, repoRoot, func.name);
            addNode({
                id: fnId,
                type: "Function",
                name: func.name,
                file: relPath,
                description: `Function '${func.name}' defined in ${relPath} at line ${func.line}`
            });
            addEdge({
                from: fid,
                relation: "DEFINES",
                to: fnId,
                reason: `File defines function '${func.name}' at line ${func.line}`
            });
        }

        // ── Classes
        for (const cls of facts.classes) {
            const clsId = classNodeId(facts.filePath, repoRoot, cls.name);
            addNode({
                id: clsId,
                type: "Class",
                name: cls.name,
                file: relPath,
                description: `Class '${cls.name}' defined in ${relPath} at line ${cls.line}`
            });
            addEdge({
                from: fid,
                relation: "DEFINES",
                to: clsId,
                reason: `File defines class '${cls.name}' at line ${cls.line}`
            });
        }

        // ── Express Routes
        for (const route of facts.routes) {
            const rId = routeNodeId(route.method, route.path);
            addNode({
                id: rId,
                type: "API Endpoint",
                name: `${route.method} ${route.path}`,
                file: relPath,
                description: `Express route ${route.method} ${route.path} declared in ${relPath} at line ${route.line}`
            });
            addEdge({
                from: fid,
                relation: "EXPOSES_ENDPOINT",
                to: rId,
                reason: `File exposes route ${route.method} ${route.path} at line ${route.line}`
            });
        }

        // ── Imports → IMPORTS edges between files
        for (const imp of facts.imports) {
            const resolved = resolveImport(imp.source, facts.filePath, repoRoot);
            if (resolved) {
                const targetId = filePathToNodeId.get(resolved);
                if (targetId && targetId !== fid) {
                    addEdge({
                        from: fid,
                        relation: "IMPORTS",
                        to: targetId,
                        reason: `File imports '${imp.source}' at line ${imp.line}`
                    });
                }
            }
        }
    }

    return { nodes, edges };
}

module.exports = { buildGraph };
