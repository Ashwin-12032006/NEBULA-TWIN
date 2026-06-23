// Resource Heatmaps Renderer

export class ResourceHeatmap {
    constructor(cpuGridId, memoryGridId, diskGridId) {
        this.cpuGrid = document.getElementById(cpuGridId);
        this.memoryGrid = document.getElementById(memoryGridId);
        this.diskGrid = document.getElementById(diskGridId);
    }

    render(state) {
        if (!this.cpuGrid || !this.memoryGrid || !this.diskGrid) return;

        // Clear grids
        this.cpuGrid.innerHTML = "";
        this.memoryGrid.innerHTML = "";
        this.diskGrid.innerHTML = "";

        // Collect all pods and nodes
        const allPods = [];
        const allNodes = [];

        state.nodes.forEach(node => {
            allNodes.push({
                name: node.node_name,
                disk: node.disk_usage || Math.floor(40 + Math.random() * 20),
                cpu: node.cpu_usage,
                memory: node.memory_usage
            });

            node.pods.forEach(pod => {
                allPods.push({
                    name: pod.pod_name,
                    cpu: pod.cpu,
                    memory: pod.memory,
                    status: pod.status,
                    nodeName: node.node_name,
                    raw: pod
                });
            });
        });

        // 1. Render CPU Heatmap (Pods)
        allPods.forEach(pod => {
            const cpuVal = pod.cpu;
            let levelClass = "green";
            if (pod.status === "failed") levelClass = "red";
            else if (cpuVal > 85) levelClass = "red";
            else if (cpuVal > 65) levelClass = "yellow";

            const cell = document.createElement("div");
            cell.className = "heatmap-cell";
            cell.innerHTML = `
                <div class="heatmap-cell-name" title="${pod.name}">${pod.name}</div>
                <div class="heatmap-cell-value ${levelClass}">${pod.status === 'failed' ? 'CRASH' : `${cpuVal}%`}</div>
                <div class="heatmap-bar-container">
                    <div class="heatmap-bar ${levelClass}" style="width: ${pod.status === 'failed' ? 0 : cpuVal}%"></div>
                </div>
            `;
            cell.addEventListener("click", () => {
                this.navigateToPod(pod.raw, pod.nodeName);
            });
            this.cpuGrid.appendChild(cell);
        });

        // 2. Render Memory Heatmap (Pods)
        allPods.forEach(pod => {
            // max size is 512MB in simulation
            const memVal = pod.memory;
            const percentage = Math.min((memVal / 512) * 100, 100);
            
            let levelClass = "green";
            if (pod.status === "failed") levelClass = "red";
            else if (percentage > 85) levelClass = "red";
            else if (percentage > 65) levelClass = "yellow";

            const cell = document.createElement("div");
            cell.className = "heatmap-cell";
            cell.innerHTML = `
                <div class="heatmap-cell-name" title="${pod.name}">${pod.name}</div>
                <div class="heatmap-cell-value ${levelClass}">${pod.status === 'failed' ? 'CRASH' : `${memVal}MB`}</div>
                <div class="heatmap-bar-container">
                    <div class="heatmap-bar ${levelClass}" style="width: ${pod.status === 'failed' ? 0 : percentage}%"></div>
                </div>
            `;
            cell.addEventListener("click", () => {
                this.navigateToPod(pod.raw, pod.nodeName);
            });
            this.memoryGrid.appendChild(cell);
        });

        // 3. Render Storage Heatmap (Nodes)
        allNodes.forEach(node => {
            const diskVal = node.disk;
            let levelClass = "green";
            if (diskVal > 85) levelClass = "red";
            else if (diskVal > 65) levelClass = "yellow";

            const cell = document.createElement("div");
            cell.className = "heatmap-cell";
            cell.innerHTML = `
                <div class="heatmap-cell-name" title="${node.name}">${node.name}</div>
                <div class="heatmap-cell-value ${levelClass}">${diskVal}%</div>
                <div class="heatmap-bar-container">
                    <div class="heatmap-bar ${levelClass}" style="width: ${diskVal}%"></div>
                </div>
            `;
            cell.addEventListener("click", () => {
                // Navigate to node info
                document.querySelector("[data-tab=inframap]").click();
                const event = new CustomEvent("manual-inspect-node", { detail: { nodeName: node.name } });
                window.dispatchEvent(event);
            });
            this.diskGrid.appendChild(cell);
        });
    }

    navigateToPod(podRaw, nodeName) {
        // Click the sidebar tab for Infra Map
        document.querySelector("[data-tab=inframap]").click();
        
        // Trigger global event that inspects pod
        const event = new CustomEvent("manual-inspect-pod", { 
            detail: { 
                podName: podRaw.pod_name,
                nodeName: nodeName
            } 
        });
        window.dispatchEvent(event);
    }
}
