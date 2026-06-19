// backend/graph/neo4jClient.js

const neo4j = require("neo4j-driver");
const path = require("path");

// Load .env variables
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "password";

let driver;

function getDriver() {
    if (!driver) {
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }
    return driver;
}

/**
 * Run a Cypher query on Neo4j.
 * @param {string} cypher 
 * @param {object} params 
 * @returns {Promise<Array<any>>}
 */
async function runQuery(cypher, params = {}) {
    const d = getDriver();
    const session = d.session();
    try {
        const result = await session.run(cypher, params);
        return result.records;
    } finally {
        await session.close();
    }
}

/**
 * Close the database driver connection.
 */
async function closeDriver() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}

module.exports = {
    runQuery,
    closeDriver,
    getDriver
};
