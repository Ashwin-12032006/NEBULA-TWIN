// Database Explorer Module for Browsing Seeded PostgreSQL Tables

export class DatabaseExplorer {
    constructor(selectId, refreshBtnId, activeTableNameId, rowCountId, dataTableId, emptyMsgId) {
        this.select = document.getElementById(selectId);
        this.refreshBtn = document.getElementById(refreshBtnId);
        this.activeTableName = document.getElementById(activeTableNameId);
        this.rowCount = document.getElementById(rowCountId);
        this.dataTable = document.getElementById(dataTableId);
        this.emptyMsg = document.getElementById(emptyMsgId);
        
        this.liveMode = false;
        this.apiBaseUrl = "http://localhost:8080";
        this.setupListeners();
    }

    setApiBaseUrl(url) {
        this.apiBaseUrl = url;
    }

    setupListeners() {
        if (!this.select || !this.refreshBtn) return;
        
        this.select.addEventListener("change", () => {
            this.loadActiveTable();
        });
        
        this.refreshBtn.addEventListener("click", () => {
            this.loadActiveTable();
        });
    }

    setLiveMode(live) {
        this.liveMode = live;
    }

    loadActiveTable(state = null) {
        const tableName = this.select.value;
        if (this.activeTableName) {
            this.activeTableName.textContent = tableName;
        }

        if (this.liveMode) {
            this.fetchLiveTable(tableName);
        } else {
            this.loadMockTable(tableName, state);
        }
    }

