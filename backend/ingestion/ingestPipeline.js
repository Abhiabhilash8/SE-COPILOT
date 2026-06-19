// backend/ingestion/ingestPipeline.js
//
// Orchestrates the full ingestion pipeline:
//   1. Clone the repo
//   2. Scan all JS files
//   3. Parse each file with Tree-sitter
//   4. Build graph (nodes + edges)
//   5. Write to Neo4j

const { cloneRepository } = require("./gitCloner");
const { scanFiles } = require("./fileScanner");
const { initParser, parseFile } = require("./treeSitterParser");
const { buildGraph } = require("./graphBuilder");
const { writeGraphToNeo4j } = require("./neo4jWriter");
const { closeDriver } = require("../graph/neo4jClient");

/**
 * Full end-to-end ingestion pipeline.
 * @param {string} repoUrl - GitHub repository URL
 * @param {{ keepAlive?: boolean }} options
 * @returns {Promise<{ repoName: string, nodeCount: number, edgeCount: number }>}
 */
async function ingest(repoUrl, options = {}) {
    const startTime = Date.now();
    console.log(`\n🚀 Starting ingestion for: ${repoUrl}\n`);

    // ── Step 1: Clone
    console.log("Step 1/5 → Cloning repository...");
    const { repoName, localPath } = await cloneRepository(repoUrl);

    // ── Step 2: Scan files
    console.log("\nStep 2/5 → Scanning source files...");
    const files = scanFiles(localPath);
    console.log(`  [fileScanner] Found ${files.length} JS files`);

    // ── Step 3: Initialize Tree-sitter and parse files
    console.log("\nStep 3/5 → Initializing Tree-sitter parser...");
    await initParser();
    console.log("  [treeSitterParser] Parser ready");

    console.log(`  [treeSitterParser] Parsing ${files.length} files...`);
    const allFacts = [];
    for (const filePath of files) {
        try {
            const facts = parseFile(filePath);
            allFacts.push(facts);
        } catch (err) {
            console.warn(`  [treeSitterParser] Warning: skipping ${filePath} — ${err.message}`);
        }
    }
    console.log(`  [treeSitterParser] Parsed ${allFacts.length} files successfully`);

    // ── Step 4: Build graph
    console.log("\nStep 4/5 → Building knowledge graph...");
    const { nodes, edges } = buildGraph(allFacts, localPath, repoName);
    console.log(`  [graphBuilder] Generated ${nodes.length} nodes, ${edges.length} edges`);

    // ── Step 5: Write to Neo4j
    console.log("\nStep 5/5 → Writing to Neo4j...");
    await writeGraphToNeo4j(nodes, edges, repoName);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Ingestion complete in ${duration}s`);
    console.log(`   Repository : ${repoName}`);
    console.log(`   Nodes      : ${nodes.length}`);
    console.log(`   Edges      : ${edges.length}`);

    if (!options.keepAlive) {
        await closeDriver();
    }

    return { repoName, nodeCount: nodes.length, edgeCount: edges.length };
}

module.exports = { ingest };
