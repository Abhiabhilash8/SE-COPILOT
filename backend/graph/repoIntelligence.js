// backend/graph/repoIntelligence.js

/**
 * Computes counts of files, classes, folders, and components.
 * @param {GraphSearch} search 
 */
function repositorySummary(search) {
    const allNodes = search.graph.getAllNodes();
    const typeCounts = {};
    for (const node of allNodes) {
        typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    }
    return {
        totalNodes: allNodes.length,
        totalEdges: search.graph.getAllEdges().length,
        typeBreakdown: typeCounts
    };
}

/**
 * Discovers and explains how authentication middleware, routing, and services are linked.
 * @param {GraphSearch} search 
 */
function explainAuthenticationFlow(search) {
    const authNodes = search.graph.getAllNodes().filter(node => 
        node.id.toLowerCase().includes("auth") || 
        node.id.toLowerCase().includes("passport") ||
        node.name.toLowerCase().includes("auth")
    );

    const flowDetails = [];
    for (const node of authNodes) {
        const incoming = search.getIncomingNeighbours(node.id).map(n => `${n.id} (${n.type})`);
        const outgoing = search.getOutgoingNeighbours(node.id).map(n => `${n.id} (${n.type})`);
        flowDetails.push({
            id: node.id,
            type: node.type,
            name: node.name,
            description: node.properties.description || "",
            incoming,
            outgoing
        });
    }
    return flowDetails;
}

/**
 * Explains the path from a starting route endpoint to the database.
 * @param {GraphSearch} search 
 * @param {string} routeNodeId 
 */
function explainApiFlow(search, routeNodeId) {
    const routeNode = search.findNodeById(routeNodeId);
    if (!routeNode) return null;

    // Find a database node
    const dbNode = search.graph.getAllNodes().find(n => n.type === "Database" || n.id.includes("db"));
    
    if (dbNode) {
        const pathNodes = search.findShortestPath(routeNodeId, dbNode.id);
        if (pathNodes) {
            return {
                start: routeNodeId,
                end: dbNode.id,
                flowType: "Route to Database Path",
                path: pathNodes.map(n => ({ id: n.id, type: n.type, name: n.name }))
            };
        }
    }

    // Fallback: all reachable components
    const reachable = search.bfs(routeNodeId);
    return {
        start: routeNodeId,
        flowType: "Reachable Chain (No direct DB connection found)",
        path: reachable.map(n => ({ id: n.id, type: n.type, name: n.name }))
    };
}

/**
 * Identifies dependency cycles in the repository graph.
 * @param {GraphSearch} search 
 */
function findCircularDependencies(search) {
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];
    const path = [];

    function dfsCycle(nodeId) {
        visited.add(nodeId);
        recStack.add(nodeId);
        path.push(nodeId);

        const neighbors = search.findDependencies(nodeId);
        for (const neighbor of neighbors) {
            const neighborId = neighbor.id;
            if (!visited.has(neighborId)) {
                dfsCycle(neighborId);
            } else if (recStack.has(neighborId)) {
                // Cycle found
                const cycleStartIndex = path.indexOf(neighborId);
                const cycle = path.slice(cycleStartIndex);
                cycle.push(neighborId); // Close cycle
                cycles.push(cycle);
            }
        }

        path.pop();
        recStack.delete(nodeId);
    }

    const allNodes = search.graph.getAllNodes();
    for (const node of allNodes) {
        if (!visited.has(node.id)) {
            dfsCycle(node.id);
        }
    }

    return cycles;
}

/**
 * Lists entry point nodes with zero incoming relationships.
 * @param {GraphSearch} search 
 */
function findEntryPoints(search) {
    return search.graph.getAllNodes()
        .filter(node => search.getIncomingNeighbours(node.id).length === 0);
}

/**
 * Lists repository/model/service nodes that directly access the database.
 * @param {GraphSearch} search 
 */
function findDatabaseAccess(search) {
    const dbNodes = search.graph.getAllNodes().filter(n => n.type === "Database" || n.id.includes("db"));
    const dbNodeIds = new Set(dbNodes.map(n => n.id));

    const accessingNodes = search.graph.getAllNodes().filter(node => {
        const dependencies = search.getOutgoingNeighbours(node.id);
        return dependencies.some(dep => dbNodeIds.has(dep.id));
    });

    return accessingNodes;
}

/**
 * Groups related modules by traversing components reachable from modular folders.
 * @param {GraphSearch} search 
 */
function findConnectedModules(search) {
    const appFolder = search.findNodeById("folder:app");
    if (!appFolder) return [];

    const modules = search.getOutgoingNeighbours(appFolder.id)
        .filter(n => n.type === "Folder");

    const connectedModules = [];

    for (const mod of modules) {
        const reachable = search.bfs(mod.id);
        connectedModules.push({
            moduleName: mod.name,
            moduleId: mod.id,
            components: reachable.map(n => `${n.id} (${n.type})`)
        });
    }

    return connectedModules;
}

module.exports = {
    repositorySummary,
    explainAuthenticationFlow,
    explainApiFlow,
    findCircularDependencies,
    findEntryPoints,
    findDatabaseAccess,
    findConnectedModules
};
