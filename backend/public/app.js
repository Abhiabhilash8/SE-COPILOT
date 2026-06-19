// backend/public/app.js

document.addEventListener("DOMContentLoaded", () => {

    /* ─────────────────────────────────────────
       STATE
    ───────────────────────────────────────── */
    let activeRepo    = null;
    let msgHistory    = [];     // full history sent to /api/chat
    let isSending     = false;
    let isIngesting   = false;
    let timerInterval = null;

    /* ─────────────────────────────────────────
       DOM REFS
    ───────────────────────────────────────── */
    const homeView      = document.getElementById("home-view");
    const chatView      = document.getElementById("chat-view");

    const repoUrlInput  = document.getElementById("repo-url-input");
    const ingestBtn     = document.getElementById("ingest-btn");
    const ingestProg    = document.getElementById("ingest-progress");
    const loaderTimer   = document.getElementById("loader-timer");
    const progressLabel = document.getElementById("progress-label");

    const reposGrid     = document.getElementById("repos-grid");
    const refreshBtn    = document.getElementById("refresh-btn");

    const chatRepoName  = document.getElementById("chat-repo-name");
    const chatMessages  = document.getElementById("chat-messages");
    const chatInput     = document.getElementById("chat-input");
    const sendBtn       = document.getElementById("send-btn");
    const backBtn       = document.getElementById("back-btn");
    const clearBtn      = document.getElementById("clear-btn");

    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");
    const step3 = document.getElementById("step-3");

    /* ─────────────────────────────────────────
       MARKDOWN CONFIG
    ───────────────────────────────────────── */
    marked.use({ gfm: true, breaks: true });

    /* ─────────────────────────────────────────
       VIEW SWITCHING
    ───────────────────────────────────────── */
    function showHome() {
        homeView.classList.add("active");
        chatView.classList.remove("active");
        setStep(activeRepo ? 2 : 1);
    }

    function showChat(repoName) {
        homeView.classList.remove("active");
        chatView.classList.add("active");
        chatRepoName.textContent = repoName;
        setStep(3);
        chatInput.focus();
    }

    function setStep(n) {
        [step1, step2, step3].forEach((el, i) => {
            el.removeAttribute("data-active");
            el.removeAttribute("data-done");
            if (i + 1 < n)  el.setAttribute("data-done", "true");
            if (i + 1 === n) el.setAttribute("data-active", "true");
        });
    }

    /* ─────────────────────────────────────────
       LOAD REPOSITORIES
    ───────────────────────────────────────── */
    async function loadRepos() {
        reposGrid.innerHTML = `
            <div class="repos-loading">
                <div class="spinner-sm"></div>
                <span>Loading indexed repositories…</span>
            </div>`;

        try {
            const res  = await fetch("/api/repos");
            const data = await res.json();

            if (!data.success) throw new Error(data.error);

            renderReposGrid(data.repos);

            // If there is at least one repo, mark step 1 done, step 2 active
            if (data.repos.length > 0 && !activeRepo) setStep(2);

        } catch (err) {
            reposGrid.innerHTML = `
                <div class="repos-empty">
                    <strong>Could not load repositories</strong>
                    ${err.message || "Connection error."}
                </div>`;
        }
    }

    function renderReposGrid(repos) {
        if (!repos.length) {
            reposGrid.innerHTML = `
                <div class="repos-empty">
                    <strong>No codebases indexed yet</strong>
                    Paste a GitHub URL above and click Ingest to get started.
                </div>`;
            return;
        }

        reposGrid.innerHTML = "";
        repos.forEach(name => {
            const card = document.createElement("div");
            card.className = "repo-card";
            card.innerHTML = `
                <div class="repo-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                        <path d="M9 18c-4.51 2-5-2-7-2"/>
                    </svg>
                </div>
                <div class="repo-card-name">${name}</div>
                <div class="repo-card-cta">
                    Open chat
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>`;

            card.addEventListener("click", () => {
                window.location.hash = "#chat-" + encodeURIComponent(name);
            });
            reposGrid.appendChild(card);
        });
    }

    /* ─────────────────────────────────────────
       OPEN CHAT
    ───────────────────────────────────────── */
    function openChat(repoName) {
        activeRepo   = repoName;
        msgHistory   = [];
        chatMessages.innerHTML = "";
        showChat(repoName);
        appendWelcome(repoName);
    }

    function appendWelcome(repoName) {
        const text = `👋 Hi! I have loaded the **${repoName}** codebase graph from Neo4j.\n\nYou can ask me things like:\n- *What database access nodes exist in this repo?*\n- *Are there circular dependencies?*\n- *Explain the authentication middleware flow.*\n- *Trace an API route from endpoint to the database.*`;
        msgHistory.push({ role: "assistant", content: text });
        appendBubble("bot", text);
    }

    /* ─────────────────────────────────────────
       CHAT BUBBLES
    ───────────────────────────────────────── */
    function appendBubble(role, text) {
        const wrap = document.createElement("div");
        wrap.className = `msg-wrap ${role}`;

        const html = role === "user"
            ? escapeHtml(text)
            : renderMarkdown(text);

        if (role === "bot") {
            wrap.innerHTML = `
                <div class="msg-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
                    </svg>
                </div>
                <div class="msg-bubble">${html}</div>`;
        } else {
            wrap.innerHTML = `<div class="msg-bubble">${html}</div>`;
        }

        chatMessages.appendChild(wrap);
        processCodeBlocks(wrap);
        scrollDown();
    }

    function showTyping() {
        const wrap = document.createElement("div");
        wrap.className = "msg-wrap bot";
        wrap.id = "typing-indicator";
        wrap.innerHTML = `
            <div class="msg-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
                </svg>
            </div>
            <div class="msg-bubble typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>`;
        chatMessages.appendChild(wrap);
        scrollDown();
    }

    function hideTyping() {
        const el = document.getElementById("typing-indicator");
        if (el) el.remove();
    }

    /* ─────────────────────────────────────────
       MARKDOWN + SYNTAX HIGHLIGHT
    ───────────────────────────────────────── */
    function renderMarkdown(text) {
        return marked.parse(text);
    }

    function processCodeBlocks(container) {
        container.querySelectorAll("pre").forEach(pre => {
            const code = pre.querySelector("code");
            if (!code) return;

            // detect language
            let lang = "code";
            for (const cls of code.classList) {
                if (cls.startsWith("language-")) { lang = cls.replace("language-", ""); break; }
            }

            // highlight
            hljs.highlightElement(code);

            // wrap in custom block
            const block = document.createElement("div");
            block.className = "code-block";

            const header = document.createElement("div");
            header.className = "code-block-header";
            header.innerHTML = `<span>${lang}</span>`;

            const copyBtn = document.createElement("button");
            copyBtn.className = "code-copy-btn";
            copyBtn.textContent = "Copy";
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(code.textContent).then(() => {
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
                });
            });

            header.appendChild(copyBtn);
            block.appendChild(header);

            pre.parentNode.insertBefore(block, pre);
            block.appendChild(pre);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function scrollDown() {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    }

    /* ─────────────────────────────────────────
       SEND MESSAGE
    ───────────────────────────────────────── */
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || isSending || !activeRepo) return;

        chatInput.value = "";
        chatInput.style.height = "auto";

        msgHistory.push({ role: "user", content: text });
        appendBubble("user", text);

        isSending = true;
        sendBtn.disabled = true;
        showTyping();

        try {
            const res  = await fetch("/api/chat", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ repoName: activeRepo, messages: msgHistory })
            });
            const data = await res.json();

            hideTyping();
            isSending    = false;
            sendBtn.disabled = false;

            if (data.success) {
                msgHistory = data.messages;
                appendBubble("bot", data.response);
            } else {
                appendBubble("bot", `❌ **Error:** ${data.error || "Request failed."}`);
            }
        } catch (err) {
            hideTyping();
            isSending    = false;
            sendBtn.disabled = false;
            appendBubble("bot", "❌ **Error:** Could not reach the server. Is it running?");
        }
    }

    /* ─────────────────────────────────────────
       INGEST PIPELINE
    ───────────────────────────────────────── */
    async function handleIngest() {
        const url = repoUrlInput.value.trim();
        if (!url || isIngesting) return;

        if (!url.includes("github.com/")) {
            repoUrlInput.style.borderColor = "#ef4444";
            setTimeout(() => { repoUrlInput.style.borderColor = ""; }, 2000);
            return;
        }

        isIngesting = true;
        ingestBtn.disabled      = true;
        repoUrlInput.disabled   = true;
        ingestProg.classList.remove("hidden");

        // Start elapsed timer
        let secs = 0;
        loaderTimer.textContent  = "00:00";
        progressLabel.textContent = "Cloning repository…";
        timerInterval = setInterval(() => {
            secs++;
            const m = String(Math.floor(secs / 60)).padStart(2, "0");
            const s = String(secs % 60).padStart(2, "0");
            loaderTimer.textContent = `${m}:${s}`;
            // Cycle through status labels
            if (secs === 8)  progressLabel.textContent = "Scanning source files…";
            if (secs === 18) progressLabel.textContent = "Parsing with Tree-sitter…";
            if (secs === 35) progressLabel.textContent = "Building knowledge graph…";
            if (secs === 50) progressLabel.textContent = "Writing to Neo4j…";
        }, 1000);

        try {
            const res  = await fetch("/api/ingest", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ repoUrl: url })
            });
            const data = await res.json();

            clearInterval(timerInterval);
            isIngesting           = false;
            ingestBtn.disabled    = false;
            repoUrlInput.disabled = false;
            ingestProg.classList.add("hidden");

            if (data.success) {
                repoUrlInput.value = "";
                await loadRepos();
                window.location.hash = "#chat-" + encodeURIComponent(data.data.repoName);
            } else {
                alert(`Ingestion failed:\n\n${data.error}`);
            }

        } catch (err) {
            clearInterval(timerInterval);
            isIngesting           = false;
            ingestBtn.disabled    = false;
            repoUrlInput.disabled = false;
            ingestProg.classList.add("hidden");
            alert("Connection error — is the server running?");
        }
    }

    /* ─────────────────────────────────────────
       EVENT LISTENERS
    ───────────────────────────────────────── */
    ingestBtn.addEventListener("click", handleIngest);
    repoUrlInput.addEventListener("keydown", e => {
        if (e.key === "Enter") handleIngest();
    });

    refreshBtn.addEventListener("click", loadRepos);

    backBtn.addEventListener("click", () => {
        window.location.hash = "";
    });

    clearBtn.addEventListener("click", () => {
        if (!activeRepo) return;
        msgHistory     = [];
        chatMessages.innerHTML = "";
        appendWelcome(activeRepo);
    });

    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-grow textarea
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = chatInput.scrollHeight + "px";
    });

    function handleRouting() {
        const hash = window.location.hash;
        if (hash.startsWith("#chat-")) {
            const repoName = decodeURIComponent(hash.substring(6));
            if (activeRepo !== repoName) {
                openChat(repoName);
            } else {
                showChat(repoName);
            }
        } else {
            activeRepo = null;
            showHome();
            loadRepos();
        }
    }

    window.addEventListener("hashchange", handleRouting);

    handleRouting();
});
