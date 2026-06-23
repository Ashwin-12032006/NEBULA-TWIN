// Jenkins & GitHub Actions CI/CD Pipeline Simulator

export class PipelineSimulator {
    constructor(consoleId, timelineId) {
        this.console = document.getElementById(consoleId);
        this.timeline = document.getElementById(timelineId);
        
        this.buildInProgress = false;
        this.currentVersion = 1.3;
        
        // Define steps
        this.steps = ["git", "test", "build", "ecr", "eks"];
        this.history = [
            { version: "v1.3", time: "16:45", status: "success", desc: "Deploy v1.3: Upgraded payment-service endpoints." },
            { version: "v1.2", time: "14:20", status: "success", desc: "Deploy v1.2: Added hot-cache layer for inventory queries." },
            { version: "v1.1", time: "11:05", status: "failed", desc: "Deploy v1.1: Failed unit tests in order-service. Rolled back." },
            { version: "v1.0", time: "09:00", status: "success", desc: "Deploy v1.0: Initial cluster provisioning." }
        ];

        this.renderHistory();
    }

    logLine(text, type = "") {
        if (!this.console) return;
        const line = document.createElement("div");
        line.className = `terminal-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        line.innerHTML = `<span style="color:#64748b;">[${timestamp}]</span> ${text}`;
        
        this.console.appendChild(line);
        this.console.scrollTop = this.console.scrollHeight;
    }

    renderHistory() {
        if (!this.timeline) return;
        this.timeline.innerHTML = "";
        
        this.history.forEach(h => {
            const item = document.createElement("div");
            item.className = `timeline-item ${h.status}`;
            item.innerHTML = `
                <div class="timeline-time">${h.time}</div>
                <div class="timeline-title">${h.version} - ${h.status.toUpperCase()}</div>
                <div class="timeline-desc">${h.desc}</div>
            `;
            this.timeline.appendChild(item);
        });
    }

    triggerBuild(onCompleteCallback, userRole = "admin") {
        if (this.buildInProgress) return;
        
        // Check RBAC permissions
        if (userRole === "viewer") {
            this.logLine("CRITICAL ERROR: Access Denied. Viewer role does not have deployment privileges.", "error");
            alert("RBAC Error: Viewer identity has read-only access. Switch role to Admin or DevOps Engineer.");
            return;
        }

        this.buildInProgress = true;
        const nextVer = `v${(this.currentVersion + 0.1).toFixed(1)}`;
        this.currentVersion += 0.1;
        
        const deployBtn = document.getElementById("trigger-deploy-btn");
        if (deployBtn) {
            deployBtn.disabled = true;
            deployBtn.textContent = "Build In Progress...";
        }

        // Reset step UI
        this.steps.forEach(s => {
            const node = document.getElementById(`step-${s}`);
            if (node) {
                node.style.opacity = "0.5";
                node.querySelector("div").style.borderColor = "var(--text-muted)";
                node.querySelector("div").style.backgroundColor = "rgba(255,255,255,0.05)";
                node.querySelector("div").style.color = "var(--text-primary)";
            }
        });

        // Set connecting lines reset
        const lines = ["git-test", "test-build", "build-ecr", "ecr-eks"];
        lines.forEach(l => {
            const line = document.getElementById(`line-${l}`);
            if (line) line.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
        });

        this.console.innerHTML = ""; // Clear console
        this.logLine(`Initializing CI/CD Pipeline for Release: ${nextVer}...`, "cmd");

        // Run steps sequentially with setTimeout
        this.runStep(0, nextVer, onCompleteCallback);
    }

    runStep(idx, version, onComplete) {
        if (idx >= this.steps.length) {
            this.buildInProgress = false;
            const deployBtn = document.getElementById("trigger-deploy-btn");
            if (deployBtn) {
                deployBtn.disabled = false;
                deployBtn.textContent = `Trigger Deploy v${(this.currentVersion + 0.1).toFixed(1)}`;
            }

            // Append to history
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            this.history.unshift({
                version: version,
                time: timeStr,
                status: "success",
                desc: `Deploy ${version}: Upgraded services and config mappings.`
            });
            this.renderHistory();
            
            this.logLine(`Pipeline COMPLETED successfully. Cluster image version is now ${version}`, "success");
            
            if (onComplete) {
                onComplete(version);
            }
            return;
        }

        const step = this.steps[idx];
        const node = document.getElementById(`step-${step}`);
        
        if (node) {
            node.style.opacity = "1";
            node.querySelector("div").style.borderColor = "var(--color-cyan)";
            node.querySelector("div").style.backgroundColor = "rgba(0, 210, 255, 0.15)";
            node.querySelector("div").style.color = "var(--color-cyan)";
        }

        // Animate line connection
        if (idx > 0) {
            const lineId = `line-${this.steps[idx-1]}-${step}`;
            const line = document.getElementById(lineId);
            if (line) {
                line.style.backgroundColor = "var(--color-cyan)";
            }
        }

        // Step-specific logs
        let delay = 2000;
        if (step === "git") {
            this.logLine("GitHub: Received payload webhook event 'push'.");
            this.logLine("GitHub Actions: Spawning runner container 'ubuntu-latest'.");
            this.logLine("GitHub Actions: git clone https://github.com/org/nebula-twin.git");
            delay = 1500;
        } else if (step === "test") {
            this.logLine("GitHub Actions: Running node unit tests...");
            this.logLine("GitHub Actions: PASS - test/auth_service.test.js");
            this.logLine("GitHub Actions: PASS - test/payment_validation.test.js");
            this.logLine("GitHub Actions: Running SonarQube quality analysis gate... PASSED (Code Coverage: 92.4%)");
            delay = 2500;
        } else if (step === "build") {
            this.logLine("Jenkins: Build job #145 triggered on agent 'eks-worker-node-1'.");
            this.logLine("Jenkins: execute: docker build -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/payment-service:latest .");
            this.logLine("Jenkins: Docker daemon: Sending build context to Docker daemon.");
            this.logLine("Jenkins: Step 1/5 : FROM node:16-alpine ... OK");
            this.logLine("Jenkins: Step 5/5 : CMD ['npm', 'start'] ... OK");
            this.logLine("Jenkins: Docker image created successfully. ID: e9f82163ac");
            delay = 2800;
        } else if (step === "ecr") {
            this.logLine("AWS CLI: aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin");
            this.logLine("AWS CLI: Login Succeeded.");
            this.logLine("Docker: Pushing image layers to ECR Registry...");
            this.logLine("Docker: Layer 1a3b8c: Pushed");
            this.logLine("Docker: Layer 9f23e2: Pushed");
            this.logLine("AWS ECR: Image payment-service:latest registered successfully.");
            delay = 1800;
        } else if (step === "eks") {
            this.logLine("Kubernetes: kubectl set image deployment/payment-service payment-service=.../payment-service:v1.4");
            this.logLine("Kubernetes: Deployment 'payment-service' image updated.");
            this.logLine("Kubernetes: Rolling rollout started. Spawning replica pod payment-service-v14-xyz...");
            this.logLine("Kubernetes: Pod status: pending -> running.");
            this.logLine("Kubernetes: Health check probes succeeded. Terminating legacy replica pod v1.3.");
            delay = 2500;
        }

        setTimeout(() => {
            this.runStep(idx + 1, version, onComplete);
        }, delay);
    }
}
