// backend/graph/traversal.js

function dfs(graph, startId) {
    const visited = new Set();
    const traversalOrder = [];

    function traverse(currentId) {
        if (visited.has(currentId)) return;

        visited.add(currentId);
        traversalOrder.push(currentId);

        const edges = graph.getOutgoingEdges(currentId);

        for (const edge of edges) {
            traverse(edge.to);
        }
    }

    traverse(startId);

    return traversalOrder;
}

function bfs(graph, startId) {
    const visited = new Set();
    const traversalOrder = [];
    const queue = [];

    queue.push(startId);
    visited.add(startId);

    while (queue.length > 0) {
        const current = queue.shift();

        traversalOrder.push(current);

        const edges = graph.getOutgoingEdges(current);

        for (const edge of edges) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                queue.push(edge.to);
            }
        }
    }

    return traversalOrder;
}

function findPath(graph, startId, targetId) {
    const queue = [startId];
    const visited = new Set();
    const parent = new Map();

    visited.add(startId);

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === targetId) break;

        const edges = graph.getOutgoingEdges(current);

        for (const edge of edges) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                parent.set(edge.to, current);
                queue.push(edge.to);
            }
        }
    }

    if (!visited.has(targetId)) return null;

    const path = [];

    let current = targetId;

    while (current !== undefined) {
        path.push(current);
        current = parent.get(current);
    }

    return path.reverse();
}

function reachableNodes(graph, startId) {
    return dfs(graph, startId);
}

function hasPath(graph, startId, targetId) {
    return findPath(graph, startId, targetId) !== null;
}

module.exports = {
    dfs,
    bfs,
    findPath,
    reachableNodes,
    hasPath
};