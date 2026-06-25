/* ============================================================
   Manager view
   Pending approvals, expiring certs, team skill-gap tracker,
   assign learning, manage employees + target roles, create.
   ============================================================ */
(function (global) {
    "use strict";

    var UI = global.UI;
    var API = global.API;
    var Store = UI.Store;
    var $ = UI.$;
    var esc = UI.escapeHtml;

    /* ---------- pending skill approval requests ---------- */
    async function loadPendingRequests() {
        var box = $("pendingRequestsBox");
        UI.setLoading(box, "Loading…");
        try {
            var data = await API.getPendingRequests();
            if (!Array.isArray(data) || !data.length) {
                box.innerHTML = "No pending requests.";
                return;
            }
            box.innerHTML = data.map(function (r) {
                return '<div class="entry">' +
                    "<strong>" + esc(r.employeeName) + " (" + esc(r.employeeId) + ")</strong><br>" +
                    "Requested Skill: <strong>" + esc(r.skillName) + "</strong><br>" +
                    "Certification: <strong>" + esc(r.certificationName || "N/A") + "</strong><br>" +
                    "Expiry: <strong>" + esc(r.expiryDate || "N/A") + "</strong>" +
                    '<div class="entry-actions">' +
                        '<button class="action-btn action-primary" data-action="approve-skill" data-id="' + esc(r.requestId) + '" data-decision="APPROVE">Approve</button>' +
                        '<button class="secondary-btn action-btn" data-action="approve-skill" data-id="' + esc(r.requestId) + '" data-decision="REJECT">Reject</button>' +
                    "</div>" +
                    "</div>";
            }).join("");
        } catch (err) {
            console.error(err);
            UI.setError(box, "Error loading requests.");
        }
    }

    async function approveSkill(requestId, decision) {
        var box = $("pendingRequestsBox");
        try {
            var data = await API.approveSkill(requestId, decision);
            UI.toast((data && data.message) || (decision === "APPROVE" ? "Approved." : "Rejected."), "success");
            loadPendingRequests();
        } catch (err) {
            UI.setError(box, err.message || "Error processing request.");
        }
    }

    /* ---------- expiring certifications ---------- */
    async function loadExpiringSkills() {
        var box = $("expiringSkillsBox");
        UI.setLoading(box, "Checking…");
        try {
            var data = await API.getExpiringSkills();
            if (!Array.isArray(data) || !data.length) {
                box.innerHTML = "No expiring certifications.";
                return;
            }
            box.innerHTML = data.map(function (e) {
                return '<div class="entry">' +
                    "<strong>" + esc(e.employeeName) + " (" + esc(e.employeeId) + ")</strong><br>" +
                    "Skill: <strong>" + esc(e.skill) + "</strong><br>" +
                    "Certification: <strong>" + esc(e.certificationName) + "</strong><br>" +
                    "Expiry: <strong>" + esc(e.expiryDate) + "</strong>" +
                    "</div>";
            }).join("");
        } catch (err) {
            console.error(err);
            UI.setError(box, "Error loading expiring certifications.");
        }
    }

    /* ---------- team skill gap tracker ---------- */
    async function runTeamSkillGap() {
        var box = $("teamTableWrapper");

        if (!Store.employees || !Store.employees.length) {
            UI.setError(box, "No employees loaded yet.");
            return;
        }

        UI.setLoading(box, "Running…");

        var targets = Store.employees.filter(function (e) { return e.targetRoleId; });
        if (!targets.length) {
            UI.setError(box, "No employees have a target role assigned.");
            return;
        }

        var results = await Promise.all(targets.map(async function (emp) {
            try {
                var data = await API.skillGap(emp.employeeId, emp.targetRoleId);
                return {
                    employeeId: emp.employeeId,
                    name: emp.name,
                    roleId: emp.targetRoleId,
                    roleName: data.roleName || emp.currentRole || "Unknown",
                    match: (Number(data.matchPercent) || 0),
                    missing: (data.missingSkills || []).length
                };
            } catch (err) {
                console.error("Skill gap failed for", emp.employeeId, err);
                return {
                    employeeId: emp.employeeId,
                    name: emp.name,
                    roleId: emp.targetRoleId,
                    roleName: emp.currentRole || "Unknown",
                    match: null,
                    missing: null
                };
            }
        }));

        results.sort(function (a, b) { return a.roleId > b.roleId ? 1 : -1; });

        box.innerHTML =
            '<div class="table-wrapper"><table class="data-table">' +
            "<thead><tr><th>Employee</th><th>Role ID</th><th>Role Name</th><th>Match</th><th>Missing</th></tr></thead><tbody>" +
            results.map(function (r) {
                return "<tr>" +
                    "<td>" + esc(r.employeeId + " - " + r.name) + "</td>" +
                    "<td>" + esc(r.roleId) + "</td>" +
                    "<td>" + esc(r.roleName) + "</td>" +
                    "<td>" + (r.match === null ? "N/A" : r.match + "%") + "</td>" +
                    "<td>" + (r.missing === null ? "N/A" : r.missing) + "</td>" +
                    "</tr>";
            }).join("") +
            "</tbody></table></div>";
    }

    /* ---------- assign learning ---------- */
    async function assignLearning() {
        var emp = $("assignEmployee").value;
        var skill = $("assignSkillName").value.trim();
        var course = $("assignCourseName").value.trim();
        var due = $("assignDueDate").value;
        var box = $("assignResultBox");

        if (!emp || !skill || !course) {
            UI.setError(box, "Employee, skill and course are required.");
            return;
        }

        UI.setLoading(box, "Assigning…");
        try {
            await API.assignLearning({
                employeeId: emp,
                skillName: skill,
                courseName: course,
                dueDate: due
            });
            UI.setSuccess(box, "Assigned successfully.");
            UI.toast("Learning assigned.", "success");
            $("assignSkillName").value = "";
            $("assignCourseName").value = "";
            $("assignDueDate").value = "";
        } catch (err) {
            UI.setError(box, err.message || "Error assigning learning.");
        }
    }

    /* ---------- manage employees ---------- */
    async function loadManagerEmployees() {
        var box = $("managerEmployeesBox");
        UI.setLoading(box, "Loading…");
        try {
            var data = await API.getEmployees();
            Store.employees = Array.isArray(data) ? data : [];

            var ids = generateIds();
            var idInput = $("newEmpId");
            var roleInput = $("newEmpTargetRole");
            idInput.value = ids.nextEmpId;
            idInput.readOnly = true;
            roleInput.value = ids.nextRoleId;
            roleInput.readOnly = true;

            box.innerHTML = Store.employees.map(function (emp) {
                var options = Store.roles.map(function (r) {
                    var selected = r.roleId === emp.targetRoleId ? " selected" : "";
                    return '<option value="' + esc(r.roleId) + '"' + selected + ">" +
                        esc(r.roleId + " - " + r.roleName) + "</option>";
                }).join("");

                return '<div class="entry">' +
                    "<strong>" + esc(emp.employeeId) + "</strong> - " + esc(emp.name) + "<br>" +
                    "Current Role: " + esc(emp.currentRole) + "<br>" +
                    '<label>Target Role</label>' +
                    '<select id="mgrRole_' + esc(emp.employeeId) + '">' + options + "</select>" +
                    '<div class="entry-actions">' +
                        '<button class="action-btn action-primary" data-action="update-role" data-id="' + esc(emp.employeeId) + '">Save</button>' +
                    "</div>" +
                    "</div>";
            }).join("");
        } catch (err) {
            console.error(err);
            UI.setError(box, "Error loading employees.");
        }
    }

    async function updateEmployeeRole(empId) {
        var select = $("mgrRole_" + empId);
        if (!select) return;
        var roleId = select.value;
        try {
            await API.updateEmployeeRole(empId, roleId);
            UI.toast("Updated " + empId + " → " + roleId, "success");
        } catch (err) {
            UI.toast(err.message || "Error updating role.", "error");
        }
    }

    /* ---------- create employee ---------- */
    async function createEmployee() {
        var empId = $("newEmpId").value.trim();
        var name = $("newEmpName").value.trim();
        var currentRole = $("newEmpRole").value.trim();
        var targetRoleId = $("newEmpTargetRole").value.trim();
        var box = $("newEmpResult");

        if (!empId || !name || !currentRole || !targetRoleId) {
            UI.setError(box, "All fields are required.");
            return;
        }

        UI.setLoading(box, "Creating employee…");
        try {
            await API.createEmployee({
                employeeId: empId,
                name: name,
                currentRole: currentRole,
                targetRoleId: targetRoleId
            });
            UI.setSuccess(box, "Employee created successfully.");
            UI.toast("Employee created.", "success");
            $("newEmpName").value = "";
            $("newEmpRole").value = "";
            await global.Employee.loadEmployees();
            await loadManagerEmployees();
        } catch (err) {
            UI.setError(box, err.message || "Error creating employee.");
        }
    }

    /* ---------- next sequential IDs ---------- */
    function generateIds() {
        if (!Store.employees.length) return { nextEmpId: "E001", nextRoleId: "R001" };
        var nums = Store.employees.map(function (e) {
            return Number(String(e.employeeId).replace(/\D/g, "")) || 0;
        });
        var next = Math.max.apply(null, nums) + 1;
        var padded = String(next).padStart(3, "0");
        return { nextEmpId: "E" + padded, nextRoleId: "R" + padded };
    }

    global.Manager = {
        loadPendingRequests: loadPendingRequests,
        approveSkill: approveSkill,
        loadExpiringSkills: loadExpiringSkills,
        runTeamSkillGap: runTeamSkillGap,
        assignLearning: assignLearning,
        loadManagerEmployees: loadManagerEmployees,
        updateEmployeeRole: updateEmployeeRole,
        createEmployee: createEmployee
    };
})(window);
