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
    memory INTEGER DEFAULT 0
);

-- 5. Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

-- 6. Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Mock Data
INSERT INTO users (name, email, role) VALUES 
('Alice DevOps', 'alice@nebula.io', 'admin'),
('Bob Developer', 'bob@nebula.io', 'developer'),
('Charlie SRE', 'charlie@nebula.io', 'devops')
ON CONFLICT DO NOTHING;

INSERT INTO clusters (cluster_name, region, status) VALUES 
('EKS-PROD-US-EAST', 'us-east-1', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO nodes (cluster_id, node_name, cpu_usage, memory_usage) VALUES 
(1, 'ip-10-0-1-12.ec2.internal', 34, 45),
(1, 'ip-10-0-2-45.ec2.internal', 52, 60)
ON CONFLICT DO NOTHING;

INSERT INTO pods (node_id, pod_name, status, cpu, memory) VALUES 
(1, 'frontend-pod-1', 'running', 12, 180),
(1, 'api-gateway-pod-1', 'running', 8, 120),
(2, 'order-service-pod-1', 'running', 28, 290),
(2, 'payment-service-pod-1', 'running', 18, 210)
ON CONFLICT DO NOTHING;
