// Terraform IaC Console Simulator and D3 Topology Diff Visualizer

export class TerraformSimulator {
    constructor(consoleId, planBtnId, applyBtnId) {
        this.console = document.getElementById(consoleId);
        this.planBtn = document.getElementById(planBtnId);
        this.applyBtn = document.getElementById(applyBtnId);
        
        this.planRan = false;
        this.running = false;
        
        this.setupListeners();
        this.renderDiffMap('init');
    }

    setupListeners() {
        if (!this.planBtn || !this.applyBtn) return;

        this.planBtn.addEventListener("click", () => {
            const role = document.getElementById("rbac-role-select").value;
            this.runPlan(role);
        });

        this.applyBtn.addEventListener("click", () => {
            const role = document.getElementById("rbac-role-select").value;
            this.runApply(role);
        });
    }

    logLine(text, type = "") {
        if (!this.console) return;
        const line = document.createElement("div");
        line.className = `terminal-line ${type}`;
        
        if (type === "cmd") {
            line.innerHTML = `<span style="color:var(--color-purple); font-weight:700;">$</span> ${text}`;
        } else {
            line.innerHTML = text;
        }
        
        this.console.appendChild(line);
        this.console.scrollTop = this.console.scrollHeight;
    }

    runPlan(userRole) {
        if (this.running) return;
        
        // Viewer is blocked from everything
        if (userRole === "viewer") {
            this.logLine("bash: Permission Denied. Viewer identity has read-only access.", "error");
            alert("RBAC Error: Viewer identity is restricted from running infrastructure modifications.");
            return;
        }

        this.running = true;
        this.planBtn.disabled = true;
        this.applyBtn.disabled = true;

        this.console.innerHTML = "";
        this.logLine("terraform plan", "cmd");
        this.logLine("Refreshing Terraform state in-memory...");
        
        this.renderDiffMap('init');

        setTimeout(() => {
            this.logLine("aws_vpc.main: Refreshing state... [id=vpc-09fac10a9c]");
            this.logLine("aws_s3_bucket.logs: Refreshing state... [id=nebula-twin-logstash-storage]");
            this.logLine("aws_security_group.legacy: Refreshing state... [id=sg-05f421a]");
        }, 1000);

        setTimeout(() => {
            this.logLine("<br>An execution plan has been generated and is shown below.", "success");
            this.logLine("Terraform will perform the following actions:");
            this.logLine("  <span style='color:var(--color-green); font-weight:700;'>+</span> create aws_eks_cluster.prod");
            this.logLine("  <span style='color:var(--color-green); font-weight:700;'>+</span> create aws_rds_cluster.postgres");
            this.logLine("  <span style='color:var(--color-yellow); font-weight:700;'>~</span> update aws_s3_bucket.logs (force replacement: false)");
            this.logLine("  <span style='color:var(--color-red); font-weight:700;'>-</span> destroy aws_security_group.legacy");
            this.logLine("<br>Plan: 2 to add, 1 to change, 1 to destroy.");
            
            this.planRan = true;
            this.running = false;
            this.planBtn.disabled = false;
            
            this.renderDiffMap('plan');
            
            // Only Admin or DevOps can apply, Developers can only Plan!
            if (userRole === "admin" || userRole === "devops") {
                this.applyBtn.disabled = false;
            } else {
                this.logLine("<br><span style='color:var(--color-yellow);'>Notice: Developer identity can plan but cannot execute apply. Switch role to Admin/DevOps to run apply.</span>");
            }
        }, 2200);
    }

