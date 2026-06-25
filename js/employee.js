/* ============================================================
   Employee view
   Employee/role loading, profile, skill-gap analysis,
   history, learned-skill requests, CSV/PDF export.
   ============================================================ */
(function (global) {
    "use strict";

    var UI = global.UI;
    var API = global.API;
    var CONFIG = global.CONFIG;
    var Store = UI.Store;
    var $ = UI.$;
    var esc = UI.escapeHtml;

    var EMP_SELECTS = ["employeeId", "skillReqEmployee", "assignEmployee"];
    var choicesInstances = {};

    /* ---------- load employees into every employee dropdown ---------- */
    async function loadEmployees() {
        EMP_SELECTS.forEach(function (id) {
            var sel = $(id);
            if (sel) sel.innerHTML = '<option value="">Loading…</option>';
        });

        try {
            var list = await API.getEmployees();
            Store.employees = Array.isArray(list) ? list : [];

            EMP_SELECTS.forEach(function (id) {
                var sel = $(id);
                if (!sel) return;
                var html = '<option value="">-- Select Employee --</option>';
                Store.employees.forEach(function (emp) {
                    html += '<option value="' + esc(emp.employeeId) + '">' +
                        esc(emp.employeeId + " - " + emp.name) + "</option>";
                });
                sel.innerHTML = html;
            });

            initChoices();
        } catch (err) {
            console.error(err);
            UI.toast("Failed to load employees.", "error");
        }
    }

    /* ---------- searchable dropdowns (Choices.js) ---------- */
    function initChoices() {
        if (typeof global.Choices === "undefined") return;
        EMP_SELECTS.forEach(function (id) {
            if (choicesInstances[id]) choicesInstances[id].destroy();
            var el = $(id);
            if (el) {
                choicesInstances[id] = new global.Choices(el, {
                    searchEnabled: true,
                    shouldSort: false,
                    itemSelectText: ""
                });
            }
        });
    }

    /* ---------- load roles ---------- */
    async function loadRoles() {
        var sel = $("roleId");
        if (sel) sel.innerHTML = '<option value="">Loading…</option>';
        try {
            var list = await API.getRoles();
            Store.roles = Array.isArray(list) ? list : [];
            if (sel) {
                var html = '<option value="">-- Select Role --</option>';
                Store.roles.forEach(function (r) {
                    html += '<option value="' + esc(r.roleId) + '">' +
                        esc(r.roleId + " - " + r.roleName) + "</option>";
                });
                sel.innerHTML = html;
            }
        } catch (err) {
            console.error(err);
            UI.toast("Failed to load roles.", "error");
        }
    }

    /* ---------- employee profile ---------- */
    function showEmployeeProfile() {
        var empId = $("employeeId").value;
        var box = $("employeeProfile");
        if (!empId) {
            box.innerHTML = "Select an employee to view details.";
            return;
        }

        var emp = Store.employees.find(function (e) { return e.employeeId === empId; });
        if (!emp) { box.innerHTML = "Employee not found."; return; }

        var skills = emp.skills || [];
        var certs = emp.certifications || [];

        if (emp.targetRoleId) $("roleId").value = emp.targetRoleId;

        var certHtml = certs.length
            ? certs.map(function (c) {
                return "• " + esc(c.skill) + " (" + esc(c.certificationName) +
                    ") — Expiry: " + esc(c.expiryDate);
            }).join("<br>")
            : "None";

        box.innerHTML =
            "<strong>Name:</strong> " + esc(emp.name) + "<br>" +
            "<strong>Current Role:</strong> " + esc(emp.currentRole) + "<br>" +
            "<strong>Skills:</strong> " + (skills.length ? esc(skills.join(", ")) : "None") + "<br>" +
            "<strong>Certifications:</strong><br>" + certHtml;

        loadEmployeeNotification(empId);
    }

    /* ---------- notification pill ---------- */
    async function loadEmployeeNotification(employeeId) {
        var pill = $("empStatusNotification");
        try {
            var data = await API.employeeRequestsStatus(employeeId);
            if (data && (data.approved || data.rejected)) {
                pill.textContent = "Approved: " + (data.approved || 0) + ", Rejected: " + (data.rejected || 0);
            } else {
                pill.textContent = "No updates on learned skills.";
            }
            pill.classList.remove("hidden");
        } catch (err) {
            pill.textContent = "Notifications unavailable";
            pill.classList.remove("hidden");
        }
    }

    /* ---------- skill gap analysis ---------- */
    async function checkSkillGap() {
        var employeeId = $("employeeId").value;
        var roleId = $("roleId").value;
        var out = $("skillGapOutput");

        if (!employeeId || !roleId) {
            UI.setError(out, "Select both an employee and a target role.");
            return;
        }

        UI.setLoading(out, "Analyzing…");

        try {
            var data = await API.skillGap(employeeId, roleId);
            Store.lastSkillGap = data;
            renderSkillGap(out, data);
        } catch (err) {
            console.error(err);
            UI.setError(out, "Error running analysis.");
        }
    }

    function renderSkillGap(out, data) {
        var matched = data.matchedSkills || [];
        var missing = data.missingSkills || [];
        var percent = Number(data.matchPercent) || 0;
        var courses = data.recommendedCourses || [];

        // ring colour reflects how close the employee is to the role
        var ringColor = percent >= 75 ? "var(--success)"
            : percent >= 40 ? "var(--warn)"
            : "var(--danger)";

        function tags(list, kind) {
            if (!list.length) return '<span class="skill-tag empty">None</span>';
            return list.map(function (s) {
                return '<span class="skill-tag ' + kind + '">' + esc(s) + "</span>";
            }).join("");
        }

        var coursesHtml = courses.length
            ? '<div class="table-wrapper"><table class="data-table">' +
                "<thead><tr><th>Skill</th><th>Course</th><th>Link</th></tr></thead><tbody>" +
                courses.map(function (c) {
                    return "<tr><td>" + esc(c.skill) + "</td><td>" + esc(c.courseName) +
                        '</td><td><a href="' + esc(c.courseLink) + '" target="_blank" rel="noopener">Open ↗</a></td></tr>';
                }).join("") +
                "</tbody></table></div>"
            : '<p class="info-box muted">No course recommendations.</p>';

        out.innerHTML =
            '<div class="gap-result">' +
                '<div class="gap-top">' +
                    '<div class="ring" id="gapRing" style="--ring-color:' + ringColor + ';">' +
                        '<span class="ring-label" id="gapRingLabel">0%<small>MATCH</small></span>' +
                    "</div>" +
                    '<div class="gap-meta">' +
                        "<h4>" + esc(data.employeeName) + "</h4>" +
                        "<p>Target role: <strong>" + esc(data.roleName) + "</strong></p>" +
                        '<div class="gap-stats">' +
                            '<span class="stat-chip good">' + matched.length + "<small>MATCHED</small></span>" +
                            '<span class="stat-chip bad">' + missing.length + "<small>MISSING</small></span>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
                "<div>" +
                    '<div class="gap-section-title">Matched skills</div>' +
                    '<div class="skill-tags">' + tags(matched, "matched") + "</div>" +
                "</div>" +
                "<div>" +
                    '<div class="gap-section-title">Missing skills</div>' +
                    '<div class="skill-tags">' + tags(missing, "missing") + "</div>" +
                "</div>" +
                "<div>" +
                    '<div class="gap-section-title">Recommended courses</div>' +
                    coursesHtml +
                "</div>" +
            "</div>";

        // animate the ring + count-up label
        global.setTimeout(function () {
            var ring = $("gapRing");
            if (ring) ring.style.setProperty("--val", percent);
            var label = $("gapRingLabel");
            if (label) {
                var current = 0;
                var step = Math.max(1, Math.round(percent / 30));
                var timer = global.setInterval(function () {
                    current = Math.min(percent, current + step);
                    label.innerHTML = current + "%<small>MATCH</small>";
                    if (current >= percent) global.clearInterval(timer);
                }, 24);
            }
        }, 150);
    }

    /* ---------- export current analysis ---------- */
    function exportCSV() {
        var r = Store.lastSkillGap;
        if (!r) { UI.toast("Run a skill gap analysis first.", "info"); return; }
        UI.downloadCsv("skill-gap-analysis.csv", [
            ["Employee", "Role", "Match %", "Matched Skills", "Missing Skills"],
            [
                r.employeeName,
                r.roleName,
                r.matchPercent,
                (r.matchedSkills || []).join(" | "),
                (r.missingSkills || []).join(" | ")
            ]
        ]);
    }

    function exportPDF() {
        var target = $("skillGapOutput");
        if (!Store.lastSkillGap || !target.textContent.trim()) {
            UI.toast("Run a skill gap analysis first.", "info");
            return;
        }
        if (typeof global.html2pdf === "undefined") {
            UI.toast("PDF library not loaded.", "error");
            return;
        }
        global.html2pdf().from(target).set({
            margin: 10,
            filename: "skill-gap-analysis.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).save();
    }

    /* ---------- history (client-side paginated) ---------- */
    var historyPage = 0;

    async function loadHistory() {
        var employeeId = $("employeeId").value;
        var box = $("historyOutput");
        var tools = $("historyTools");
        var pager = $("historyPager");

        if (!employeeId) {
            UI.setError(box, "Select an employee.");
            tools.classList.add("hidden");
            pager.classList.add("hidden");
            return;
        }

        UI.setLoading(box, "Loading…");
        tools.classList.add("hidden");
        pager.classList.add("hidden");

        try {
            var roleId = $("roleId").value;
            var data = await API.getHistory(employeeId, roleId);

            if (!Array.isArray(data) || !data.length) {
                box.innerHTML = "No history found.";
                return;
            }

            Store.historyCache = data.slice().sort(function (a, b) {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            historyPage = 0;

            tools.classList.remove("hidden");
            renderHistoryPage();
        } catch (err) {
            console.error(err);
            UI.setError(box, "Error loading history.");
        }
    }

    function renderHistoryPage() {
        var box = $("historyOutput");
        var pager = $("historyPager");
        var size = CONFIG.HISTORY_PAGE_SIZE;
        var items = Store.historyCache;
        var pages = Math.ceil(items.length / size);
        var start = historyPage * size;
        var slice = items.slice(start, start + size);

        box.innerHTML = slice.map(function (h, i) {
            var globalIdx = start + i;
            var isTop = globalIdx === 0;
            var matched = (h.matchedSkills || []).join(", ") || "None";
            var missing = (h.missingSkills || []).join(", ") || "None";
            var date = h.timestamp ? String(h.timestamp).split("T")[0] : "";
            var fav = h.favorite ? "⭐" : "☆";
            return '<div class="history-item ' + (isTop ? "highlight" : "") + '">' +
                '<div class="history-meta">' +
                    '<span class="history-timestamp">' + esc(date) + "</span>" +
                    '<button class="star-btn" data-action="toggle-favorite" data-idx="' + globalIdx + '" title="Toggle favorite">' + fav + "</button>" +
                "</div>" +
                '<div class="history-title">' +
                    '<span class="history-role">' + esc(h.roleId || "") + "</span>" +
                    '<span class="match-badge">' + (Number(h.matchPercent) || 0) + "%</span>" +
                "</div>" +
                '<div class="history-details">' +
                    '<span class="detail-pill">Matched: ' + esc(matched) + "</span>" +
                    '<span class="detail-pill">Missing: ' + esc(missing) + "</span>" +
                "</div>" +
                '<div class="history-actions">' +
                    '<button class="action-btn action-primary" data-action="download-history-entry" data-idx="' + globalIdx + '">Download</button>' +
                "</div>" +
                "</div>";
        }).join("");

        if (pages > 1) {
            var btns = "";
            for (var p = 0; p < pages; p++) {
                btns += '<button class="pager-btn ' + (p === historyPage ? "active" : "") +
                    '" data-action="history-page" data-page="' + p + '">' + (p + 1) + "</button>";
            }
            pager.innerHTML = btns;
            pager.classList.remove("hidden");
        } else {
            pager.classList.add("hidden");
        }
    }

    function goToHistoryPage(page) {
        historyPage = page;
        renderHistoryPage();
    }

    async function toggleFavorite(idx) {
        var h = Store.historyCache[idx];
        if (!h) return;
        var newFav = !h.favorite;
        h.favorite = newFav; // optimistic
        renderHistoryPage();

        if (h.historyId === undefined || h.historyId === null) return; // nothing to persist
        try {
            await API.toggleFavorite(h.historyId, newFav);
        } catch (err) {
            console.error(err);
            h.favorite = !newFav; // revert
            renderHistoryPage();
            UI.toast("Could not update favorite.", "error");
        }
    }

    function historyRows(items) {
        var rows = [["EmployeeId", "RoleId", "Match %", "Matched Skills", "Missing Skills", "Timestamp"]];
        items.forEach(function (h) {
            rows.push([
                h.employeeId || $("employeeId").value || "",
                h.roleId || "",
                (h.matchPercent === undefined || h.matchPercent === null) ? 0 : h.matchPercent,
                (h.matchedSkills || []).join(" | "),
                (h.missingSkills || []).join(" | "),
                h.timestamp || ""
            ]);
        });
        return rows;
    }

    function downloadHistory() {
        if (!Store.historyCache.length) { UI.toast("No history to download.", "info"); return; }
        UI.downloadCsv("skill-gap-history.csv", historyRows(Store.historyCache));
    }

    function downloadHistoryEntry(idx) {
        var h = Store.historyCache[idx];
        if (!h) return;
        UI.downloadCsv("skill-gap-history-entry.csv", historyRows([h]));
    }

    /* ---------- request learned skill ---------- */
    async function requestSkill() {
        var empId = $("skillReqEmployee").value;
        var skill = $("reqSkillName").value.trim();
        var cert = $("reqCertName").value.trim();
        var expiry = $("reqExpiryDate").value.trim();
        var box = $("skillReqResult");

        if (!empId || !skill) {
            UI.setError(box, "Employee and Skill Name are required.");
            return;
        }
        if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
            UI.setError(box, "Expiry must be in YYYY-MM-DD format.");
            return;
        }

        UI.setLoading(box, "Submitting…");
        try {
            await API.requestSkill({
                employeeId: empId,
                skillName: skill,
                certificationName: cert,
                expiryDate: expiry || null
            });
            UI.setSuccess(box, "Request submitted.");
            UI.toast("Skill request submitted.", "success");
            $("reqSkillName").value = "";
            $("reqCertName").value = "";
            $("reqExpiryDate").value = "";
        } catch (err) {
            UI.setError(box, err.message || "Error submitting request.");
        }
    }

    global.Employee = {
        loadEmployees: loadEmployees,
        loadRoles: loadRoles,
        showEmployeeProfile: showEmployeeProfile,
        checkSkillGap: checkSkillGap,
        exportCSV: exportCSV,
        exportPDF: exportPDF,
        loadHistory: loadHistory,
        goToHistoryPage: goToHistoryPage,
        toggleFavorite: toggleFavorite,
        downloadHistory: downloadHistory,
        downloadHistoryEntry: downloadHistoryEntry,
        requestSkill: requestSkill
    };
})(window);
