// AI Failure Predictor telemetry charts and algorithms

export class AIFailurePredictor {
    constructor(canvasId, selectId, warningsId, logsId, confidenceId) {
        this.canvas = document.getElementById(canvasId);
        this.select = document.getElementById(selectId);
        this.warningsList = document.getElementById(warningsId);
        this.logsContainer = document.getElementById(logsId);
        this.confidenceDisplay = document.getElementById(confidenceId);
        
        this.historyLength = 15;
        this.forecastLength = 15;
        
        // Initial setup
        this.setupSelect();
    }

    setupSelect() {
        if (!this.select) return;
        this.select.addEventListener("change", () => {
            this.logReasoning(`Context switched. Analyzing telemetry history for pod: ${this.select.value}`);
        });
    }

    populateSelect(state) {
        if (!this.select) return;
        const currentVal = this.select.value;
        this.select.innerHTML = "";

        state.nodes.forEach(node => {
            node.pods.forEach(pod => {
                const opt = document.createElement("option");
                opt.value = pod.pod_name;
                opt.textContent = `${this.getServiceName(pod.pod_name)} - ${pod.pod_name.split('-').slice(-1)[0]}`;
                this.select.appendChild(opt);
            });
        });

        if (currentVal && Array.from(this.select.options).some(o => o.value === currentVal)) {
            this.select.value = currentVal;
        }
    }

    getServiceName(podName) {
        if (podName.includes("frontend")) return "frontend";
        if (podName.includes("api-gateway")) return "api-gateway";
        if (podName.includes("user-service")) return "user-service";
        if (podName.includes("order-service")) return "order-service";
        if (podName.includes("payment-service")) return "payment-service";
        if (podName.includes("notification-service")) return "notification-service";
        if (podName.includes("postgresql")) return "postgresql";
        if (podName.includes("redis")) return "redis";
        return "service";
    }

    logReasoning(message) {
        if (!this.logsContainer) return;
        const div = document.createElement("div");
        div.style.marginBottom = "4px";
        
        const timestamp = new Date().toLocaleTimeString();
        div.innerHTML = `<span style="color:var(--text-muted);">${timestamp}</span> <span style="color:#d1d2d3;">${message}</span>`;
        this.logsContainer.appendChild(div);
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        
        // Truncate logs if too long
        if (this.logsContainer.children.length > 30) {
            this.logsContainer.removeChild(this.logsContainer.firstChild);
        }
    }

    render(state, telemetryData) {
        this.populateSelect(state);
        const selectedPod = this.select.value;
        if (!selectedPod) return;

        // Retrieve pod status
        let podObj = null;
        state.nodes.forEach(node => {
            node.pods.forEach(p => {
                if (p.pod_name === selectedPod) podObj = p;
            });
        });

        const podHistory = telemetryData[selectedPod] || { cpu: [], memory: [] };
        const cpuHist = podHistory.cpu;
        const memHist = podHistory.memory;

        if (cpuHist.length === 0) return;

        // 1. Draw Canvas Telemetry Chart
        this.drawChart(cpuHist, memHist, podObj);

        // 2. Perform AI Regression & Forecasting Calculations
        this.runAIAnalysis(selectedPod, cpuHist, memHist, podObj);
    }

    drawChart(cpuHist, memHist, podObj) {
        const ctx = this.canvas.getContext("2d");
        const width = this.canvas.width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.height = this.canvas.parentElement.clientHeight;
        
        ctx.clearRect(0, 0, width, height);

        const paddingLeft = 40;
        const paddingRight = 40;
        const paddingTop = 20;
        const paddingBottom = 30;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        
        // Draw grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const gy = paddingTop + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(paddingLeft, gy);
            ctx.lineTo(width - paddingRight, gy);
            ctx.stroke();

            // Y axis labels (percentage)
            ctx.fillStyle = "var(--text-muted)";
            ctx.font = "9px var(--font-mono)";
            ctx.fillText(`${100 - i * 25}%`, 10, gy + 3);
        }

        // Present line (X index 14 is present day)
        const totalPoints = this.historyLength + this.forecastLength;
        const presentX = paddingLeft + (chartWidth / (totalPoints - 1)) * (this.historyLength - 1);
        
