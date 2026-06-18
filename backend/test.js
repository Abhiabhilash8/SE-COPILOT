const path = require("path");
const GraphSearch = require("./graph/graphSearch");
const loadGraph = require("./graph/GraphLoader"); // Change this if your loader file has a different name
const repoIntelligence = require("./graph/repoIntelligence");

async function main() {
    try {
        // Load your graph
        const graphFolderPath = path.join(__dirname, "..", "repositories", "to-do");
        const graph = await loadGraph(graphFolderPath);

        // Create search object
        const search = new GraphSearch(graph);

        console.log("\n========== FIND NODE BY ID ==========\n");

        const firstNode = graph.getAllNodes()[0];

        console.log(search.findNodeById(firstNode.id));

        console.log("\n========== FIND NODE BY NAME ==========\n");

        console.log(search.findNodeByName(firstNode.name));

        console.log("\n========== FIND NODES BY TYPE ==========\n");

        console.log(search.findNodesByType(firstNode.type));

        console.log("\n========== OUTGOING NEIGHBOURS ==========\n");

        console.log(search.getOutgoingNeighbours(firstNode.id));

        console.log("\n========== INCOMING NEIGHBOURS ==========\n");

        console.log(search.getIncomingNeighbours(firstNode.id));

        // ----------------------------------------------------
        // Test Stage 1: Core Search & Traversal APIs
        // ----------------------------------------------------

        // 1. Callers
        const callsEdge = graph.getAllEdges().find(edge => edge.relation === "CALLS");
        if (callsEdge) {
            console.log(`\n========== FIND CALLERS OF ${callsEdge.to} ==========\n`);
            console.log(search.findCallers(callsEdge.to).map(n => `${n.id} (${n.type})`));
        } else {
            console.log("\n========== FIND CALLERS (NO CALLS RELATION FOUND) ==========\n");
        }

        // 2. Dependencies & Dependents
        console.log(`\n========== FIND DEPENDENCIES OF ${firstNode.id} ==========\n`);
        console.log(search.findDependencies(firstNode.id).map(n => `${n.id} (${n.type})`));

        console.log(`\n========== FIND DEPENDENTS OF ${firstNode.id} ==========\n`);
        console.log(search.findDependents(firstNode.id).map(n => `${n.id} (${n.type})`));

        // 3. Relation Search
        const testRelation = "HAS_MODULE";
        console.log(`\n========== FIND NODES BY RELATION '${testRelation}' ==========\n`);
        console.log(search.findNodesByRelation(testRelation).map(n => `${n.id} (${n.type})`));

        // 4. DFS Traversal
        console.log(`\n========== DFS TRAVERSAL FROM ${firstNode.id} ==========\n`);
        console.log(search.dfs(firstNode.id).map(n => n.id));

        // 5. BFS Traversal
        console.log(`\n========== BFS TRAVERSAL FROM ${firstNode.id} ==========\n`);
        console.log(search.bfs(firstNode.id).map(n => n.id));

        // 6. Shortest Path Finding
        const reachable = search.bfs(firstNode.id);
        const targetNode = reachable.find(n => n.id !== firstNode.id);
        if (targetNode) {
            console.log(`\n========== SHORTEST PATH FROM ${firstNode.id} TO ${targetNode.id} ==========\n`);
            const pathNodes = search.findShortestPath(firstNode.id, targetNode.id);
            console.log(pathNodes ? pathNodes.map(n => n.id).join(" -> ") : "No path");
        }

        // ----------------------------------------------------
        // Test Stage 2: Repository Intelligence APIs
        // ----------------------------------------------------

        console.log("\n========== REPOSITORY SUMMARY ==========\n");
        console.log(repoIntelligence.repositorySummary(search));

        console.log("\n========== AUTHENTICATION FLOW ==========\n");
        console.log(JSON.stringify(repoIntelligence.explainAuthenticationFlow(search), null, 2));

        console.log("\n========== API FLOW FOR 'endpoint:post_login' ==========\n");
        console.log(JSON.stringify(repoIntelligence.explainApiFlow(search, "endpoint:post_login"), null, 2));

        console.log("\n========== CIRCULAR DEPENDENCIES ==========\n");
        console.log(repoIntelligence.findCircularDependencies(search));

        console.log("\n========== ENTRY POINTS ==========\n");
        console.log(repoIntelligence.findEntryPoints(search).map(n => `${n.id} (${n.type})`));

        console.log("\n========== DATABASE ACCESS NODES ==========\n");
        console.log(repoIntelligence.findDatabaseAccess(search).map(n => `${n.id} (${n.type})`));

        console.log("\n========== CONNECTED MODULES ==========\n");
        console.log(JSON.stringify(repoIntelligence.findConnectedModules(search), null, 2));

    } catch (err) {
        console.error(err);
    }
}

main();