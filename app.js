// Cloud Environment Digital Twin - Main Simulation Controller
import { InfraMapVisualizer } from './modules/inframap.js';
import { DependencyGraphVisualizer } from './modules/dependency.js';
import { ResourceHeatmap } from './modules/heatmap.js';
import { AIFailurePredictor } from './modules/prediction.js';
import { PipelineSimulator } from './modules/pipeline.js';
import { TerraformSimulator } from './modules/terraform.js';
import { LogsManager } from './modules/logs.js';
import { AlertsManager } from './modules/alerts.js';
import { DatabaseExplorer } from './modules/database.js';

// Configuration: Remote deployed Spring Boot REST API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:8080"
    : "https://nebula-twin-production.up.railway.app"; // User's generated public backend endpoint

class DigitalTwinApp {
    constructor() {
        this.activeTab = "inframap";
        this.simulationRunning = true;
        this.autoHealingEnabled = true;
        this.slackEnabled = true;
        this.currentRole = "admin";
        this.liveApiMode = false;
        this.activePodFailureName = null;
        
        // Mock data state for different clusters
        this.clusters = {
            prod: {
                cluster_name: "EKS-PROD-US-EAST",
                region: "us-east-1",
                nodes: [
                    {
                        node_name: "ip-10-0-1-12.ec2.internal",
                        disk_usage: 48,
                        pods: [
                            { pod_name: "frontend-pod-1", status: "running", cpu: 12, memory: 180, restarts: 0, service: "frontend" },
                            { pod_name: "frontend-pod-2", status: "running", cpu: 15, memory: 195, restarts: 0, service: "frontend" },
                            { pod_name: "api-gateway-pod-1", status: "running", cpu: 8, memory: 120, restarts: 0, service: "gateway" },
                            { pod_name: "user-service-pod-1", status: "running", cpu: 22, memory: 240, restarts: 0, service: "user-service" }
                        ]
                    },
                    {
                        node_name: "ip-10-0-2-45.ec2.internal",
                        disk_usage: 56,
                        pods: [
                            { pod_name: "order-service-pod-1", status: "running", cpu: 32, memory: 290, restarts: 0, service: "order-service" },
                            { pod_name: "order-service-pod-2", status: "running", cpu: 28, memory: 280, restarts: 0, service: "order-service" },
                            { pod_name: "payment-service-pod-1", status: "running", cpu: 18, memory: 210, restarts: 0, service: "payment-service" }
                        ]
                    },
                    {
                        node_name: "ip-10-0-3-98.ec2.internal",
                        disk_usage: 41,
                        pods: [
                            { pod_name: "notification-service-pod-1", status: "running", cpu: 10, memory: 140, restarts: 0, service: "notification-service" },
                            { pod_name: "notification-service-pod-2", status: "running", cpu: 14, memory: 155, restarts: 0, service: "notification-service" },
                            { pod_name: "redis-cache-pod-1", status: "running", cpu: 5, memory: 85, restarts: 0, service: "redis" }
                        ]
                    },
                    {
                        node_name: "ip-10-0-4-101.ec2.internal",
                        disk_usage: 62,
                        pods: [
                            { pod_name: "postgresql-db-pod-1", status: "running", cpu: 35, memory: 410, restarts: 0, service: "postgresql" }
                        ]
                    }
                ],
                database: { name: "aurora-pg-cluster-prod" }
            },
            staging: {
                cluster_name: "EKS-STAGE-US-WEST",
                region: "us-west-2",
                nodes: [
                    {
                        node_name: "ip-172-16-1-10.ec2.internal",
                        disk_usage: 32,
                        pods: [
                            { pod_name: "frontend-pod-stage-1", status: "running", cpu: 8, memory: 160, restarts: 0, service: "frontend" },
                            { pod_name: "api-gateway-pod-stage-1", status: "running", cpu: 5, memory: 110, restarts: 0, service: "gateway" },
                            { pod_name: "user-service-pod-stage-1", status: "running", cpu: 14, memory: 220, restarts: 0, service: "user-service" }
                        ]
                    },
                    {
                        node_name: "ip-172-16-2-22.ec2.internal",
                        disk_usage: 38,
                        pods: [
                            { pod_name: "order-service-pod-stage-1", status: "running", cpu: 18, memory: 260, restarts: 0, service: "order-service" },
                            { pod_name: "payment-service-pod-stage-1", status: "running", cpu: 12, memory: 190, restarts: 0, service: "payment-service" },
                            { pod_name: "postgresql-db-pod-stage-1", status: "running", cpu: 20, memory: 340, restarts: 0, service: "postgresql" }
                        ]
                    }
                ],
                database: { name: "aurora-pg-cluster-stage" }
            },
            dev: {
                cluster_name: "EKS-DEV-LOCAL",
                region: "us-east-1",
                nodes: [
                    {
                        node_name: "minikube-virtualbox",
                        disk_usage: 74,
                        pods: [
                            { pod_name: "frontend-pod-dev-1", status: "running", cpu: 10, memory: 170, restarts: 0, service: "frontend" },
                            { pod_name: "api-gateway-pod-dev-1", status: "running", cpu: 7, memory: 115, restarts: 0, service: "gateway" },
                            { pod_name: "user-service-pod-dev-1", status: "running", cpu: 12, memory: 200, restarts: 0, service: "user-service" },
                            { pod_name: "order-service-pod-dev-1", status: "running", cpu: 15, memory: 240, restarts: 0, service: "order-service" },
                            { pod_name: "postgresql-db-pod-dev-1", status: "running", cpu: 18, memory: 310, restarts: 0, service: "postgresql" }
                        ]
                    }
                ],
                database: { name: "local-pg-docker" }
            }
        };

        // Active State points to Prod by default
        this.activeClusterKey = "prod";
        this.state = this.clusters[this.activeClusterKey];

        // Telemetry History for AI forecasting (PodName -> { cpu: [], memory: [] })
        this.telemetryHistory = {};
        this.initializeTelemetryHistory();

        // Pod Failures Ramping queues (PodName -> stepsRemainingToCrash)
        this.failQueue = new Map();

        // Self-Healing Restart Schedules (PodName -> timeoutId)
        this.restartSchedule = new Map();

        // Instantiate Visual Modules
        this.infraMap = new InfraMapVisualizer("#infra-svg", "infra-inspector-content");
        this.depGraph = new DependencyGraphVisualizer("#dependency-svg", "dependency-inspector-content");
        this.heatmap = new ResourceHeatmap("cpu-heatmap-grid", "memory-heatmap-grid", "disk-heatmap-grid");
        this.aiPredictor = new AIFailurePredictor("telemetry-canvas", "ai-pod-select", "ai-predictions-list", "ai-reasoning-log", "ai-confidence");
        this.pipeline = new PipelineSimulator("pipeline-console", "deployment-timeline");
        this.terraform = new TerraformSimulator("tf-console", "tf-plan-btn", "tf-apply-btn");
        this.logs = new LogsManager("log-terminal-stream", "log-service-filter", "log-severity-filter", "log-search-query", "log-clear-btn");
        this.alerts = new AlertsManager("slack-messages-container", "metric-alerts");
        this.databaseExplorer = new DatabaseExplorer("db-table-select", "db-refresh-btn", "db-active-table", "db-row-count", "db-data-table", "db-empty-msg");
        this.databaseExplorer.setApiBaseUrl(API_BASE_URL);

        this.init();
    }

