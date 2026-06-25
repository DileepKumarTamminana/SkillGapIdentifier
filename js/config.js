/* ============================================================
   Configuration
   Central place for the API base URL and endpoint paths.
   ============================================================ */
(function (global) {
    "use strict";

    var API_BASE = "https://dx87uzkcm2.execute-api.us-east-1.amazonaws.com";

    global.CONFIG = {
        API_BASE: API_BASE,
        MANAGER_ID: "MANAGER1",
        HISTORY_PAGE_SIZE: 5,
        endpoints: {
            employees: "/employees",
            roles: "/roles",
            skillGap: "/skill-gap",
            history: "/history",
            requestSkill: "/request-skill",
            pendingRequests: "/pending-requests",
            approveSkill: "/approve-skill",
            expiringSkills: "/expiring-skills",
            assignLearning: "/assign-learning",
            updateEmployeeRole: "/update-employee-role",
            createEmployee: "/create-employee",
            employeeRequestsStatus: "/employee-requests-status",
            toggleFavorite: "/toggle-favorite"
        }
    };
})(window);
