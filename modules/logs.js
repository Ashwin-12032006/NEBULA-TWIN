// Centralized Container Logs Manager

export class LogsManager {
    constructor(streamId, serviceFilterId, severityFilterId, searchInputId, clearBtnId) {
        this.stream = document.getElementById(streamId);
        this.serviceFilter = document.getElementById(serviceFilterId);
        this.severityFilter = document.getElementById(severityFilterId);
        this.searchInput = document.getElementById(searchInputId);
        this.clearBtn = document.getElementById(clearBtnId);

        this.logBuffer = [];
        this.maxBufferSize = 250;

        this.setupListeners();
    }

    setupListeners() {
        if (this.serviceFilter) this.serviceFilter.addEventListener("change", () => this.filterAndRender());
        if (this.severityFilter) this.severityFilter.addEventListener("change", () => this.filterAndRender());
        if (this.searchInput) this.searchInput.addEventListener("input", () => this.filterAndRender());
        if (this.clearBtn) {
            this.clearBtn.addEventListener("click", () => {
                this.logBuffer = [];
                this.filterAndRender();
            });
        }
    }

    pushLog(service, severity, message) {
        const timestamp = new Date().toISOString();
        const logObj = { timestamp, service, severity, message };
        
        this.logBuffer.push(logObj);
        
        // Truncate buffer
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift();
        }

        // Render if it matches current filters
        if (this.matchesFilter(logObj)) {
            this.appendLogLine(logObj);
        }
    }

    matchesFilter(log) {
        const svcVal = this.serviceFilter.value;
        const sevVal = this.severityFilter.value;
        const searchVal = this.searchInput.value.toLowerCase();

        if (svcVal !== "all" && log.service !== svcVal) return false;
        if (sevVal !== "all" && log.severity !== sevVal) return false;
        
        if (searchVal) {
            const matchesText = log.message.toLowerCase().includes(searchVal) || 
                                log.service.toLowerCase().includes(searchVal) ||
                                log.severity.toLowerCase().includes(searchVal);
            if (!matchesText) return false;
        }

        return true;
    }

    appendLogLine(log) {
        if (!this.stream) return;
        const line = document.createElement("div");
        line.className = "terminal-line";
        
        let sevColor = "var(--text-muted)";
        if (log.severity === "ERROR") sevColor = "var(--color-red)";
        else if (log.severity === "WARN") sevColor = "var(--color-yellow)";
        else if (log.severity === "INFO") sevColor = "var(--color-green)";

        // Style the line nicely
        const cleanTime = log.timestamp.split('T')[1].slice(0, 8);
        line.innerHTML = `
            <span style="color:var(--text-muted); font-size:0.75rem;">${cleanTime}</span> 
            [<span style="color:var(--color-cyan); font-weight:600;">${log.service}</span>] 
            [<span style="color:${sevColor}; font-weight:700;">${log.severity}</span>] 
            <span style="color:#d1d2d3;">${log.message}</span>
        `;
        
        this.stream.appendChild(line);
        this.stream.scrollTop = this.stream.scrollHeight;
    }

    filterAndRender() {
        if (!this.stream) return;
        this.stream.innerHTML = "";
        
        this.logBuffer.forEach(log => {
            if (this.matchesFilter(log)) {
                this.appendLogLine(log);
            }
        });
    }

    // Prefill some mock logs
    prefillLogs() {
        const services = ["frontend", "gateway", "user-service", "order-service", "payment-service", "notification-service", "database"];
        const messages = [
            "HTTP GET /api/v1/user/profile - status 200",
            "HTTP POST /api/v1/orders/checkout - status 201",
            "Redis cache hit for key user_sessions_active",
            "Query: SELECT * FROM orders WHERE user_id = 9283",
            "Connection pool status: active_conns=12 idle_conns=8 max_conns=50",
            "Sending transaction request to gateway API endpoints",
            "Email notification successfully pushed to queue notifier-smtp-1",
            "Successfully fetched config from AWS Parameter Store",
            "Kubernetes liveness probe succeeded."
        ];

        for (let i = 0; i < 40; i++) {
            const svc = services[Math.floor(Math.random() * services.length)];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            const level = Math.random() > 0.9 ? "WARN" : "INFO";
            this.pushLog(svc, level, msg);
        }
    }
}