    initializeTelemetryHistory() {
        // Build empty arrays with 15 initial points
        Object.keys(this.clusters).forEach(cKey => {
            this.clusters[cKey].nodes.forEach(node => {
                node.pods.forEach(pod => {
                    this.telemetryHistory[pod.pod_name] = {
                        cpu: Array.from({ length: 15 }, () => Math.max(5, Math.floor(pod.cpu + (Math.random() - 0.5) * 6))),
                        memory: Array.from({ length: 15 }, () => Math.max(50, Math.floor(pod.memory + (Math.random() - 0.5) * 30)))
                    };
                });
            });
        });
    }

    init() {
        this.logs.prefillLogs();
        this.setupAppListeners();
        
        // Start simulation tick loop (every 1.5 seconds)
        this.tickInterval = setInterval(() => {
            if (this.simulationRunning) {
                this.tick();
            }
        }, 1500);

        // First render
        this.renderAll();
    }

    setupAppListeners() {
        // Tab switching
        document.querySelectorAll(".menu-link").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const tab = link.getAttribute("data-tab");
                this.switchTab(tab);
            });
        });

        // Role Select
        const roleSel = document.getElementById("rbac-role-select");
        if (roleSel) {
            roleSel.value = this.currentRole;
            roleSel.addEventListener("change", (e) => {
                this.currentRole = e.target.value;
                this.logs.pushLog("kube-system", "INFO", `RBAC Role identity changed to: ${this.currentRole.toUpperCase()}`);
                
                // Disable/Enable buttons depending on role
                this.updateRolePermissions();
            });
        }

        // Cluster Selector
        const clusterSel = document.getElementById("cluster-context-select");
        if (clusterSel) {
            clusterSel.value = this.activeClusterKey;
            clusterSel.addEventListener("change", (e) => {
                const prevCluster = this.state.cluster_name;
                this.activeClusterKey = e.target.value;
                this.state = this.clusters[this.activeClusterKey];
                
                // Reset inspectors
                document.getElementById("infra-inspector-content").innerHTML = "<p>Select a node or pod in the environment map to inspect its details.</p>";
                document.getElementById("dependency-inspector-content").innerHTML = "<p>Click a microservice node in the graph to view downstream dependencies.</p>";

                // Logs cluster context change
                this.logs.pushLog("kube-system", "INFO", `Kube-context changed from ${prevCluster} to ${this.state.cluster_name}`);
                this.alerts.resolveAlert(this.activePodFailureName); // Reset active alert tracking

                // Populate AI dropdown for the new cluster context
                this.aiPredictor.populateSelect(this.state);

                this.renderAll();
            });
        }

        // Toggles
        const healToggle = document.getElementById("auto-healing-toggle");
        if (healToggle) {
            healToggle.checked = this.autoHealingEnabled;
            healToggle.addEventListener("change", (e) => {
                this.autoHealingEnabled = e.target.checked;
                this.logs.pushLog("kube-system", "INFO", `Configuration: Auto-Healing trigger status set to ${this.autoHealingEnabled}`);
            });
        }

        const slackToggle = document.getElementById("slack-toggle");
        if (slackToggle) {
            slackToggle.checked = this.slackEnabled;
            slackToggle.addEventListener("change", (e) => {
                this.slackEnabled = e.target.checked;
                this.alerts.setSlackEnabled(this.slackEnabled);
            });
        }

        const apiToggle = document.getElementById("live-api-toggle");
        if (apiToggle) {
            apiToggle.checked = this.liveApiMode;
            apiToggle.addEventListener("change", (e) => {
                this.liveApiMode = e.target.checked;
                this.logs.pushLog("kube-system", "INFO", `Observability Source: Switch to ${this.liveApiMode ? 'Live EKS API' : 'Digital Twin Simulation'}`);
                this.databaseExplorer.setLiveMode(this.liveApiMode);
                this.databaseExplorer.loadActiveTable(this.state);
            });
        }

        // Tick loop control
        const simToggleBtn = document.getElementById("sim-toggle-btn");
        if (simToggleBtn) {
            simToggleBtn.addEventListener("click", () => {
                this.simulationRunning = !this.simulationRunning;
                if (this.simulationRunning) {
                    simToggleBtn.textContent = "Running";
                    simToggleBtn.classList.add("active");
                } else {
                    simToggleBtn.textContent = "Paused";
                    simToggleBtn.classList.remove("active");
                }
            });
        }

        // Inject Random Fault button
        const injectBtn = document.getElementById("inject-fault-btn");
        if (injectBtn) {
            injectBtn.addEventListener("click", () => {
                this.injectRandomFault();
            });
        }

        // Trigger CI/CD deploy button
        const deployBtn = document.getElementById("trigger-deploy-btn");
        if (deployBtn) {
            deployBtn.addEventListener("click", () => {
                this.pipeline.triggerBuild((version) => {
                    // Pipeline complete callback: update pods version
                    this.logs.pushLog("kube-system", "INFO", `Rolling upgrade rollout successful. Pods upgraded to release ${version}`);
                    
                    // Trigger Slack deploy success webhook
                    this.alerts.triggerAlert("INFO", "pipeline", "Jenkins CI/CD", this.state.cluster_name, `Deployment succeeded: version ${version} rolled out to cluster`);
                }, this.currentRole);
            });
        }

        // Custom window events triggered by sub-modules
        window.addEventListener("manual-pod-restart", (e) => {
            const { podName } = e.detail;
            this.logs.pushLog("kube-system", "INFO", `Manual restart requested for pod ${podName}`);
            this.restartPod(podName, true);
        });

        window.addEventListener("manual-service-restart", (e) => {
            const { serviceId } = e.detail;
            this.logs.pushLog("kube-system", "INFO", `Manual service restart requested for ${serviceId}`);
            this.restartService(serviceId);
        });

        window.addEventListener("manual-service-kill", (e) => {
            const { serviceId } = e.detail;
            this.logs.pushLog("kube-system", "INFO", `Manual fault injection requested for service ${serviceId}`);
            this.injectServiceFault(serviceId);
        });

        window.addEventListener("terraform-apply-success", () => {
            // Terraform apply completed successfully!
            this.logs.pushLog("kube-system", "INFO", "Terraform provisioned resources active. Syncing EKS worker capacities.");
            // Set header status to healthy
            document.getElementById("cluster-status-dot").className = "status-dot";
        });

        window.addEventListener("manual-inspect-pod", (e) => {
            const { podName, nodeName } = e.detail;
            // Search pod
            let podRaw = null;
            this.state.nodes.forEach(node => {
                if (node.node_name === nodeName) {
                    node.pods.forEach(p => {
                        if (p.pod_name === podName) podRaw = p;
                    });
                }
            });
            if (podRaw) {
                this.infraMap.inspectElement('pod', podRaw, nodeName);
            }
        });

        window.addEventListener("manual-inspect-node", (e) => {
            const { nodeName } = e.detail;
            let nodeRaw = this.state.nodes.find(n => n.node_name === nodeName);
            if (nodeRaw) {
                this.infraMap.inspectElement('node', nodeRaw);
            }
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        
        // Toggle active classes on links
        document.querySelectorAll(".menu-link").forEach(link => {
            if (link.getAttribute("data-tab") === tab) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // Toggle active classes on panes
        document.querySelectorAll(".tab-pane").forEach(pane => {
            if (pane.id === `${tab}-pane`) {
                pane.classList.add("active");
            } else {
                pane.classList.remove("active");
            }
        });

        // Re-render the active tab
        this.renderAll();
    }

    updateRolePermissions() {
        const injectBtn = document.getElementById("inject-fault-btn");
        const deployBtn = document.getElementById("trigger-deploy-btn");
        const planBtn = document.getElementById("tf-plan-btn");
        const applyBtn = document.getElementById("tf-apply-btn");

        if (this.currentRole === "viewer") {
            if (injectBtn) injectBtn.disabled = true;
            if (deployBtn) deployBtn.disabled = true;
            if (planBtn) planBtn.disabled = true;
            if (applyBtn) applyBtn.disabled = true;
        } else if (this.currentRole === "developer") {
            if (injectBtn) injectBtn.disabled = true;
            if (deployBtn) deployBtn.disabled = false;
            if (planBtn) planBtn.disabled = false;
            if (applyBtn) applyBtn.disabled = true; // Can plan but not apply
        } else {
            // Admin or DevOps
            if (injectBtn) injectBtn.disabled = false;
            if (deployBtn) deployBtn.disabled = false;
            if (planBtn) planBtn.disabled = false;
            // Apply is only enabled if Plan was run
            if (applyBtn && this.terraform.planRan) applyBtn.disabled = false;
        }
    }

    tick() {
        if (this.liveApiMode) {
            this.fetchLiveMetrics();
            return;
        }
        // 1. Update pod resource metrics with random walking (fluctuation)
        this.state.nodes.forEach(node => {
            let totalCpu = 0;
            let totalMem = 0;

            node.pods.forEach(pod => {
                // If pod is dead, resources drop to zero
                if (pod.status === "failed") {
                    pod.cpu = 0;
                    pod.memory = 0;
                } else if (pod.status === "pending") {
                    pod.cpu = Math.floor(Math.random() * 5);
                    pod.memory = Math.floor(pod.memory * 0.4); // partially loaded
                } else {
                    // Check if pod is ramping up to fail
                    if (this.failQueue.has(pod.pod_name)) {
                        let steps = this.failQueue.get(pod.pod_name);
                        steps--;
                        
                        if (steps <= 0) {
                            // Out of Memory Crash!
                            pod.status = "failed";
                            pod.cpu = 0;
                            pod.memory = 0;
                            this.failQueue.delete(pod.pod_name);
                            
                            this.logs.pushLog(pod.service, "ERROR", `FATAL: java.lang.OutOfMemoryError: Java heap space. Container crashed.`);
                            this.alerts.triggerAlert("CRITICAL", pod.service, pod.pod_name, this.state.cluster_name, `Pod ${pod.pod_name} has crashed (CrashLoopBackOff)`);
                            
                            // Auto-heal schedule
                            if (this.autoHealingEnabled) {
                                this.scheduleAutoHealing(pod.pod_name);
                            }
                        } else {
                            // Ramp up metrics
                            pod.cpu = Math.min(100, Math.floor(pod.cpu + (98 - pod.cpu) * 0.4));
                            pod.memory = Math.min(512, Math.floor(pod.memory + (512 - pod.memory) * 0.4));
                            
                            this.logs.pushLog(pod.service, "WARN", `Container memory consumption is warning threshold limit: ${Math.floor((pod.memory/512)*100)}% allocated.`);
                            if (steps === 2) {
                                this.logs.pushLog(pod.service, "WARN", `AI Failure Engine warning: Pod ${pod.pod_name} memory utilization slope is critical. High outage probability in next 10s.`);
                            }
                        }
                        this.failQueue.set(pod.pod_name, steps);
                    } else {
                        // Standard healthy walk
                        const baseCpu = this.getBaseResource(pod.pod_name, "cpu");
                        const baseMem = this.getBaseResource(pod.pod_name, "mem");
                        
                        pod.cpu = Math.max(5, Math.min(95, Math.floor(baseCpu + (Math.random() - 0.5) * 8)));
                        pod.memory = Math.max(50, Math.min(480, Math.floor(baseMem + (Math.random() - 0.5) * 15)));

                        // Occasionally log info statements
                        if (Math.random() > 0.85) {
                            this.logs.pushLog(pod.service, "INFO", `HTTP GET /index.html 200 OK - response time ${Math.floor(10 + Math.random()*20)}ms`);
                        }
                    }
                }

                // Update pod history array
                if (!this.telemetryHistory[pod.pod_name]) {
                    this.telemetryHistory[pod.pod_name] = { cpu: [], memory: [] };
                }
                
                const history = this.telemetryHistory[pod.pod_name];
                
                history.cpu.push(pod.cpu);
                if (history.cpu.length > 15) history.cpu.shift();
                
                const percentageMem = Math.floor((pod.memory / 512) * 100);
                history.memory.push(percentageMem);
                if (history.memory.length > 15) history.memory.shift();

                totalCpu += pod.cpu;
                totalMem += percentageMem;
            });

            // Calculate node averages
            const podsCount = node.pods.length || 1;
            node.cpu_usage = Math.floor(totalCpu / podsCount);
            node.memory_usage = Math.floor(totalMem / podsCount);
        });

        // 2. Render all active screens
        this.renderAll();
    }

    async fetchLiveMetrics() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/cluster/status`);
            if (!res.ok) throw new Error(`HTTP status ${res.status}`);
            const data = await res.json();
            
            // Sync state
            this.state.cluster_name = data.cluster_name;
            
            // Map live nodes & pods
            this.state.nodes = data.nodes.map((n, idx) => {
                const nodePods = data.pods.filter(p => p.service === n.node_name || (idx === 0 && (p.service === 'frontend' || p.service === 'gateway' || p.service === 'user-service')) || (idx === 1 && (p.service === 'order-service' || p.service === 'payment-service')));
                return {
                    node_name: n.node_name,
                    disk_usage: n.disk_usage,
                    cpu_usage: n.cpu_usage,
                    memory_usage: n.memory_usage,
                    pods: nodePods.map(p => ({
                        pod_name: p.pod_name,
                        status: p.status,
                        cpu: p.cpu,
                        memory: p.memory,
                        restarts: p.restarts || 0,
                        service: p.service
                    }))
                };
            });
            
            // Update telemetry histories
            data.pods.forEach(p => {
                if (!this.telemetryHistory[p.pod_name]) {
                    this.telemetryHistory[p.pod_name] = { cpu: [], memory: [] };
                }
                const hist = this.telemetryHistory[p.pod_name];
                hist.cpu.push(p.cpu);
                if (hist.cpu.length > 15) hist.cpu.shift();
                hist.memory.push(Math.floor((p.memory/512)*100));
                if (hist.memory.length > 15) hist.memory.shift();
            });

            this.renderAll();
        } catch (err) {
            this.logs.pushLog("kube-system", "ERROR", `API Connection failed: Unable to connect to Spring Boot server on ${API_BASE_URL}. Fallback simulation active.`);
            console.error("Fetch live metrics failed: ", err);
            const apiToggle = document.getElementById("live-api-toggle");
            if (apiToggle) apiToggle.checked = false;
            this.liveApiMode = false;
            this.databaseExplorer.setLiveMode(false);
        }
    }

    getBaseResource(podName, type) {
        if (podName.includes("frontend")) return type === "cpu" ? 12 : 180;
        if (podName.includes("api-gateway")) return type === "cpu" ? 8 : 120;
        if (podName.includes("user-service")) return type === "cpu" ? 20 : 230;
        if (podName.includes("order-service")) return type === "cpu" ? 30 : 280;
        if (podName.includes("payment-service")) return type === "cpu" ? 18 : 205;
        if (podName.includes("notification-service")) return type === "cpu" ? 12 : 145;
        if (podName.includes("postgresql")) return type === "cpu" ? 35 : 400;
        return type === "cpu" ? 15 : 150;
    }

    renderAll() {
        // Update header metrics
        this.updateHeaderMetrics();

        // Render specific tab modules
        if (this.activeTab === "inframap") {
            this.infraMap.render(this.state);
        } else if (this.activeTab === "dependency") {
            this.depGraph.render(this.state);
        } else if (this.activeTab === "heatmap") {
            this.heatmap.render(this.state);
        } else if (this.activeTab === "prediction") {
            this.aiPredictor.render(this.state, this.telemetryHistory);
        } else if (this.activeTab === "pipeline") {
            this.pipeline.renderHistory();
        } else if (this.activeTab === "logs") {
            this.logs.filterAndRender();
        } else if (this.activeTab === "database") {
            this.databaseExplorer.loadActiveTable(this.state);
        }
    }

    updateHeaderMetrics() {
        // Collect totals
        let nodeCount = this.state.nodes.length;
        let podCount = 0;
        let runningPods = 0;
        let sumCpu = 0;
        let sumMem = 0;

        this.state.nodes.forEach(node => {
            podCount += node.pods.length;
            node.pods.forEach(pod => {
                if (pod.status === "running") runningPods++;
                sumCpu += pod.cpu;
                sumMem += Math.floor((pod.memory / 512) * 100);
            });
        });

        const clusterCpu = Math.floor(sumCpu / (podCount || 1));
        const clusterMem = Math.floor(sumMem / (podCount || 1));
        const activeAlertsCount = this.alerts.activeAlerts.size;

        document.getElementById("metric-nodes").textContent = nodeCount;
        document.getElementById("metric-pods").textContent = `${runningPods} / ${podCount}`;
        document.getElementById("metric-cpu").textContent = `${clusterCpu}%`;
        document.getElementById("metric-memory").textContent = `${clusterMem}%`;

        // Update header warning dot
        const headerDot = document.getElementById("cluster-status-dot");
        if (activeAlertsCount > 0) {
            headerDot.className = "status-dot danger";
        } else if (clusterCpu > 70 || clusterMem > 70) {
            headerDot.className = "status-dot warning";
        } else {
            headerDot.className = "status-dot";
        }
    }

    injectRandomFault() {
        if (this.currentRole === "viewer" || this.currentRole === "developer") {
            alert("RBAC Error: Developer and Viewer identity roles do not have credentials to inject cluster faults.");
            return;
        }

        // Find a random running pod that is not database
        const runningPods = [];
        this.state.nodes.forEach(node => {
            node.pods.forEach(pod => {
                if (pod.status === "running" && !pod.pod_name.includes("postgresql")) {
                    runningPods.push(pod);
                }
            });
        });

        if (runningPods.length === 0) return;

        const targetPod = runningPods[Math.floor(Math.random() * runningPods.length)];
        this.injectPodFault(targetPod.pod_name);
    }

    injectPodFault(podName) {
        if (this.failQueue.has(podName)) return;

        this.logs.pushLog("kube-system", "WARN", `Stress anomaly detected on pod ${podName}. Memory load increasing.`);
        
        // Ramps up over 4 ticks (approx 6 seconds) to simulate AI detection slope
        this.failQueue.set(podName, 4);

        // Instantly switch dropdown to the spiking pod in AI predictor
        const optSelector = document.getElementById("ai-pod-select");
        if (optSelector) {
            optSelector.value = podName;
            optSelector.dispatchEvent(new Event("change"));
        }
    }

    injectServiceFault(serviceId) {
        // Find pod belonging to this service
        let podName = null;
        this.state.nodes.forEach(node => {
            node.pods.forEach(p => {
                if (p.pod_name.includes(serviceId) && p.status === 'running') {
                    podName = p.pod_name;
                }
            });
        });

        if (podName) {
            this.injectPodFault(podName);
        }
    }

    scheduleAutoHealing(podName) {
        if (this.restartSchedule.has(podName)) return;

        this.logs.pushLog("kube-system", "INFO", `Self-Healing: Detected pod ${podName} crash event. Scheduling restart in 6s.`);
        
        const timeout = setTimeout(() => {
            this.restartPod(podName, false);
            this.restartSchedule.delete(podName);
        }, 6000);

        this.restartSchedule.set(podName, timeout);
    }

    async restartPod(podName, manual = false) {
        if (this.liveApiMode) {
            try {
                this.logs.pushLog("kube-system", "INFO", `API: Dispatching delete-pod request to Spring Boot controller...`);
                const res = await fetch(`${API_BASE_URL}/api/v1/pods/restart?podName=${podName}`, { method: 'POST' });
                if (!res.ok) throw new Error("HTTP restart error");
                this.logs.pushLog("kube-system", "SUCCESS", `API: Kubernetes rollout command accepted for ${podName}.`);
            } catch (err) {
                this.logs.pushLog("kube-system", "ERROR", `API: Failed to trigger container restart: ${err.message}`);
            }
            return;
        }

        // Search pod
        let podObj = null;
        let nodeName = "";
        this.state.nodes.forEach(node => {
            node.pods.forEach(p => {
                if (p.pod_name === podName) {
                    podObj = p;
                    nodeName = node.node_name;
                }
            });
        });

        if (!podObj) return;

        // Change status to pending
        podObj.status = "pending";
        this.logs.pushLog("kube-system", "INFO", `Rebooting pod container ${podName}. Current phase: Pending.`);

        setTimeout(() => {
            podObj.status = "running";
            podObj.restarts = (podObj.restarts || 0) + 1;
            
            const baseCpu = this.getBaseResource(podObj.pod_name, "cpu");
            const baseMem = this.getBaseResource(podObj.pod_name, "mem");
            podObj.cpu = baseCpu;
            podObj.memory = baseMem;

            this.logs.pushLog("kube-system", "INFO", `Pod container ${podName} is now Healthy. Health check probes PASSED.`);
            this.alerts.resolveAlert(podName);

            // If we are currently inspecting this pod in inspector, refresh inspector display
            if (this.infraMap.selectedElement && this.infraMap.selectedElement.data.pod_name === podName) {
                this.infraMap.inspectElement('pod', podObj, nodeName);
            }

            this.renderAll();
        }, 3000);

        this.renderAll();
    }

    restartService(serviceId) {
        // Restart all failed pods for this service
        this.state.nodes.forEach(node => {
            node.pods.forEach(p => {
                if (p.pod_name.includes(serviceId)) {
                    // Cancel pending timers if any
                    if (this.restartSchedule.has(p.pod_name)) {
                        clearTimeout(this.restartSchedule.get(p.pod_name));
                        this.restartSchedule.delete(p.pod_name);
                    }
                    this.restartPod(p.pod_name, true);
                }
            });
        });
    }
}

// Instantiate App
window.addEventListener("DOMContentLoaded", () => {
    window.App = new DigitalTwinApp();
});