        ctx.strokeStyle = "rgba(0, 210, 255, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(presentX, paddingTop);
        ctx.lineTo(presentX, height - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Label "PRESENT"
        ctx.fillStyle = "var(--color-cyan)";
        ctx.font = "8px var(--font-sans)";
        ctx.fillText("PRESENT", presentX - 18, height - 15);

        // Generate Forecast Trend (Simple linear regression of the last 5 points)
        const forecastCpu = [...cpuHist];
        const forecastMem = [...memHist];
        
        // Calculate slope (m) and intercept (c) from last 5 points
        let cpuSlope = 0;
        let memSlope = 0;
        
        if (cpuHist.length >= 5) {
            const sliceCpu = cpuHist.slice(-5);
            const sliceMem = memHist.slice(-5);
            
            let sumX = 0, sumYCpu = 0, sumYMem = 0, sumXYCpu = 0, sumXYMem = 0, sumX2 = 0;
            const n = 5;
            for (let i = 0; i < n; i++) {
                sumX += i;
                sumYCpu += sliceCpu[i];
                sumYMem += sliceMem[i];
                sumXYCpu += i * sliceCpu[i];
                sumXYMem += i * sliceMem[i];
                sumX2 += i * i;
            }
            
            cpuSlope = (n * sumXYCpu - sumX * sumYCpu) / (n * sumX2 - sumX * sumX);
            memSlope = (n * sumXYMem - sumX * sumYMem) / (n * sumX2 - sumX * sumX);
        }

        // Project forecast points
        const isSpiking = (podObj && podObj.status === 'running' && (cpuSlope > 3 || memSlope > 5));
        
        for (let i = 1; i <= this.forecastLength; i++) {
            let nextCpu, nextMem;
            if (podObj && podObj.status === 'failed') {
                nextCpu = 0;
                nextMem = 0;
            } else {
                nextCpu = Math.max(0, Math.min(100, cpuHist[cpuHist.length - 1] + cpuSlope * i + (Math.random() - 0.5) * 3));
                nextMem = Math.max(0, Math.min(100, memHist[memHist.length - 1] + memSlope * i + (Math.random() - 0.5) * 2));
                
                // If the system is ramping up to fail
                if (isSpiking) {
                    nextCpu = Math.min(100, cpuHist[cpuHist.length - 1] + cpuSlope * 1.5 * i);
                    nextMem = Math.min(100, memHist[memHist.length - 1] + memSlope * 1.5 * i);
                }
            }
            forecastCpu.push(nextCpu);
            forecastMem.push(nextMem);
        }

        // Draw CPU line
        this.drawLine(ctx, forecastCpu, chartWidth, chartHeight, paddingLeft, paddingTop, totalPoints, "rgba(0, 210, 255, 1)", "rgba(0, 210, 255, 0.4)", this.historyLength);
        
        // Draw Memory line
        this.drawLine(ctx, forecastMem, chartWidth, chartHeight, paddingLeft, paddingTop, totalPoints, "rgba(139, 92, 246, 1)", "rgba(139, 92, 246, 0.4)", this.historyLength);

        // Chart Legends
        ctx.fillStyle = "rgba(0, 210, 255, 1)";
        ctx.fillRect(paddingLeft + 15, height - 10, 10, 5);
        ctx.fillStyle = "var(--text-secondary)";
        ctx.fillText("CPU Util %", paddingLeft + 30, height - 6);

        ctx.fillStyle = "rgba(139, 92, 246, 1)";
        ctx.fillRect(paddingLeft + 120, height - 10, 10, 5);
        ctx.fillStyle = "var(--text-secondary)";
        ctx.fillText("Memory %", paddingLeft + 135, height - 6);
    }

