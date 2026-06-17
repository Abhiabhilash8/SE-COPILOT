// backend/graph/queries.js

const { dfs } = require("./traversal");

// --------------------------------------------------
// BASIC NODE QUERIES
// --------------------------------------------------

function findNodesByType(graph, type) {
    return graph
        .getAllNodes()
        .filter(node => node.type === type);
}

function findControllers(graph) {
    return findNodesByType(graph, "Controller");
}

function findServices(graph) {
    return findNodesByType(graph, "Service");
}

function findRepositories(graph) {
    return findNodesByType(graph, "Repository");
}

function findModels(graph) {
    return findNodesByType(graph, "Model");
}

// --------------------------------------------------
// DEPENDENCY QUERIES
// --------------------------------------------------

function findDependencies(graph, nodeId) {

    return graph
        .getOutgoingEdges(nodeId)
        .map(edge => graph.getNode(edge.to));

}

function findDependents(graph, nodeId) {

    return graph
        .getIncomingEdges(nodeId)
        .map(edge => graph.getNode(edge.from));

}

// --------------------------------------------------
// GRAPH STRUCTURE
// --------------------------------------------------

function findLeafNodes(graph) {

    return graph
        .getAllNodes()
        .filter(node => node.getOutgoingEdges().length === 0);

}

function findRootNodes(graph) {

    return graph
        .getAllNodes()
        .filter(node => node.getIncomingEdges().length === 0);

}

function findConnectedNodes(graph, nodeId) {

    return dfs(graph, nodeId)
        .map(id => graph.getNode(id));

}

function findCallChain(graph, startNodeId) {

    const visited = new Set();

    const callChain = [];

    function traverse(currentId) {

        if (visited.has(currentId))
            return;

        visited.add(currentId);

        const node = graph.getNode(currentId);

        callChain.push(node);

        const edges = graph.getOutgoingEdges(currentId);

        for (const edge of edges) {

            if (
                edge.relation === "CALLS" ||
                edge.relation === "USES"
            ) {
                traverse(edge.to);
            }

        }

    }

    traverse(startNodeId);

    return callChain;

}

module.exports = {

    findNodesByType,

    findControllers,

    findServices,

    findRepositories,

    findModels,

    findDependencies,

    findDependents,

    findLeafNodes,

    findRootNodes,

    findConnectedNodes,

    findCallChain

};