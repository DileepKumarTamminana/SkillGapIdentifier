/* ============================================================
   API layer
   Thin fetch wrapper + one function per backend endpoint.
   Every function resolves to parsed data and throws on failure
   so callers can use try/catch consistently.
   ============================================================ */
(function (global) {
    "use strict";

    var CONFIG = global.CONFIG;
    var EP = CONFIG.endpoints;

    function url(path) {
        return CONFIG.API_BASE + path;
    }

    /**
     * Core request helper.
     * @param {string} path     endpoint path
     * @param {object} [opts]   { method, body }
     * @returns {Promise<any>}  parsed JSON (or text fallback)
     */
    async function request(path, opts) {
        opts = opts || {};
        var init = { method: opts.method || "GET" };

        if (opts.body !== undefined) {
            init.headers = { "Content-Type": "application/json" };
            init.body = JSON.stringify(opts.body);
        }

        var res = await fetch(url(path), init);

        var data;
        var text = await res.text();
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            data = text; // non-JSON response
        }

        // Some Lambda proxy integrations wrap the payload in a stringified `body`.
        if (data && typeof data === "object" && typeof data.body === "string") {
            try { data = JSON.parse(data.body); } catch (e) { /* keep as is */ }
        }

        if (!res.ok) {
            var msg = (data && data.message) ? data.message : "Request failed (" + res.status + ")";
            var err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }

        return data;
    }

    function get(path) { return request(path); }
    function post(path, body) { return request(path, { method: "POST", body: body }); }

    global.API = {
        request: request,

        getEmployees: function () { return get(EP.employees); },
        getRoles: function () { return get(EP.roles); },

        skillGap: function (employeeId, roleId) {
            return post(EP.skillGap, { employeeId: employeeId, roleId: roleId });
        },

        getHistory: function (employeeId, roleId) {
            return post(EP.history, { employeeId: employeeId, roleId: roleId });
        },

        requestSkill: function (payload) { return post(EP.requestSkill, payload); },

        getPendingRequests: function () { return get(EP.pendingRequests); },

        approveSkill: function (requestId, action) {
            return post(EP.approveSkill, {
                requestId: requestId,
                action: action,
                managerId: CONFIG.MANAGER_ID
            });
        },

        getExpiringSkills: function () { return get(EP.expiringSkills); },

        assignLearning: function (payload) {
            payload.managerId = CONFIG.MANAGER_ID;
            return post(EP.assignLearning, payload);
        },

        updateEmployeeRole: function (employeeId, targetRoleId) {
            return post(EP.updateEmployeeRole, {
                employeeId: employeeId,
                targetRoleId: targetRoleId
            });
        },

        createEmployee: function (payload) { return post(EP.createEmployee, payload); },

        employeeRequestsStatus: function (employeeId) {
            return post(EP.employeeRequestsStatus, { employeeId: employeeId });
        },

        toggleFavorite: function (historyId, favorite) {
            return post(EP.toggleFavorite, { historyId: historyId, favorite: favorite });
        }
    };
})(window);