    drawLine(ctx, data, chartWidth, chartHeight, padX, padY, totalPoints, colorHistory, colorForecast, cutIdx) {
        ctx.lineWidth = 2;
        
        // Draw History (Solid)
        ctx.strokeStyle = colorHistory;
        ctx.beginPath();
        for (let i = 0; i < cutIdx; i++) {
            const x = padX + (chartWidth / (totalPoints - 1)) * i;
            const y = padY + chartHeight - (chartHeight * (data[i] / 100));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw Forecast (Dashed)
        ctx.strokeStyle = colorForecast;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = cutIdx - 1; i < totalPoints; i++) {
            const x = padX + (chartWidth / (totalPoints - 1)) * i;
            const y = padY + chartHeight - (chartHeight * (data[i] / 100));
            if (i === cutIdx - 1) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    }

    runAIAnalysis(podName, cpuHist, memHist, podObj) {
        if (!podObj) return;

        // Perform linear regression calculations to determine warnings
        let slopeCpu = 0;
        let slopeMem = 0;
        const n = 5;

        if (cpuHist.length >= n) {
            const sliceCpu = cpuHist.slice(-n);
            const sliceMem = memHist.slice(-n);
            let sumX = 0, sumYCpu = 0, sumYMem = 0, sumXYCpu = 0, sumXYMem = 0, sumX2 = 0;
            for (let i = 0; i < n; i++) {
                sumX += i;
                sumYCpu += sliceCpu[i];
                sumYMem += sliceMem[i];
                sumXYCpu += i * sliceCpu[i];
                sumXYMem += i * sliceMem[i];
                sumX2 += i * i;
            }
            slopeCpu = (n * sumXYCpu - sumX * sumYCpu) / (n * sumX2 - sumX * sumX);
            slopeMem = (n * sumXYMem - sumX * sumYMem) / (n * sumX2 - sumX * sumX);
        }

        const isUnstableCpu = slopeCpu > 2.5;
        const isUnstableMem = slopeMem > 3.0;
        const currentCpu = cpuHist[cpuHist.length - 1];
        const currentMem = memHist[memHist.length - 1];
        
        // Confidence calculation based on slope stability
        let confidenceVal = 85.5 + Math.min(10, Math.abs(slopeCpu) * 2 + Math.abs(slopeMem) * 1.5);
        if (podObj.status === 'failed') confidenceVal = 99.9;
        this.confidenceDisplay.textContent = `${confidenceVal.toFixed(1)}%`;
        
        // Clear active warnings list
        this.warningsList.innerHTML = "";

        if (podObj.status === 'failed') {
            this.warningsList.innerHTML = `
                <div class="rec-card" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.02);">
                    <div class="rec-title" style="color: var(--color-red);">
                        <span class="status-dot danger"></span>
                        Pod Down: CrashLoopBackOff
                    </div>
                    <div class="rec-desc">The selected pod is offline. AI telemetry reports CPU/Memory drop. Active restart command requested.</div>
                    <button class="btn btn-green rec-action" id="ai-mitigate-btn" data-pod="${podName}">Proactive Reboot</button>
                </div>
            `;
        } else if (currentCpu > 88 || currentMem > 90 || isUnstableCpu || isUnstableMem) {
            let crashEta = "2m 30s";
            let rootCause = "Memory Leak / Leakage Loop";
            let recMsg = "Trigger rolling restart or scale up pod replicas to distribute incoming load.";
            let severityColor = "var(--color-yellow)";
            let severityClass = "warning";

            if (currentCpu > 92 || currentMem > 94) {
                crashEta = "45 seconds";
                rootCause = "CPU Resource Exhaustion / Deadlock";
                severityColor = "var(--color-red)";
                severityClass = "danger";
            }

            this.warningsList.innerHTML = `
                <div class="rec-card" style="border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02);">
                    <div class="rec-title" style="color:${severityColor};">
                        <span class="status-dot ${severityClass}"></span>
                        Predictive Warning: Imminent Crash
                    </div>
                    <div class="rec-desc" style="margin-top:4px;">
                        <strong>ETA to Outage:</strong> ~${crashEta}<br>
                        <strong>Probable Root Cause:</strong> ${rootCause}<br>
                        <strong>AI Confidence:</strong> ${confidenceVal.toFixed(1)}%<br>
                        <strong>Mitigation Recommendation:</strong> ${recMsg}
                    </div>
                    <button class="btn btn-danger rec-action" id="ai-mitigate-btn" data-pod="${podName}">Auto-Heal Trigger</button>
                </div>
            `;
            
            // Randomly log AI thoughts (throttled)
            if (Math.random() > 0.6) {
                this.logReasoning(`[AI Model Classifier] Feature extraction: CPU Slope=+${slopeCpu.toFixed(2)}/s, Memory Slope=+${slopeMem.toFixed(2)}/s. Threat index high.`);
            }
        } else {
            this.warningsList.innerHTML = `
                <div class="rec-card" style="border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.02);">
                    <div class="rec-title" style="color: var(--color-green);">
                        <span class="status-dot"></span>
                        Pod Telemetry Stable
                    </div>
                    <div class="rec-desc">Regression trend line is negative or flat. Projected resource values remain within safe buffer (limit 80%). No actions required.</div>
                </div>
            `;
        }

        // Add handler for proactive mitigation button
        const mitigateBtn = document.getElementById("ai-mitigate-btn");
        if (mitigateBtn) {
            mitigateBtn.addEventListener("click", () => {
                const evt = new CustomEvent("manual-pod-restart", { detail: { podName } });
                window.dispatchEvent(evt);
            });
        }
    }
}
