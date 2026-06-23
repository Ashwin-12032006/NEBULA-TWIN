// Kubernetes Infrastructure Map Visualizer

export class InfraMapVisualizer {
    constructor(svgId, inspectorId) {
        this.svg = d3.select(svgId);
        this.inspector = document.getElementById(inspectorId);
        this.selectedElement = null;
        this.onSelectCallback = null;
    }

    onSelect(callback) {
        this.onSelectCallback = callback;
    }

    render(state) {
        const svgElement = this.svg.node();
        const width = svgElement.getBoundingClientRect().width || 800;
        const height = svgElement.getBoundingClientRect().height || 500;
        
        // Clear SVG
        this.svg.selectAll("*").remove();

        const nodes = state.nodes || [];
        const db = state.database || {};
        
        // Setup margins and positions
        const padding = 30;
        const nodeWidth = 220;
        const nodeHeight = 160;
        const cols = 2;
        const xSpacing = (width - padding * 2 - nodeWidth * cols) / (cols - 1 || 1);
        const ySpacing = 50;

        // Draw Cluster Title & Info
        this.svg.append("text")
            .attr("x", padding)
            .attr("y", 30)
            .attr("fill", "#00d2ff")
            .attr("font-size", "14px")
            .attr("font-weight", "700")
            .text(`CLUSTER: ${state.cluster_name} (${state.region})`);

        // Render Nodes Grid
        nodes.forEach((node, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = padding + col * (nodeWidth + xSpacing);
            const y = 60 + row * (nodeHeight + ySpacing);

            const isNodeHealthy = node.pods.every(p => p.status === 'running');
            const nodeClass = !isNodeHealthy ? (node.pods.some(p => p.status === 'failed') ? 'node-group failed' : 'node-group warning') : 'node-group';

            // Node group container
            const nodeGroup = this.svg.append("g")
                .attr("class", nodeClass)
                .attr("transform", `translate(${x}, ${y})`)
                .style("cursor", "pointer")
                .on("click", (event) => {
                    event.stopPropagation();
                    this.inspectElement('node', node);
                });

            // Node background rect
            nodeGroup.append("rect")
                .attr("width", nodeWidth)
                .attr("height", nodeHeight)
                .attr("rx", 8);

            // Node label header
            nodeGroup.append("text")
                .attr("x", 12)
                .attr("y", 22)
                .attr("class", "node-title")
                .text(node.node_name);

            // Node stats summary
            nodeGroup.append("text")
                .attr("x", 12)
                .attr("y", 40)
                .attr("fill", "#64748b")
                .attr("font-family", "var(--font-sans)")
                .attr("font-size", "9px")
                .text(`CPU: ${node.cpu_usage}%  |  MEM: ${node.memory_usage}%`);

            // Divider line
            nodeGroup.append("line")
                .attr("x1", 12)
                .attr("y1", 48)
                .attr("x2", nodeWidth - 12)
                .attr("y2", 48)
                .attr("stroke", "rgba(255,255,255,0.06)");

            // Pods placement grid inside node
            const podPadding = 15;
            const podRadius = 6;
            const podCols = 6;
            const podXSpacing = (nodeWidth - podPadding * 2) / (podCols - 1);
            
            node.pods.forEach((pod, pIdx) => {
                const pCol = pIdx % podCols;
                const pRow = Math.floor(pIdx / podCols);
                const px = podPadding + pCol * podXSpacing;
                const py = 70 + pRow * 24;

                let podClass = "pod-circle running";
                if (pod.status === "failed") podClass = "pod-circle failed";
                else if (pod.status === "pending") podClass = "pod-circle pending";

                // Pod container
                const podGroup = nodeGroup.append("g")
                    .attr("transform", `translate(${px}, ${py})`)
                    .on("click", (event) => {
                        event.stopPropagation();
                        this.inspectElement('pod', pod, node.node_name);
                    });

                // Pod circle
                podGroup.append("circle")
                    .attr("class", podClass)
                    .attr("r", podRadius);

                // Small pod label abbreviation (e.g. "fe", "gw", "usr")
                const abbrev = this.getPodAbbreviation(pod.pod_name);
                podGroup.append("text")
                    .attr("y", 14)
                    .attr("class", "pod-label")
                    .text(abbrev);
            });
        });

        // Render Database Node (Slightly separated at the bottom center)
        if (db && db.name) {
            const dbX = width / 2 - 100;
            const dbY = height - 90;

            const dbGroup = this.svg.append("g")
                .attr("class", "node-group")
                .attr("transform", `translate(${dbX}, ${dbY})`)
                .style("cursor", "pointer")
                .on("click", (event) => {
                    event.stopPropagation();
                    this.inspectElement('database', db);
                });

            dbGroup.append("rect")
                .attr("width", 200)
                .attr("height", 60)
                .attr("rx", 8);

            // DB Icon (cylinder representation in SVG)
            dbGroup.append("path")
                .attr("d", "M25,18 C25,22 35,22 35,18 L35,38 C35,42 25,42 25,38 Z M25,23 C25,27 35,27 35,23 M25,28 C25,32 35,32 35,28 M25,33 C25,37 35,37 35,33")
                .attr("stroke", "#00d2ff")
                .attr("stroke-width", "1.5")
                .attr("fill", "none");

            dbGroup.append("text")
                .attr("x", 48)
                .attr("y", 25)
                .attr("class", "node-title")
                .text(db.name);

            dbGroup.append("text")
                .attr("x", 48)
                .attr("y", 40)
                .attr("fill", "#10b981")
                .attr("font-family", "var(--font-sans)")
                .attr("font-size", "10px")
                .attr("font-weight", "600")
                .text(`Status: Online  |  Engine: Aurora Postgres`);
        }
    }

