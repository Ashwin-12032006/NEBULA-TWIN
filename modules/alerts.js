// Alert Dashboard and Slack Webhook Notification System

export class AlertsManager {
    constructor(slackContainerId, alertBadgeId) {
        this.slackContainer = document.getElementById(slackContainerId);
        this.alertBadge = document.getElementById(alertBadgeId);
        
        this.activeAlerts = new Map(); // Keep track of active alerts by target pod name
        this.slackEnabled = true;
    }

    setSlackEnabled(enabled) {
        this.slackEnabled = enabled;
    }

    triggerAlert(severity, service, podName, clusterName, message) {
        // Avoid duplicate alerts for the same pod
        if (this.activeAlerts.has(podName)) return;

        const alertObj = {
            id: `alert-${Math.floor(Math.random()*10000)}`,
            severity, // 'CRITICAL', 'WARNING', 'INFO'
            service,
            podName,
            clusterName,
            message,
            timestamp: new Date().toLocaleTimeString().slice(0, 5)
        };

        this.activeAlerts.set(podName, alertObj);
        this.updateBadge();

        if (this.slackEnabled) {
            this.sendSlackNotification(alertObj);
        }
    }

    resolveAlert(podName) {
        if (!this.activeAlerts.has(podName)) return;

        const alertObj = this.activeAlerts.get(podName);
        this.activeAlerts.delete(podName);
        this.updateBadge();

        if (this.slackEnabled) {
            this.sendSlackResolution(alertObj);
        }
    }

    updateBadge() {
        if (this.alertBadge) {
            this.alertBadge.textContent = this.activeAlerts.size;
            
            if (this.activeAlerts.size > 0) {
                this.alertBadge.classList.add("alert-count");
            } else {
                this.alertBadge.classList.remove("alert-count");
            }
        }
    }

    sendSlackNotification(alert) {
        if (!this.slackContainer) return;

        const colorClass = alert.severity === 'CRITICAL' ? 'danger' : 'warning';
        const colorTitle = alert.severity === 'CRITICAL' ? 'CRITICAL OUTAGE ALERT' : 'INFRASTRUCTURE WARNING';
        
        const msg = document.createElement("div");
        msg.className = "slack-message";
        msg.innerHTML = `
            <div class="slack-avatar app">TW</div>
            <div class="slack-msg-content">
                <div class="slack-msg-header">
                    <span class="slack-username">nebula-ops-bot</span>
                    <span class="slack-timestamp">${alert.timestamp}</span>
                </div>
                <div class="slack-attachment ${colorClass}">
                    <div class="slack-attachment-title">${colorTitle}: ${alert.message}</div>
                    <div class="slack-fields">
                        <div class="slack-field">
                            <span class="slack-field-title">Resource</span>
                            <span class="slack-field-value">${alert.podName}</span>
                        </div>
                        <div class="slack-field">
                            <span class="slack-field-title">Service</span>
                            <span class="slack-field-value">${alert.service}</span>
                        </div>
                        <div class="slack-field">
                            <span class="slack-field-title">Cluster</span>
                            <span class="slack-field-value">${alert.clusterName}</span>
                        </div>
                        <div class="slack-field">
                            <span class="slack-field-title">Severity</span>
                            <span class="slack-field-value" style="color:${alert.severity === 'CRITICAL' ? 'var(--color-red)' : 'var(--color-yellow)'}; font-weight:700;">${alert.severity}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.slackContainer.appendChild(msg);
        this.slackContainer.scrollTop = this.slackContainer.scrollHeight;

        // Update unread count for mobile drawer button if not open
        const shell = document.getElementById("app-shell");
        if (shell && !shell.classList.contains("slack-open")) {
            const badge = document.getElementById("slack-unread-badge");
            if (badge) {
                let count = parseInt(badge.textContent) || 0;
                count++;
                badge.textContent = count;
                badge.style.display = "block";
            }
        }
    }

    sendSlackResolution(alert) {
        if (!this.slackContainer) return;

        const msg = document.createElement("div");
        msg.className = "slack-message";
        msg.innerHTML = `
            <div class="slack-avatar app">TW</div>
            <div class="slack-msg-content">
                <div class="slack-msg-header">
                    <span class="slack-username">nebula-ops-bot</span>
                    <span class="slack-timestamp">${new Date().toLocaleTimeString().slice(0, 5)}</span>
                </div>
                <div class="slack-attachment success">
                    <div class="slack-attachment-title">RESOLVED: Alert on ${alert.podName} cleared</div>
                    <div class="slack-fields">
                        <div class="slack-field">
                            <span class="slack-field-title">Trigger Pod</span>
                            <span class="slack-field-value">${alert.podName}</span>
                        </div>
                        <div class="slack-field">
                            <span class="slack-field-title">Action taken</span>
                            <span class="slack-field-value" style="color:var(--color-green); font-weight:700;">Self-Healing Rolling Restart</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.slackContainer.appendChild(msg);
        this.slackContainer.scrollTop = this.slackContainer.scrollHeight;

        // Update unread count for mobile drawer button if not open
        const shell = document.getElementById("app-shell");
        if (shell && !shell.classList.contains("slack-open")) {
            const badge = document.getElementById("slack-unread-badge");
            if (badge) {
                let count = parseInt(badge.textContent) || 0;
                count++;
                badge.textContent = count;
                badge.style.display = "block";
            }
        }
    }
}
