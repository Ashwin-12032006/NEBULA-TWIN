// Microservice Service Dependency Graph Visualizer

export class DependencyGraphVisualizer {
    constructor(svgId, inspectorId) {
        this.svg = d3.select(svgId);
        this.inspector = document.getElementById(inspectorId);
        this.selectedService = null;
        this.onActionCallback = null;
    }

    onAction(callback) {
        this.onActionCallback = callback;
    }

    render(state) {
        const svgElement = this.svg.node();
        const width = svgElement.getBoundingClientRect().width || 800;
        const height = svgElement.getBoundingClientRect().height || 500;
        
        // Clear SVG
        this.svg.selectAll("*").remove();

        // Add Marker for Arrows
        const defs = this.svg.append("defs");
        
        defs.append("marker")
            .attr("id", "arrow-normal")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 22)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-4L10,0L0,4")
            .attr("fill", "rgba(0, 210, 255, 0.4)");

        defs.append("marker")
            .attr("id", "arrow-failed")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 22)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-4L10,0L0,4")
            .attr("fill", "var(--color-red)");

        // 1. Define Nodes with fixed coordinates
        const midX = width / 2;
        const nodes = [
            { id: "frontend", name: "Frontend Client", type: "ui", x: midX, y: 50, w: 120, h: 40 },
            { id: "gateway", name: "API Gateway", type: "gateway", x: midX, y: 130, w: 120, h: 40 },
            
            { id: "user-service", name: "User Service", type: "service", x: midX - 220, y: 230, w: 120, h: 45 },
            { id: "order-service", name: "Order Service", type: "service", x: midX - 70, y: 230, w: 120, h: 45 },
            { id: "payment-service", name: "Payment Service", type: "service", x: midX + 80, y: 230, w: 120, h: 45 },
            { id: "notification-service", name: "Notification Service", type: "service", x: midX + 230, y: 230, w: 130, h: 45 },
            
            { id: "redis", name: "Redis Cache", type: "cache", x: midX - 220, y: 350, w: 100, h: 40 },
            { id: "postgresql", name: "PostgreSQL DB", type: "db", x: midX - 70, y: 350, w: 100, h: 40 },
            { id: "kafka", name: "Kafka Broker", type: "broker", x: midX + 150, y: 350, w: 100, h: 40 }
        ];

        // Map Node ID to objects for easy lookup
        const nodeMap = {};
        nodes.forEach(n => { nodeMap[n.id] = n; });

        // 2. Define Links
        const links = [
            { source: "frontend", target: "gateway" },
            { source: "gateway", target: "user-service" },
            { source: "gateway", target: "order-service" },
            { source: "gateway", target: "payment-service" },
            { source: "gateway", target: "notification-service" },
            
            { source: "user-service", target: "postgresql" },
            { source: "order-service", target: "postgresql" },
            { source: "order-service", target: "redis" },
            { source: "payment-service", target: "postgresql" },
            { source: "payment-service", target: "kafka" },
            { source: "notification-service", target: "kafka" }
        ];

        // 3. Sync Service Health Statuses from state
        nodes.forEach(n => {
            n.status = "running";
            n.latency = 12; // ms
            n.errorRate = 0; // %
            
            // Check matching pods in cluster state
            if (n.type === "service" || n.id === "gateway" || n.id === "frontend") {
                const serviceName = n.id;
                let totalPods = 0;
                let failedPods = 0;

                state.nodes.forEach(node => {
                    node.pods.forEach(pod => {
                        if (pod.pod_name.includes(serviceName)) {
                            totalPods++;
                            if (pod.status === "failed") {
                                failedPods++;
                            }
                        }
                    });
                });

                if (totalPods > 0) {
                    if (failedPods === totalPods) {
                        n.status = "failed";
                        n.latency = 0;
                        n.errorRate = 100;
                    } else if (failedPods > 0) {
                        n.status = "warning";
                        n.latency = 240;
                        n.errorRate = 35;
                    } else {
                        // Healthy fluctuation
                        n.status = "running";
                        n.latency = Math.floor(10 + Math.random() * 25);
                        n.errorRate = Math.random() > 0.95 ? 1 : 0;
                    }
                }
            } else if (n.id === "postgresql") {
                n.status = "running";
                n.latency = 4;
            }
        });

        // 4. Render Links
        const linkElements = this.svg.selectAll(".dependency-link")
            .data(links)
            .enter()
            .append("path")
            .attr("class", d => {
                const srcNode = nodeMap[d.source];
                const tgtNode = nodeMap[d.target];
                const isFailed = srcNode.status === "failed" || tgtNode.status === "failed";
                return isFailed ? "dependency-link failed" : "dependency-link active";
            })
            .attr("d", d => {
                const src = nodeMap[d.source];
                const tgt = nodeMap[d.target];
                return this.calculateCurvePath(src, tgt);
            })
            .attr("marker-end", d => {
                const src = nodeMap[d.source];
                const tgt = nodeMap[d.target];
                const isFailed = src.status === "failed" || tgt.status === "failed";
                return isFailed ? "url(#arrow-failed)" : "url(#arrow-normal)";
            });

        // 5. Animate Traffic (Data Packets)
        links.forEach((d, i) => {
            const src = nodeMap[d.source];
            const tgt = nodeMap[d.target];
            if (src.status === "failed") return; // No traffic flows out of dead service

            const isWarning = src.status === "warning" || tgt.status === "failed";
            const packetClass = isWarning ? "data-packet error" : "data-packet";
            const packetDuration = isWarning ? 3500 : 1800; // Slower traffic on errors

            const pathNode = linkElements.nodes()[i];
            
            // Loop data packets along paths
            const animatePacket = () => {
                const packet = this.svg.append("circle")
                    .attr("class", packetClass)
                    .attr("r", 3.5);

                packet.transition()
                    .duration(packetDuration)
                    .ease(d3.easeLinear)
                    .attrTween("transform", () => {
                        return (t) => {
                            const length = pathNode.getTotalLength();
                            const point = pathNode.getPointAtLength(t * length);
                            return `translate(${point.x}, ${point.y})`;
                        };
                    })
                    .remove()
                    .on("end", () => {
                        // Re-trigger loop
                        if (src.status !== "failed" && this.selectedService !== null) {
                            setTimeout(animatePacket, Math.random() * 800);
                        } else {
                            animatePacket();
                        }
                    });
            };

            animatePacket();
        });

        // 6. Render Nodes
        const nodeGroups = this.svg.selectAll(".service-node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", d => `service-node ${d.status}`)
            .attr("transform", d => `translate(${d.x - d.w/2}, ${d.y - d.h/2})`)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                this.inspectService(d, state);
            });

        // Background card
        nodeGroups.append("rect")
            .attr("width", d => d.w)
            .attr("height", d => d.h)
            .attr("rx", 6);

        // Header label
        nodeGroups.append("text")
            .attr("x", d => d.w / 2)
            .attr("y", 18)
            .attr("class", "service-text")
            .text(d => d.name);

        // Subtext metrics
        nodeGroups.append("text")
            .attr("x", d => d.w / 2)
            .attr("y", 32)
            .attr("class", "service-subtext")
            .text(d => {
                if (d.status === "failed") return "Offline (503)";
                if (d.status === "warning") return `${d.latency}ms | ERR: ${d.errorRate}%`;
                if (d.id === "kafka") return "Active Broker";
                if (d.id === "redis") return "Cache Hit: 94%";
                return `${d.latency}ms | ERR: 0%`;
            });
    }

    calculateCurvePath(src, tgt) {
        // Source center point
        const sx = src.x;
        const sy = src.y + src.h/2;
        
        // Target center point
        const tx = tgt.x;
        const ty = tgt.y - tgt.h/2;
        
        // Draw straight line or curve
        const dy = ty - sy;
        const cy = sy + dy / 2;
        
        return `M${sx},${sy} C${sx},${cy} ${tx},${cy} ${tx},${ty}`;
    }

    inspectService(service, state) {
        this.selectedService = service;
        if (this.onActionCallback) {
            this.onActionCallback('inspect', service);
        }

        const isMicro = ["user-service", "order-service", "payment-service", "notification-service", "gateway"].includes(service.id);
        const statusColor = service.status === 'running' ? 'var(--color-green)' : (service.status === 'failed' ? 'var(--color-red)' : 'var(--color-yellow)');
        
        let inspectorHtml = `
            <div class="flex-column gap-md">
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:var(--radius-md); border:1px solid ${statusColor};">
                    <div style="color:${statusColor}; font-weight:700; margin-bottom:4px; text-transform:uppercase; font-size:0.75rem;">
                        ${service.type} component
                    </div>
                    <h4 style="color:white; font-size:0.95rem;">${service.name}</h4>
                </div>
        `;

        if (isMicro) {
            // Find active pods for this microservice
            let matchedPods = [];
            state.nodes.forEach(node => {
                node.pods.forEach(pod => {
                    if (pod.pod_name.includes(service.id)) {
                        matchedPods.push({ ...pod, nodeName: node.node_name });
                    }
                });
            });

            const podsListHtml = matchedPods.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:0.7rem; margin-bottom:4px;">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-grow:1; min-width:0; margin-right:10px;">${p.pod_name}</span>
                    <span style="color:${p.status === 'running' ? 'var(--color-green)' : 'var(--color-red)'}; font-weight:700; flex-shrink:0;">${p.status.toUpperCase()}</span>
                </div>
            `).join('');

            inspectorHtml += `
                <div class="flex-column">
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">Target Path:</span><span style="font-family:var(--font-mono); font-size:0.75rem;">/api/v1/${service.id.split('-')[0]}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">Avg Latency:</span><span style="font-family:var(--font-mono); font-size:0.75rem;">${service.latency} ms</span></div>
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">HTTP Failure rate:</span><span style="font-family:var(--font-mono); font-size:0.75rem; color:${service.errorRate > 0 ? 'var(--color-red)' : 'var(--color-green)'};">${service.errorRate}%</span></div>
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">Throughput:</span><span style="font-family:var(--font-mono); font-size:0.75rem;">${service.status === 'failed' ? '0' : '150-180'} req/sec</span></div>
                </div>
                <div>
                    <div class="section-label">Active Replica Pods (${matchedPods.length})</div>
                    <div style="margin-top:5px; max-height:120px; overflow-y:auto;">
                        ${podsListHtml || '<div class="text-muted">No active replica pods running.</div>'}
                    </div>
                </div>
                <div style="margin-top:10px;">
                    ${service.status === 'failed' ? `
                        <button class="btn btn-green w-full" id="btn-dep-restart" data-service="${service.id}">Trigger Hot-Fix Restart</button>
                    ` : `
                        <button class="btn btn-danger w-full" id="btn-dep-kill" data-service="${service.id}">Inject Outage Fault</button>
                    `}
                </div>
            `;
        } else {
            inspectorHtml += `
                <div class="flex-column">
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">Resource Type:</span><span style="text-transform:capitalize;">${service.type}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">Namespace:</span><span>internal</span></div>
                    <div style="display:flex; justify-content:space-between;"><span class="text-muted">Status:</span><span style="color:var(--color-green); font-weight:700;">Healthy</span></div>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4;">This is a backing datastore/messaging infrastructure node. Resiliency is managed by AWS multi-AZ failovers.</p>
            `;
        }

        inspectorHtml += `</div>`;
        this.inspector.innerHTML = inspectorHtml;

        // Set action triggers
        const restartBtn = document.getElementById("btn-dep-restart");
        const killBtn = document.getElementById("btn-dep-kill");

        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                const sName = restartBtn.getAttribute("data-service");
                const evt = new CustomEvent("manual-service-restart", { detail: { serviceId: sName } });
                window.dispatchEvent(evt);
            });
        }
        if (killBtn) {
            killBtn.addEventListener("click", () => {
                const sName = killBtn.getAttribute("data-service");
                const evt = new CustomEvent("manual-service-kill", { detail: { serviceId: sName } });
                window.dispatchEvent(evt);
            });
        }
    }
}
