# Backend Integration Setup Guide

Follow these steps to connect your Cloud Digital Twin to a live cluster, telemetry stream, and PostgreSQL database.

---

## Step 1: Initialize PostgreSQL Database

1. Ensure PostgreSQL is installed and running locally.
2. Open your PostgreSQL terminal (psql) or administration tool (pgAdmin) and run the following commands:
   ```sql
   -- Create database
   CREATE DATABASE nebulatwindb;

   -- Create user and grant permissions
   CREATE USER dbadmin WITH PASSWORD 'TwinP@ssw0rdSecrets!';
   GRANT ALL PRIVILEGES ON DATABASE nebulatwindb TO dbadmin;
   ```
3. Spring Boot will automatically run `src/main/resources/schema.sql` on startup to generate the tables (`users`, `clusters`, `nodes`, `pods`, `deployments`, `alerts`) and insert sample mock seeds.

---

## Step 2: Configure Kubernetes Access

- Make sure you have a working Kubernetes configuration context (`kubectl get pods` should respond successfully).
- The Spring Boot backend reads your default local kubeconfig located at `~/.kube/config`. If you are deploying the backend inside the cluster (EKS), you can toggle `kubernetes.client.in-cluster=true` in `application.properties`.

---

## Step 3: Run the Spring Boot API

1. Open a terminal in the backend directory:
   ```bash
   cd d:\DEV\backend
   ```
2. Build the project using Maven:
   ```bash
   mvn clean install
   ```
3. Run the application:
   ```bash
   mvn spring-boot:run
   ```
The backend server will start on port **`8080`**.

---

## Step 4: Toggle Live Mode on the Frontend

1. Ensure the static server is running:
   ```bash
   npm run dev
   ```
2. Open the browser at **[http://localhost:3000/](http://localhost:3000/)**.
3. In the sidebar footer under **Simulation Tools**, toggle **`Live Cluster (API)`** to **ON**.
4. The dashboard will instantly switch observation modes, fetching metrics and deploying container commands using the Spring Boot server!
