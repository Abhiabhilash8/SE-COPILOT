const path = require("path");
const loadGraph = require("./graph/GraphLoader");
const { dfs , bfs } = require("./graph/traversal");


const graph = loadGraph(
    path.join(__dirname, "../repositories/to-do")
);

const {

    findControllers,

    findServices,

    findRepositories,

    findModels,

    findDependencies,

    findDependents,

    findLeafNodes,

    findRootNodes,

    findConnectedNodes

} = require("./graph/queries");

console.log("\n==============================");
console.log("QUERY TESTS");
console.log("==============================");

console.log("\nControllers");
console.log(findControllers(graph));

console.log("\nServices");
console.log(findServices(graph));

console.log("\nRepositories");
console.log(findRepositories(graph));

console.log("\nModels");
console.log(findModels(graph));

const sample = graph.getAllNodes()[0];

console.log("\nDependencies");
console.log(findDependencies(graph, sample.id));

console.log("\nDependents");
console.log(findDependents(graph, sample.id));

console.log("\nLeaf Nodes");
console.log(findLeafNodes(graph));

console.log("\nRoot Nodes");
console.log(findRootNodes(graph));

console.log("\nConnected Nodes");
console.log(findConnectedNodes(graph, sample.id));