    async fetchLiveTable(tableName) {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/v1/db/table?tableName=${tableName}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.renderTable(data);
        } catch (error) {
            console.error("Failed to fetch database table: ", error);
            this.showError(`Connection to PostgreSQL failed. Ensure the Spring Boot backend and Postgres DB are running.\nError: ${error.message}`);
        }
    }

    loadMockTable(tableName, state) {
        // Fallback mock seeds matching schema.sql
        let mockData = [];
        
        if (tableName === "users") {
            mockData = [
                { id: 1, name: "Alice DevOps", email: "alice@nebula.io", role: "admin" },
                { id: 2, name: "Bob Developer", email: "bob@nebula.io", role: "developer" },
                { id: 3, name: "Charlie SRE", email: "charlie@nebula.io", role: "devops" }
            ];
        } else if (tableName === "clusters") {
            mockData = [
                { id: 1, cluster_name: "EKS-PROD-US-EAST", region: "us-east-1", status: "active" },
                { id: 2, cluster_name: "EKS-STAGE-US-WEST", region: "us-west-2", status: "active" },
                { id: 3, cluster_name: "EKS-DEV-LOCAL", region: "us-east-1", status: "active" }
            ];
        } else if (tableName === "nodes") {
            mockData = [
                { id: 1, cluster_id: 1, node_name: "ip-10-0-1-12.ec2.internal", cpu_usage: 34, memory_usage: 45 },
                { id: 2, cluster_id: 1, node_name: "ip-10-0-2-45.ec2.internal", cpu_usage: 52, memory_usage: 60 },
                { id: 3, cluster_id: 1, node_name: "ip-10-0-3-98.ec2.internal", cpu_usage: 25, memory_usage: 35 },
                { id: 4, cluster_id: 1, node_name: "ip-10-0-4-101.ec2.internal", cpu_usage: 48, memory_usage: 68 },
                { id: 5, cluster_id: 2, node_name: "ip-172-16-1-10.ec2.internal", cpu_usage: 15, memory_usage: 28 },
                { id: 6, cluster_id: 2, node_name: "ip-172-16-2-22.ec2.internal", cpu_usage: 24, memory_usage: 32 },
                { id: 7, cluster_id: 3, node_name: "minikube-virtualbox", cpu_usage: 18, memory_usage: 40 }
            ];
        } else if (tableName === "pods") {
            mockData = [];
            // Dynamically build from twin simulated state if available, otherwise static seed
            if (state && state.nodes) {
                let id = 1;
                state.nodes.forEach((node, nIdx) => {
                    node.pods.forEach(p => {
                        mockData.push({
                            id: id++,
                            node_id: nIdx + 1,
                            pod_name: p.pod_name,
                            status: p.status,
                            cpu: p.cpu,
                            memory: p.memory,
                            restarts: p.restarts || 0,
                            service: p.service || "service"
                        });
                    });
                });
            } else {
                mockData = [
                    { id: 1, node_id: 1, pod_name: "frontend-pod-1", status: "running", cpu: 12, memory: 180, restarts: 0, service: "frontend" },
                    { id: 2, node_id: 1, pod_name: "frontend-pod-2", status: "running", cpu: 15, memory: 195, restarts: 0, service: "frontend" },
                    { id: 3, node_id: 1, pod_name: "api-gateway-pod-1", status: "running", cpu: 8, memory: 120, restarts: 0, service: "gateway" },
                    { id: 4, node_id: 2, pod_name: "order-service-pod-1", status: "running", cpu: 32, memory: 290, restarts: 0, service: "order-service" },
                    { id: 5, node_id: 2, pod_name: "payment-service-pod-1", status: "running", cpu: 18, memory: 210, restarts: 0, service: "payment-service" },
                    { id: 6, node_id: 4, pod_name: "postgresql-db-pod-1", status: "running", cpu: 35, memory: 410, restarts: 0, service: "postgresql" }
                ];
            }
        } else if (tableName === "deployments") {
            mockData = [
                { id: 1, version: "v1.0", timestamp: "2026-06-23 10:00:00", status: "success", description: "Initial cluster configuration provisioning." },
                { id: 2, version: "v1.1", timestamp: "2026-06-23 12:00:00", status: "failed", description: "Deploy v1.1: Failed unit tests in order-service. Rolled back." },
                { id: 3, version: "v1.2", timestamp: "2026-06-23 14:00:00", status: "success", description: "Deploy v1.2: Added hot-cache layer for inventory queries." },
                { id: 4, version: "v1.3", timestamp: "2026-06-23 17:00:00", status: "success", description: "Deploy v1.3: Upgraded payment-service endpoints." }
            ];
        } else if (tableName === "alerts") {
            mockData = [
                { id: 1, severity: "CRITICAL", message: "Pod payment-service-pod-1 Out of Memory crash (Status: CrashLoopBackOff)", created_at: "2026-06-23 18:20:00" },
                { id: 2, severity: "WARNING", message: "Core Database Connection Pool limit reached: active_conns=42", created_at: "2026-06-23 18:30:00" }
            ];
        }
        
        this.renderTable(mockData);
    }

    showLoading() {
        const tbody = this.dataTable.querySelector("tbody");
        const theadRow = this.dataTable.querySelector("thead tr");
        if (theadRow) theadRow.innerHTML = "";
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--color-cyan); font-family:var(--font-mono);">
                <span class="status-dot" style="background-color:var(--color-cyan); box-shadow:0 0 6px var(--color-cyan-glow);"></span>
                Executing SELECT query on PostgreSQL...
            </td></tr>`;
        }
        if (this.rowCount) this.rowCount.textContent = "Querying...";
        if (this.emptyMsg) this.emptyMsg.style.display = "none";
    }

    showError(msg) {
        const tbody = this.dataTable.querySelector("tbody");
        const theadRow = this.dataTable.querySelector("thead tr");
        if (theadRow) theadRow.innerHTML = "";
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--color-red); font-family:var(--font-mono); white-space:pre-line;">
                <span class="status-dot danger"></span>
                ${msg}
            </td></tr>`;
        }
        if (this.rowCount) this.rowCount.textContent = "Error";
    }

    renderTable(rows) {
        const theadRow = this.dataTable.querySelector("thead tr");
        const tbody = this.dataTable.querySelector("tbody");
        
        if (!theadRow || !tbody) return;
        
        theadRow.innerHTML = "";
        tbody.innerHTML = "";
        
        if (!rows || rows.length === 0) {
            if (this.rowCount) this.rowCount.textContent = "0 Rows";
            if (this.emptyMsg) this.emptyMsg.style.display = "block";
            return;
        }

        if (this.emptyMsg) this.emptyMsg.style.display = "none";
        if (this.rowCount) this.rowCount.textContent = `${rows.length} Rows Found`;

        // 1. Build headers
        const columns = Object.keys(rows[0]);
        columns.forEach(col => {
            const th = document.createElement("th");
            th.style.padding = "10px 12px";
            th.style.borderBottom = "2px solid rgba(255,255,255,0.08)";
            th.style.color = "var(--color-cyan)";
            th.style.textTransform = "uppercase";
            th.style.fontSize = "0.65rem";
            th.textContent = col;
            theadRow.appendChild(th);
        });

        // 2. Build rows
        rows.forEach((row, rIdx) => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid rgba(255,255,255,0.04)";
            tr.style.background = rIdx % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.1)";
            
            // Mouse hover highlights
            tr.addEventListener("mouseenter", () => {
                tr.style.background = "rgba(0, 210, 255, 0.04)";
            });
            tr.addEventListener("mouseleave", () => {
                tr.style.background = rIdx % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.1)";
            });

            columns.forEach(col => {
                const td = document.createElement("td");
                td.style.padding = "8px 12px";
                td.style.wordBreak = "break-all";
                
                const val = row[col];
                if (val === null || val === undefined) {
                    td.innerHTML = `<span style="color:var(--text-muted); font-style:italic;">NULL</span>`;
                } else if (col.toLowerCase() === "status") {
                    const statusStr = String(val).toUpperCase();
                    let color = "var(--text-primary)";
                    if (statusStr === "RUNNING" || statusStr === "ACTIVE" || statusStr === "SUCCESS") color = "var(--color-green)";
                    else if (statusStr === "FAILED" || statusStr === "CRASH") color = "var(--color-red)";
                    else if (statusStr === "PENDING" || statusStr === "WARNING") color = "var(--color-yellow)";
                    
                    td.innerHTML = `<span style="color:${color}; font-weight:700;">${statusStr}</span>`;
                } else if (col.toLowerCase() === "severity") {
                    const sevStr = String(val).toUpperCase();
                    let color = "var(--color-green)";
                    if (sevStr === "CRITICAL") color = "var(--color-red)";
                    else if (sevStr === "WARNING") color = "var(--color-yellow)";
                    else if (sevStr === "INFO") color = "var(--color-cyan)";
                    
                    td.innerHTML = `<span style="color:${color}; font-weight:700;">${sevStr}</span>`;
                } else {
                    td.textContent = String(val);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }
}
