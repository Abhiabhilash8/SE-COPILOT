// backend/ingestion/gitCloner.js

const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs");

const WORKSPACE_DIR = path.join(__dirname, "..", "..", "workspace");

/**
 * Extracts the repository name from a GitHub URL.
 * e.g. "https://github.com/user/my-repo.git" → "my-repo"
 * @param {string} url
 * @returns {string}
 */
function extractRepoName(url) {
    const cleaned = url.replace(/\.git$/, "");
    const parts = cleaned.split("/");
    return parts[parts.length - 1];
}

/**
 * Clones a GitHub repository URL into workspace/<repoName>/.
 * If already cloned, pulls latest changes instead.
 * @param {string} url - GitHub repository URL
 * @returns {Promise<{ repoName: string, localPath: string }>}
 */
async function cloneRepository(url) {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    const repoName = extractRepoName(url);
    const localPath = path.join(WORKSPACE_DIR, repoName);

    if (fs.existsSync(localPath)) {
        console.log(`  [gitCloner] Repo already exists at ${localPath}. Pulling latest...`);
        const git = simpleGit(localPath);
        await git.pull();
    } else {
        console.log(`  [gitCloner] Cloning ${url} into ${localPath}...`);
        const git = simpleGit();
        await git.clone(url, localPath, ["--depth=1"]);
    }

    console.log(`  [gitCloner] Ready: ${localPath}`);
    return { repoName, localPath };
}

module.exports = { cloneRepository, extractRepoName };
