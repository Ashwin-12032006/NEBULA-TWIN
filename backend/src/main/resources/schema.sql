-- Cloud Environment Digital Twin Database Schema

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- 2. Clusters table
CREATE TABLE IF NOT EXISTS clusters (
    id SERIAL PRIMARY KEY,
    cluster_name VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL
);

-- 3. Nodes table
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    cluster_id INTEGER REFERENCES clusters(id) ON DELETE CASCADE,
    node_name VARCHAR(100) UNIQUE NOT NULL,
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0
);

-- 4. Pods table
CREATE TABLE IF NOT EXISTS pods (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    pod_name VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    cpu INTEGER DEFAULT 0,
    memory INTEGER DEFAULT 0,
    restarts INTEGER DEFAULT 0,
    service VARCHAR(50)
);

-- 5. Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    description TEXT
);

-- 6. Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing data to avoid conflicts during seed updates
TRUNCATE TABLE pods, nodes, clusters, users, deployments, alerts RESTART IDENTITY CASCADE;

-- Seed Users & Identities
INSERT INTO users (name, email, role) VALUES 
('Alice DevOps', 'alice@nebula.io', 'admin'),
('Bob Developer', 'bob@nebula.io', 'developer'),
('Charlie SRE', 'charlie@nebula.io', 'devops');

-- Seed Clusters
INSERT INTO clusters (cluster_name, region, status) VALUES 
('EKS-PROD-US-EAST', 'us-east-1', 'active'),
('EKS-STAGE-US-WEST', 'us-west-2', 'active'),
('EKS-DEV-LOCAL', 'us-east-1', 'active');

-- Seed Nodes for EKS-PROD-US-EAST (Cluster 1)
INSERT INTO nodes (cluster_id, node_name, cpu_usage, memory_usage) VALUES 
(1, 'ip-10-0-1-12.ec2.internal', 34, 45),
(1, 'ip-10-0-2-45.ec2.internal', 52, 60),
(1, 'ip-10-0-3-98.ec2.internal', 25, 35),
(1, 'ip-10-0-4-101.ec2.internal', 48, 68);

-- Seed Nodes for EKS-STAGE-US-WEST (Cluster 2)
INSERT INTO nodes (cluster_id, node_name, cpu_usage, memory_usage) VALUES 
(2, 'ip-172-16-1-10.ec2.internal', 15, 28),
(2, 'ip-172-16-2-22.ec2.internal', 24, 32);

-- Seed Nodes for EKS-DEV-LOCAL (Cluster 3)
INSERT INTO nodes (cluster_id, node_name, cpu_usage, memory_usage) VALUES 
(3, 'minikube-virtualbox', 18, 40);

-- Seed Pods for EKS-PROD-US-EAST (Nodes 1, 2, 3, 4)
INSERT INTO pods (node_id, pod_name, status, cpu, memory, restarts, service) VALUES 
(1, 'frontend-pod-1', 'running', 12, 180, 0, 'frontend'),
(1, 'frontend-pod-2', 'running', 15, 195, 0, 'frontend'),
(1, 'api-gateway-pod-1', 'running', 8, 120, 0, 'gateway'),
(1, 'user-service-pod-1', 'running', 22, 240, 0, 'user-service'),
(2, 'order-service-pod-1', 'running', 32, 290, 0, 'order-service'),
(2, 'order-service-pod-2', 'running', 28, 280, 0, 'order-service'),
(2, 'payment-service-pod-1', 'running', 18, 210, 0, 'payment-service'),
(3, 'notification-service-pod-1', 'running', 10, 140, 0, 'notification-service'),
(3, 'notification-service-pod-2', 'running', 14, 155, 0, 'notification-service'),
(3, 'redis-cache-pod-1', 'running', 5, 85, 0, 'redis'),
(4, 'postgresql-db-pod-1', 'running', 35, 410, 0, 'postgresql');

-- Seed Pods for EKS-STAGE-US-WEST (Nodes 5, 6)
INSERT INTO pods (node_id, pod_name, status, cpu, memory, restarts, service) VALUES 
(5, 'frontend-pod-stage-1', 'running', 8, 160, 0, 'frontend'),
(5, 'api-gateway-pod-stage-1', 'running', 5, 110, 0, 'gateway'),
(5, 'user-service-pod-stage-1', 'running', 14, 220, 0, 'user-service'),
(6, 'order-service-pod-stage-1', 'running', 18, 260, 0, 'order-service'),
(6, 'payment-service-pod-stage-1', 'running', 12, 190, 0, 'payment-service'),
(6, 'postgresql-db-pod-stage-1', 'running', 20, 340, 0, 'postgresql');

-- Seed Pods for EKS-DEV-LOCAL (Node 7)
INSERT INTO pods (node_id, pod_name, status, cpu, memory, restarts, service) VALUES 
(7, 'frontend-pod-dev-1', 'running', 10, 170, 0, 'frontend'),
(7, 'api-gateway-pod-dev-1', 'running', 7, 115, 0, 'gateway'),
(7, 'user-service-pod-dev-1', 'running', 12, 200, 0, 'user-service'),
(7, 'order-service-pod-dev-1', 'running', 15, 240, 0, 'order-service'),
(7, 'postgresql-db-pod-dev-1', 'running', 18, 310, 0, 'postgresql');

-- Seed Deployments History
INSERT INTO deployments (version, timestamp, status, description) VALUES 
('v1.0', CURRENT_TIMESTAMP - INTERVAL '8 hours', 'success', 'Initial cluster configuration provisioning.'),
('v1.1', CURRENT_TIMESTAMP - INTERVAL '6 hours', 'failed', 'Deploy v1.1: Failed unit tests in order-service. Rolled back.'),
('v1.2', CURRENT_TIMESTAMP - INTERVAL '4 hours', 'success', 'Deploy v1.2: Added hot-cache layer for inventory queries.'),
('v1.3', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'success', 'Deploy v1.3: Upgraded payment-service endpoints.');

-- Seed Alerts History
INSERT INTO alerts (severity, message, created_at) VALUES 
('CRITICAL', 'Pod payment-service-pod-1 Out of Memory crash (Status: CrashLoopBackOff)', CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
('WARNING', 'Core Database Connection Pool limit reached: active_conns=42', CURRENT_TIMESTAMP - INTERVAL '10 minutes');
