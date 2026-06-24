# NEBULA-TWIN: Cloud Environment Digital Twin
### AI-Powered Real-Time Infrastructure Observability & Self-Healing Platform

---

## 🔗 Live Production Deployments
* **Interactive Dashboard (Vercel)**: [https://nebula-twin.vercel.app/](https://nebula-twin.vercel.app/)
* **REST API & Telemetry Engine (Railway)**: [https://nebula-twin-production.up.railway.app/](https://nebula-twin-production.up.railway.app/)

---

Nebula-Twin is a next-generation Cloud Digital Twin platform designed to provide DevOps, SRE, and Cloud Infrastructure teams with a unified, real-time virtual representation of their Kubernetes cluster, cloud resources, service dependency relationships, deployment pipelines, and backing datastores. 

Equipped with a predictive anomaly-detection engine and self-healing automation, Nebula-Twin detects imminent container failures before they propagate, sends rich alert integrations to Slack, and runs automated rollouts to restore service health.

---

## 🚀 Key Features

* **Live Infrastructure Map**: Dynamic visual topology displaying AWS EKS clusters, worker EC2 nodes, pods, namespaces, and Aurora PostgreSQL databases.
* **Service Dependency Graph**: Real-time service-to-service communication paths animated with request packet traffic flows, showing live latencies and error states.
* **AI-Powered Failure Predictor**: Uses trend-line regression forecasting on container CPU/Memory load vectors to warn SREs of imminent crashes (e.g. Memory leaks or CPU locks) up to 15 minutes before they occur.
* **Self-Healing Loop**: Automated controller that monitors container failures and schedules rolling hot-restarts, updating alert metrics and resolving Slack notifications automatically.
* **CI/CD Deployment timeline**: Real-time pipeline visualizer (Git webhook &rarr; GitHub Actions tests &rarr; Jenkins build &rarr; AWS ECR push &rarr; AWS EKS deployment) streaming build console logs.
* **Terraform IaC Sandbox**: Interactive workspace displaying a mock AWS infrastructure blueprint (`main.tf`) with console plan and apply outputs.
* **Log Search & Alert Webhooks**: Centralized container log parser alongside a docked **Slack Ops Channel** simulator showing rich webhook alert attachments.
* **RBAC Controls**: Global role identity switcher enforcing user permissions (Admin, DevOps Engineer, Developer, Viewer) across operations.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla CSS (glassmorphic cyber theme), Native ES6 Javascript, **D3.js** (local vector layout rendering).
* **Backend**: **Java Spring Boot**, Spring MVC, Spring Data JPA, Spring JDBC (JdbcTemplate).
* **Database**: **PostgreSQL** (storing users, clusters, nodes, pods, deployments, and alerts telemetry).
* **DevOps APIs**: **Official Kubernetes Java Client SDK**, Prometheus PromQL REST API wrapper.
* **Containerization & IaC**: Docker (packaging), Terraform (infrastructure definitions).
* **Observability Pipelines**: Prometheus, Apache Kafka (broker queue), ELK Stack (Logstash & Elasticsearch).

---

## 📁 Project Structure

```
d:\DEV\
├── index.html                   # Observability dashboard layout
├── styles.css                   # Cyberpunk dark theme styles
├── app.js                       # Frontend state machine & simulation engine
├── d3.v7.min.js                 # Local copy of D3 library
├── package.json                 # Node package configuration
├── server.js                    # Zero-dependency Node web server
├── backend_guide.md             # Developer setup instructions
├── modules/                     # Frontend dashboard views
│   ├── inframap.js              # Cluster topology visualizer
│   ├── dependency.js            # Microservice graph & packet animations
│   ├── heatmap.js               # Grid load sparklines
│   ├── prediction.js            # Dual-axis canvas forecast charts
│   ├── pipeline.js              # Build runner logs
│   ├── terraform.js             # IaC terminal process
│   ├── logs.js                  # Log streams
│   └── alerts.js                # Slack webhook formats
└── backend/                     # Java Spring Boot REST API
    ├── pom.xml                  # Maven dependency manager
    └── src/main/
        ├── resources/
        │   ├── application.properties # Database, K8s & Prometheus parameters
        │   └── schema.sql             # SQL database table definitions & seed values
        └── java/com/nebula/twin/
            ├── BackendApplication.java # Spring Boot entry point
            ├── controller/
            │   └── TwinApiController.java # REST API endpoints
            └── service/
                ├── KubernetesService.java # K8s Client SDK wrapper
                ├── PrometheusService.java # Prometheus query wrapper
                └── AlertService.java      # Slack webhook trigger & DB logger
```

---

## ⚙️ Setup & Installation

### Prerequisite 1: Initialize PostgreSQL Database

Run these SQL commands in your PostgreSQL shell (`psql`) to initialize the database:
```sql
-- 1. Refresh collations to prevent Windows system mismatch warnings
ALTER DATABASE template1 REFRESH COLLATION VERSION;
ALTER DATABASE postgres REFRESH COLLATION VERSION;

-- 2. Create the database
CREATE DATABASE nebulatwindb;

-- 3. Create the database user and grant permissions
CREATE USER dbadmin WITH PASSWORD 'TwinP@ssw0rdSecrets!';
ALTER DATABASE nebulatwindb OWNER TO dbadmin;

-- 4. Connect to nebulatwindb and grant schema privileges
\c nebulatwindb
GRANT ALL ON SCHEMA public TO dbadmin;
```

---

### Prerequisite 2: Start the Spring Boot Backend

1. Navigate to the backend directory:
   ```bash
   cd d:\DEV\backend
   ```
2. Build the Maven project:
   ```bash
   mvn clean install
   ```
3. Start the application:
   ```bash
   mvn spring-boot:run
   ```
The backend server will run at **`http://localhost:8080`**. On startup, Spring Boot will automatically run `schema.sql` to generate all tables and insert dummy nodes, pods, deployments, and alerts into the database.

---

### Prerequisite 3: Start the Frontend Dashboard

1. Navigate to the root directory:
   ```bash
   cd d:\DEV
   ```
2. Start the lightweight development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to **[http://localhost:3000/](http://localhost:3000/)**.

---

## 🎮 Interactive Demo Scenarios

### Scenario A: Real-Time DB Observability
1. Open the dashboard at `http://localhost:3000/`.
2. Toggle the **`Live Cluster (API)`** switch in the sidebar footer to **ON**.
3. The dashboard will instantly switch context to pull metrics and pod lists directly from your running Spring Boot server and PostgreSQL database!

### Scenario B: AI Forecasting and self-healing
1. Select the **AI Failure Predictor** tab.
2. Click **Inject Random Fault** in the sidebar.
3. The selected pod's memory starts leaking:
   - The AI Predictor detects the upward telemetry trend line and issues an **imminent outage warning**.
   - After reaching 100% capacity, the pod status drops to `failed`.
   - An outage notification is pushed to the database and appears in the Slack drawer.
4. If **Auto-Healing** is enabled, the backend intercepts the failure, executes a rolling reboot, sets the status back to `running`, and publishes a resolution alert to Slack.