    getPodAbbreviation(podName) {
        if (podName.includes("frontend")) return "fe";
        if (podName.includes("api-gateway")) return "gw";
        if (podName.includes("user-service")) return "usr";
        if (podName.includes("order-service")) return "ord";
        if (podName.includes("payment-service")) return "pay";
        if (podName.includes("notification-service")) return "ntf";
        if (podName.includes("postgresql")) return "pg";
        if (podName.includes("redis")) return "rd";
        return "pod";
    }

    inspectElement(type, data, parentNodeName = "") {
        this.selectedElement = { type, data };
        if (this.onSelectCallback) {
            this.onSelectCallback(type, data);
        }

        let contentHtml = "";

        if (type === 'node') {
            contentHtml = `
                <div class="flex-column gap-md">
                    <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:var(--radius-md); border:1px solid rgba(0,210,255,0.1);">
                        <div style="color:var(--color-cyan); font-weight:700; margin-bottom:4px;">EC2 Worker Node</div>
                        <h4 style="font-family:var(--font-mono); color:white; font-size:0.9rem;">${data.node_name}</h4>
                    </div>
                    <div class="flex-column">
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">OS Image:</span><span>Amazon Linux 2</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Instance Type:</span><span style="font-family:var(--font-mono);">m5.large</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">CPU Cores:</span><span>2 vCPU</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Memory RAM:</span><span>8.0 GiB</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Internal IP:</span><span style="font-family:var(--font-mono);">10.0.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}</span></div>
                    </div>
                    <div>
                        <div class="section-label">Resource Telemetry</div>
                        <div class="flex-column" style="gap:5px; margin-top:5px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                                <span>CPU Usage (${data.cpu_usage}%)</span>
                                <span class="${data.cpu_usage > 85 ? 'text-red' : (data.cpu_usage > 70 ? 'text-yellow' : 'text-green')}">${data.cpu_usage > 85 ? 'HIGH' : 'HEALTHY'}</span>
                            </div>
                            <div class="heatmap-bar-container"><div class="heatmap-bar ${data.cpu_usage > 85 ? 'red' : (data.cpu_usage > 70 ? 'yellow' : 'green')}" style="width:${data.cpu_usage}%"></div></div>
                        </div>
                        <div class="flex-column" style="gap:5px; margin-top:10px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                                <span>Memory Usage (${data.memory_usage}%)</span>
                                <span class="${data.memory_usage > 85 ? 'text-red' : (data.memory_usage > 70 ? 'text-yellow' : 'text-green')}">${data.memory_usage > 85 ? 'HIGH' : 'HEALTHY'}</span>
                            </div>
                            <div class="heatmap-bar-container"><div class="heatmap-bar ${data.memory_usage > 85 ? 'red' : (data.memory_usage > 70 ? 'yellow' : 'green')}" style="width:${data.memory_usage}%"></div></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'pod') {
            const statusColor = data.status === 'running' ? 'var(--color-green)' : (data.status === 'failed' ? 'var(--color-red)' : 'var(--color-yellow)');
            const logsBtnHtml = `<button class="btn btn-primary w-full mt-sm" onclick="document.querySelector('[data-tab=logs]').click(); document.getElementById('log-service-filter').value='${this.getServiceFromPod(data.pod_name)}'; document.getElementById('log-service-filter').dispatchEvent(new Event('change'));">View Container Logs</button>`;
            
            contentHtml = `
                <div class="flex-column gap-md">
                    <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:var(--radius-md); border:1px solid ${statusColor};">
                        <div style="color:${statusColor}; font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                            <span class="status-dot" style="background-color:${statusColor}; box-shadow:0 0 6px ${statusColor};"></span>
                            Kubernetes Pod
                        </div>
                        <h4 style="font-family:var(--font-mono); color:white; font-size:0.8rem; word-break:break-all;">${data.pod_name}</h4>
                    </div>
                    <div class="flex-column">
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Namespace:</span><span style="font-family:var(--font-mono);">production</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Node:</span><span style="font-family:var(--font-mono); font-size:0.7rem;">${parentNodeName}</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Status:</span><span style="color:${statusColor}; font-weight:700; text-transform:uppercase;">${data.status}</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Restarts:</span><span style="font-family:var(--font-mono);">${data.restarts || 0}</span></div>
                    </div>
                    <div>
                        <div class="section-label">Pod Telemetry</div>
                        <div class="flex-column" style="gap:5px; margin-top:5px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                                <span>CPU Usage (${data.cpu}%)</span>
                            </div>
                            <div class="heatmap-bar-container"><div class="heatmap-bar ${data.cpu > 85 ? 'red' : (data.cpu > 70 ? 'yellow' : 'green')}" style="width:${data.cpu}%"></div></div>
                        </div>
                        <div class="flex-column" style="gap:5px; margin-top:10px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                                <span>Memory (${data.memory} MB)</span>
                            </div>
                            <div class="heatmap-bar-container"><div class="heatmap-bar ${data.memory > 450 ? 'red' : (data.memory > 350 ? 'yellow' : 'green')}" style="width:${Math.min((data.memory/512)*100, 100)}%"></div></div>
                        </div>
                    </div>
                    <div style="margin-top:5px;">
                        ${logsBtnHtml}
                        ${data.status === 'failed' ? `<button class="btn btn-green w-full mt-sm" id="btn-manual-restart" data-pod="${data.pod_name}">Restart Failed Pod</button>` : ''}
                    </div>
                </div>
            `;
        } else if (type === 'database') {
            contentHtml = `
                <div class="flex-column gap-md">
                    <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:var(--radius-md); border:1px solid var(--color-cyan);">
                        <div style="color:var(--color-cyan); font-weight:700; margin-bottom:4px;">AWS Aurora RDS Database</div>
                        <h4 style="font-family:var(--font-mono); color:white; font-size:0.9rem;">${data.name}</h4>
                    </div>
                    <div class="flex-column">
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Engine:</span><span>Aurora PostgreSQL 13</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Instance Class:</span><span style="font-family:var(--font-mono);">db.r6g.xlarge</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Replica Count:</span><span>1 Read, 1 Write</span></div>
                        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Connection String:</span><span style="font-family:var(--font-mono); font-size:0.65rem; word-break:break-all;">rds-twin-postgres-db.cluster-c12.us-east-1.rds.amazonaws.com</span></div>
                    </div>
                    <div>
                        <div class="section-label">Database Status</div>
                        <div style="display:flex; align-items:center; gap:8px; color:var(--color-green); margin-top:5px; font-weight:600;">
                            <span class="status-dot"></span>
                            Online (Accepting Connections)
                        </div>
                    </div>
                    <div>
                        <button class="btn w-full mt-sm" onclick="document.querySelector('[data-tab=logs]').click(); document.getElementById('log-service-filter').value='database'; document.getElementById('log-service-filter').dispatchEvent(new Event('change'));">View SQL Event Logs</button>
                    </div>
                </div>
            `;
        }

        this.inspector.innerHTML = contentHtml;
        
        // Add manual listener if pod restart button exists
        const restartBtn = document.getElementById("btn-manual-restart");
        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                const podName = restartBtn.getAttribute("data-pod");
                // Trigger event to restart pod
                const evt = new CustomEvent("manual-pod-restart", { detail: { podName } });
                window.dispatchEvent(evt);
            });
        }
    }

    getServiceFromPod(podName) {
        if (podName.includes("frontend")) return "frontend";
        if (podName.includes("api-gateway")) return "gateway";
        if (podName.includes("user-service")) return "user-service";
        if (podName.includes("order-service")) return "order-service";
        if (podName.includes("payment-service")) return "payment-service";
        if (podName.includes("notification-service")) return "notification-service";
        return "all";
    }
}