    runApply(userRole) {
        if (this.running || !this.planRan) return;

        // Double check roles
        if (userRole !== "admin" && userRole !== "devops") {
            this.logLine("bash: Permission Denied. Only Admin or DevOps roles can run apply.", "error");
            alert("RBAC Error: Developer role can only run Terraform plans. Switch role to DevOps/Admin.");
            return;
        }

        this.running = true;
        this.planBtn.disabled = true;
        this.applyBtn.disabled = true;

        this.logLine("terraform apply -auto-approve", "cmd");
        this.logLine("aws_vpc.main: Modifying... [id=vpc-09fac10a9c]");
        this.logLine("aws_s3_bucket.logs: Modifying tags... [id=nebula-twin-logstash-storage]");
        
        this.renderDiffMap('applying', 0); // VPC applying

        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) {
                this.renderDiffMap('applying', 1); // S3 applying
                this.logLine("aws_s3_bucket.logs: Modifications complete after 2s");
                this.logLine("aws_rds_cluster.postgres: Creating...");
            } else if (step === 2) {
                this.renderDiffMap('applying', 2); // RDS applying
                this.logLine("aws_rds_cluster.postgres: Still creating... (5s)");
            } else if (step === 3) {
                this.renderDiffMap('applying', 3); // EKS applying
                this.logLine("aws_rds_cluster.postgres: Creation complete after 8s [id=rds-twin-postgres-db]");
                this.logLine("aws_eks_cluster.prod: Creating...");
            } else if (step === 4) {
                this.logLine("aws_eks_cluster.prod: Still creating... (5s)");
            } else if (step === 5) {
                this.renderDiffMap('applying', 4); // Security group destroying
                this.logLine("aws_security_group.legacy: Destroying... [id=sg-05f421a]");
            } else if (step === 6) {
                this.logLine("aws_security_group.legacy: Destruction complete after 2s");
                this.logLine("aws_eks_cluster.prod: Creation complete after 14s [id=eks-prod-us-east]");
                this.logLine("<br><span style='color:var(--color-green); font-weight:700;'>Apply complete! Resources: 2 added, 1 changed, 1 destroyed.</span>", "success");
                
                this.running = false;
                this.planRan = false;
                this.planBtn.disabled = false;
                this.applyBtn.disabled = true;

                this.renderDiffMap('applied');

                // Dispatch event that terraform completed successfully
                const evt = new CustomEvent("terraform-apply-success");
                window.dispatchEvent(evt);
                
                clearInterval(interval);
            }
        }, 1500);
    }

    renderDiffMap(phase, activeIndex = -1) {
        const svg = d3.select("#tf-vis-svg");
        const placeholder = document.getElementById("tf-vis-placeholder");
        const legend = document.getElementById("tf-vis-legend");
        
        if (!svg.node()) return;
        
        if (phase === 'init') {
            svg.style("display", "none");
            legend.style.display = "none";
            placeholder.style.display = "block";
            return;
        }
        
        svg.style("display", "block");
        legend.style.display = "flex";
        placeholder.style.display = "none";
        
        svg.selectAll("*").remove();
        
        // Define coordinates inside 420x180 viewBox
        const nodes = [
            { id: "vpc", label: "aws_vpc.main", x: 210, y: 25, action: "modify", desc: "update tags" },
            { id: "s3", label: "aws_s3_bucket.logs", x: 75, y: 85, action: "modify", desc: "update tags" },
            { id: "eks", label: "aws_eks_cluster.prod", x: 210, y: 85, action: "add", desc: "create" },
            { id: "rds", label: "aws_rds_cluster.postgres", x: 345, y: 85, action: "add", desc: "create" },
            { id: "sg", label: "aws_security_group.legacy", x: 210, y: 145, action: "destroy", desc: "destroy" }
        ];
        
        const links = [
            { source: "vpc", target: "s3" },
            { source: "vpc", target: "eks" },
            { source: "vpc", target: "rds" },
            { source: "vpc", target: "sg" }
        ];
        
        // Render Links
        svg.selectAll(".tf-link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "tf-link")
            .attr("x1", d => nodes.find(n => n.id === d.source).x)
            .attr("y1", d => nodes.find(n => n.id === d.source).y)
            .attr("x2", d => nodes.find(n => n.id === d.target).x)
            .attr("y2", d => nodes.find(n => n.id === d.target).y)
            .attr("stroke", "rgba(255,255,255,0.08)")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3 3");
            
        // Render Nodes
        const nodeGroups = svg.selectAll(".tf-node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", d => `tf-node ${d.action}`)
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
            
        // Card box dimensions
        const w = 120;
        const h = 34;
        
        nodeGroups.append("rect")
            .attr("x", -w/2)
            .attr("y", -h/2)
            .attr("width", w)
            .attr("height", h)
            .attr("rx", 6)
            .attr("fill", "#090d16")
            .attr("stroke-width", 1.5)
            .attr("stroke", d => {
                if (phase === 'plan') {
                    if (d.action === 'add') return 'var(--color-green)';
                    if (d.action === 'modify') return 'var(--color-yellow)';
                    if (d.action === 'destroy') return 'var(--color-red)';
                } else if (phase === 'applying') {
                    const idx = nodes.indexOf(d);
                    if (idx < activeIndex) return 'var(--color-green)'; // Completed
                    if (idx === activeIndex) return 'var(--color-cyan)'; // Currently applying
                    
                    // Pending
                    if (d.action === 'add') return 'rgba(16, 185, 129, 0.3)';
                    if (d.action === 'modify') return 'rgba(245, 158, 11, 0.3)';
                    if (d.action === 'destroy') return 'rgba(239, 68, 68, 0.3)';
                } else if (phase === 'applied') {
                    if (d.action === 'destroy') return 'rgba(255,255,255,0.08)'; // Deleted
                    return 'var(--color-green)'; // Created/updated
                }
                return 'rgba(255,255,255,0.2)';
            })
            .attr("stroke-dasharray", d => {
                if (phase === 'plan') {
                    return d.action === 'add' || d.action === 'destroy' ? '4 2' : 'none';
                }
                if (phase === 'applying') {
                    const idx = nodes.indexOf(d);
                    if (idx === activeIndex) return 'none'; // Active applying
                    return d.action === 'add' || d.action === 'destroy' ? '4 2' : 'none';
                }
                if (phase === 'applied' && d.action === 'destroy') {
                    return '2 2';
                }
                return 'none';
            })
            .style("filter", (d, i) => {
                if (phase === 'applying' && i === activeIndex) {
                    return 'drop-shadow(0 0 6px var(--color-cyan-glow))';
                }
                return 'none';
            })
            .attr("opacity", d => {
                if (phase === 'applied' && d.action === 'destroy') return 0.2;
                return 1.0;
            });
            
        // Resource Action symbol (+, ~, -)
        nodeGroups.append("text")
            .attr("x", -w/2 + 8)
            .attr("y", 4)
            .attr("font-size", "11px")
            .attr("font-family", "var(--font-mono)")
            .attr("font-weight", "bold")
            .attr("fill", d => {
                if (phase === 'applied') {
                    if (d.action === 'destroy') return 'rgba(255,255,255,0.1)';
                    return 'var(--color-green)';
                }
                if (d.action === 'add') return 'var(--color-green)';
                if (d.action === 'modify') return 'var(--color-yellow)';
                if (d.action === 'destroy') return 'var(--color-red)';
                return '#fff';
            })
            .text(d => {
                if (phase === 'applied' && d.action === 'destroy') return 'x';
                if (d.action === 'add') return '+';
                if (d.action === 'modify') return '~';
                if (d.action === 'destroy') return '-';
                return '';
            })
            .attr("opacity", d => {
                if (phase === 'applied' && d.action === 'destroy') return 0.3;
                return 1.0;
            });
            
        // Resource name text
        nodeGroups.append("text")
            .attr("x", -w/2 + 18)
            .attr("y", 1)
            .attr("font-size", "7.5px")
            .attr("font-family", "var(--font-mono)")
            .attr("fill", "#fff")
            .text(d => d.label.split('.')[1])
            .attr("opacity", d => {
                if (phase === 'applied' && d.action === 'destroy') return 0.2;
                return 1.0;
            });
            
        // Resource type text
        nodeGroups.append("text")
            .attr("x", -w/2 + 18)
            .attr("y", 9)
            .attr("font-size", "6.5px")
            .attr("font-family", "var(--font-sans)")
            .attr("fill", "var(--text-muted)")
            .text(d => d.label.split('.')[0])
            .attr("opacity", d => {
                if (phase === 'applied' && d.action === 'destroy') return 0.2;
                return 1.0;
            });
    }
}
