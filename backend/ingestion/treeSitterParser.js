// backend/ingestion/treeSitterParser.js
//
// Uses web-tree-sitter (WASM-based, no native compilation needed) to
// parse individual JavaScript source files and extract raw code facts.

const { Parser, Language } = require("web-tree-sitter");
const path = require("path");
const fs = require("fs");

const WASM_PATH = path.join(
    __dirname, "..", "..",
    "node_modules", "tree-sitter-javascript",
    "tree-sitter-javascript.wasm"
);

let parser = null;

/**
 * Initialize the Tree-sitter parser (run once before any parsing).
 */
async function initParser() {
    if (parser) return; // Already initialized
    await Parser.init();
    const JavaScript = await Language.load(WASM_PATH);
    parser = new Parser();
    parser.setLanguage(JavaScript);
}

// ----------------------------------------------------------------
// Helper: walk any AST node depth-first
// ----------------------------------------------------------------
function walk(node, visitor) {
    visitor(node);
    for (let i = 0; i < node.childCount; i++) {
        walk(node.child(i), visitor);
    }
}

// ----------------------------------------------------------------
// Express HTTP method names we detect as route definitions
// ----------------------------------------------------------------
const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "all", "use"]);

/**
 * Parse a single JS file and return an object of extracted raw facts.
 *
 * @param {string} filePath - Absolute path to the JS file
 * @returns {{
 *   filePath: string,
 *   functions: Array<{name:string, line:number}>,
 *   classes:   Array<{name:string, line:number}>,
 *   imports:   Array<{source:string, line:number}>,
 *   routes:    Array<{method:string, path:string, line:number}>
 * }}
 */
function parseFile(filePath) {
    const source = fs.readFileSync(filePath, "utf-8");
    const tree = parser.parse(source);
    const root = tree.rootNode;

    const facts = {
        filePath,
        functions: [],
        classes:   [],
        imports:   [],
        routes:    []
    };

    walk(root, (node) => {

        // ── Function declarations: function foo() {}
        if (node.type === "function_declaration") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) {
                facts.functions.push({
                    name: nameNode.text,
                    line: node.startPosition.row + 1
                });
            }
        }

        // ── Arrow / expression: const foo = () => {}  OR  const foo = function() {}
        if (
            node.type === "lexical_declaration" ||
            node.type === "variable_declaration"
        ) {
            for (let i = 0; i < node.childCount; i++) {
                const declarator = node.child(i);
                if (declarator.type !== "variable_declarator") continue;

                const nameNode = declarator.childForFieldName("name");
                const valueNode = declarator.childForFieldName("value");

                if (
                    nameNode &&
                    valueNode &&
                    (valueNode.type === "arrow_function" ||
                     valueNode.type === "function_expression")
                ) {
                    facts.functions.push({
                        name: nameNode.text,
                        line: declarator.startPosition.row + 1
                    });
                }
            }
        }

        // ── exports.foo = function() {} / exports.foo = () => {}
        if (node.type === "assignment_expression") {
            const left = node.childForFieldName("left");
            const right = node.childForFieldName("right");
            if (
                left && right &&
                left.type === "member_expression" &&
                (right.type === "arrow_function" || right.type === "function_expression")
            ) {
                const obj = left.childForFieldName("object");
                const prop = left.childForFieldName("property");
                if (obj && prop && obj.text === "exports") {
                    facts.functions.push({
                        name: `exports.${prop.text}`,
                        line: node.startPosition.row + 1
                    });
                }
            }
        }

        // ── Class declarations: class Foo {}
        if (node.type === "class_declaration") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) {
                facts.classes.push({
                    name: nameNode.text,
                    line: node.startPosition.row + 1
                });
            }
        }

        // ── CommonJS require(): const x = require('...')
        if (node.type === "call_expression") {
            const fn = node.childForFieldName("function");
            const args = node.childForFieldName("arguments");
            if (fn && fn.text === "require" && args && args.childCount >= 3) {
                const argNode = args.child(1); // first actual argument (skipping '(')
                if (argNode && (argNode.type === "string" || argNode.type === "template_string")) {
                    const raw = argNode.text.replace(/['"` ]/g, "");
                    facts.imports.push({ source: raw, line: node.startPosition.row + 1 });
                }
            }
        }

        // ── ES6 import: import foo from './bar'
        if (node.type === "import_statement") {
            const sourceNode = node.childForFieldName("source");
            if (sourceNode) {
                const raw = sourceNode.text.replace(/['"` ]/g, "");
                facts.imports.push({ source: raw, line: node.startPosition.row + 1 });
            }
        }

        // ── Express routes: router.get('/path', handler)  /  app.post('/path', handler)
        if (node.type === "call_expression") {
            const fn = node.childForFieldName("function");
            const args = node.childForFieldName("arguments");

            if (fn && fn.type === "member_expression" && args) {
                const method = fn.childForFieldName("property");
                if (method && HTTP_METHODS.has(method.text)) {
                    // First arg should be the route path string
                    const firstArg = args.child(1);
                    if (firstArg && (firstArg.type === "string" || firstArg.type === "template_string")) {
                        const routePath = firstArg.text.replace(/['"` ]/g, "");
                        if (routePath.startsWith("/")) {
                            facts.routes.push({
                                method: method.text.toUpperCase(),
                                path: routePath,
                                line: node.startPosition.row + 1
                            });
                        }
                    }
                }
            }
        }
    });

    return facts;
}

module.exports = { initParser, parseFile };
