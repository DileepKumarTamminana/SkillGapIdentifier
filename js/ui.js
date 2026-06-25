/* ============================================================
   UI helpers + shared application state
   ============================================================ */
(function (global) {
    "use strict";

    /* ---------- shared in-memory state ---------- */
    var Store = {
        employees: [],
        roles: [],
        lastSkillGap: null,
        historyCache: []
    };

    /* ---------- DOM helpers ---------- */
    function $(id) { return document.getElementById(id); }

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) { return escapeHtml(value); }

    function setLoading(el, label) {
        if (!el) return;
        el.innerHTML = '<span class="loader"></span>' + escapeHtml(label || "Loading…");
    }

    function setError(el, label) {
        if (!el) return;
        el.innerHTML = '<p class="msg-error">' + escapeHtml(label || "Something went wrong.") + "</p>";
    }

    function setSuccess(el, label) {
        if (!el) return;
        el.innerHTML = '<p class="msg-success">' + escapeHtml(label) + "</p>";
    }

    /* ---------- toast notifications ---------- */
    function toast(message, type) {
        var host = $("toastHost");
        if (!host) return;
        var el = document.createElement("div");
        el.className = "toast " + (type || "info");
        el.textContent = message;
        host.appendChild(el);
        global.setTimeout(function () {
            el.classList.add("hide");
            global.setTimeout(function () { el.remove(); }, 300);
        }, 3200);
    }

    /* ---------- theme ---------- */
    function applyStoredTheme() {
        if (localStorage.getItem("theme") === "dark") {
            document.body.classList.add("dark-mode");
        }
    }

    function toggleTheme() {
        var dark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", dark ? "dark" : "light");
    }

    /* ---------- side nav ---------- */
    function toggleNav() {
        var nav = $("sideNav");
        if (nav) nav.classList.toggle("collapsed");
    }

    /* ---------- view switching ---------- */
    function switchView(view) {
        var emp = $("employeePage");
        var mgr = $("managerPage");
        emp.classList.toggle("hidden", view !== "employee");
        mgr.classList.toggle("hidden", view === "employee");
        (view === "employee" ? emp : mgr).scrollTop = 0;

        var buttons = document.querySelectorAll('.nav button');
        buttons.forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-view") === view);
        });
    }

    /* ---------- collapsible sections ---------- */
    function toggleSection(button) {
        if (button) button.classList.toggle("collapse-active");
    }

    /* ---------- date inputs: block past dates ---------- */
    function setMinDates() {
        var today = new Date().toISOString().split("T")[0];
        document.querySelectorAll('input[type="date"]').forEach(function (input) {
            input.min = today;
        });
    }

    /* ---------- CSV download helper ---------- */
    function downloadCsv(filename, rows) {
        var csv = rows.map(function (row) {
            return row.map(function (cell) {
                var s = (cell === null || cell === undefined) ? "" : String(cell);
                if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
                return s;
            }).join(",");
        }).join("\n");

        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    }

    global.UI = {
        Store: Store,
        $: $,
        escapeHtml: escapeHtml,
        escapeAttr: escapeAttr,
        setLoading: setLoading,
        setError: setError,
        setSuccess: setSuccess,
        toast: toast,
        applyStoredTheme: applyStoredTheme,
        toggleTheme: toggleTheme,
        toggleNav: toggleNav,
        switchView: switchView,
        toggleSection: toggleSection,
        setMinDates: setMinDates,
        downloadCsv: downloadCsv
    };
})(window);
