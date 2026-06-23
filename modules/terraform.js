// Terraform IaC Console Simulator

export class TerraformSimulator {
    constructor(consoleId, planBtnId, applyBtnId) {
        this.console = document.getElementById(consoleId);
        this.planBtn = document.getElementById(planBtnId);
        this.applyBtn = document.getElementById(applyBtnId);
        
        this.planRan = false;
        this.running = false;
        
        this.setupListeners();
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
        
        setTimeout(() => {
            this.logLine("aws_vpc.main: Refreshing state... [id=vpc-09fac10a9c]");
            this.logLine("aws_s3_bucket.logs: Refreshing state... [id=nebula-twin-logstash-storage]");
        }, 1000);

        setTimeout(() => {
            this.logLine("<br>An execution plan has been generated and is shown below.", "success");
            this.logLine("Terraform will perform the following actions:");
            this.logLine("  <span style='color:var(--color-green); font-weight:700;'>+</span> create aws_eks_cluster.prod");
            this.logLine("  <span style='color:var(--color-green); font-weight:700;'>+</span> create aws_rds_cluster.postgres");
            this.logLine("  <span style='color:var(--color-yellow); font-weight:700;'>~</span> update aws_s3_bucket.logs (force replacement: false)");
            this.logLine("<br>Plan: 2 to add, 1 to change, 0 to destroy.");
            
            this.planRan = true;
            this.running = false;
            this.planBtn.disabled = false;
            
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

        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) {
                this.logLine("aws_s3_bucket.logs: Modifications complete after 2s");
                this.logLine("aws_rds_cluster.postgres: Creating...");
            } else if (step === 2) {
                this.logLine("aws_rds_cluster.postgres: Still creating... (5s)");
            } else if (step === 3) {
                this.logLine("aws_rds_cluster.postgres: Creation complete after 8s [id=rds-twin-postgres-db]");
                this.logLine("aws_eks_cluster.prod: Creating...");
            } else if (step === 4) {
                this.logLine("aws_eks_cluster.prod: Still creating... (5s)");
            } else if (step === 5) {
                this.logLine("aws_eks_cluster.prod: Still creating... (10s)");
            } else if (step === 6) {
                this.logLine("aws_eks_cluster.prod: Creation complete after 14s [id=eks-prod-us-east]");
                this.logLine("<br><span style='color:var(--color-green); font-weight:700;'>Apply complete! Resources: 2 added, 1 changed, 0 destroyed.</span>", "success");
                
                this.running = false;
                this.planRan = false;
                this.planBtn.disabled = false;
                this.applyBtn.disabled = true;

                // Dispatch event that terraform completed successfully
                const evt = new CustomEvent("terraform-apply-success");
                window.dispatchEvent(evt);
                
                clearInterval(interval);
            }
        }, 1500);
    }
}
