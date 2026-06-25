/* ============================================================
   App bootstrap + central event delegation
   A single click handler routes every [data-action] element to
   the right module function, so no inline JS lives in the HTML.
   ============================================================ */
(function (global) {
    "use strict";

    var UI = global.UI;
    var Employee = global.Employee;
    var Manager = global.Manager;

    /* Map of data-action -> handler(element) */
    var actions = {
        // global UI
        "toggle-theme": function () { UI.toggleTheme(); },
        "toggle-nav": function () { UI.toggleNav(); },
        "switch-view": function (el) { UI.switchView(el.getAttribute("data-view")); },
        "toggle-section": function (el) {
            // the collapse-content is the next sibling of the toggle button
            UI.toggleSection(el);
        },

        // employee view
        "analyze-gap": function () { Employee.checkSkillGap(); },
        "export-csv": function () { Employee.exportCSV(); },
        "export-pdf": function () { Employee.exportPDF(); },
        "load-history": function () { Employee.loadHistory(); },
        "download-history": function () { Employee.downloadHistory(); },
        "download-history-entry": function (el) { Employee.downloadHistoryEntry(Number(el.getAttribute("data-idx"))); },
        "toggle-favorite": function (el) { Employee.toggleFavorite(Number(el.getAttribute("data-idx"))); },
        "history-page": function (el) { Employee.goToHistoryPage(Number(el.getAttribute("data-page"))); },
        "request-skill": function () { Employee.requestSkill(); },

        // manager view
        "load-pending": function () { Manager.loadPendingRequests(); },
        "approve-skill": function (el) {
            Manager.approveSkill(el.getAttribute("data-id"), el.getAttribute("data-decision"));
        },
        "load-expiring": function () { Manager.loadExpiringSkills(); },
        "run-team-gap": function () { Manager.runTeamSkillGap(); },
        "assign-learning": function () { Manager.assignLearning(); },
        "load-managed-employees": function () { Manager.loadManagerEmployees(); },
        "update-role": function (el) { Manager.updateEmployeeRole(el.getAttribute("data-id")); },
        "create-employee": function () { Manager.createEmployee(); }
    };

    function onClick(event) {
        var el = event.target.closest("[data-action]");
        if (!el) return;
        var handler = actions[el.getAttribute("data-action")];
        if (handler) {
            event.preventDefault();
            handler(el);
        }
    }

    function init() {
        UI.applyStoredTheme();

        document.addEventListener("click", onClick);

        // employee dropdown drives the profile panel
        var empSelect = UI.$("employeeId");
        if (empSelect) empSelect.addEventListener("change", Employee.showEmployeeProfile);

        // initial data load
        Employee.loadEmployees();
        Employee.loadRoles();
        UI.setMinDates();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(window);
