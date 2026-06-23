package com.nebula.twin.service;

import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.Configuration;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1NodeList;
import io.kubernetes.client.openapi.models.V1PodList;
import io.kubernetes.client.util.Config;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class KubernetesService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private CoreV1Api apiInstance;
    private boolean isK8sConnected = false;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @PostConstruct
    public void init() {
        try {
            ApiClient client = Config.defaultClient();
            Configuration.setDefaultApiClient(client);
            this.apiInstance = new CoreV1Api();
            this.isK8sConnected = true;
            System.out.println("==================================================================");
            System.out.println("  SUCCESSFULLY CONNECTED TO LIVE KUBERNETES CLUSTER (KUBECONFIG)  ");
            System.out.println("==================================================================");
        } catch (Exception e) {
            System.out.println("==================================================================");
            System.out.println("  WARNING: Kubernetes client failed to initialize.                ");
            System.out.println("  Falling back to database-driven simulation mode.                ");
            System.out.println("  Reason: " + e.getMessage());
            System.out.println("==================================================================");
            this.isK8sConnected = false;
        }
    }

    public boolean isLive() {
        return this.isK8sConnected;
    }

    // Get Active Nodes List (from K8s or PostgreSQL)
    public List<Map<String, Object>> getNodes() {
        List<Map<String, Object>> nodeList = new ArrayList<>();
        if (isK8sConnected) {
            try {
                V1NodeList list = apiInstance.listNode(null, null, null, null, null, null, null, null, null, null);
                list.getItems().forEach(node -> {
                    Map<String, Object> nodeMap = new HashMap<>();
                    nodeMap.put("node_name", node.getMetadata().getName());
                    nodeMap.put("disk_usage", 40 + new Random().nextInt(20));
                    nodeMap.put("cpu_usage", 15 + new Random().nextInt(40));
                    nodeMap.put("memory_usage", 30 + new Random().nextInt(30));
                    nodeList.add(nodeMap);
                });
            } catch (Exception e) {
                System.err.println("K8s node lookup failed, falling back to DB: " + e.getMessage());
                return getDbNodes();
            }
        } else {
            return getDbNodes();
        }
        return nodeList;
    }

    // Get Active Pods List (from K8s or PostgreSQL)
    public List<Map<String, Object>> getPods() {
        List<Map<String, Object>> podList = new ArrayList<>();
        if (isK8sConnected) {
            try {
                V1PodList list = apiInstance.listPodForAllNamespaces(null, null, null, null, null, null, null, null, null, null);
                list.getItems().forEach(pod -> {
                    Map<String, Object> podMap = new HashMap<>();
                    podMap.put("pod_name", pod.getMetadata().getName());
                    podMap.put("status", pod.getStatus().getPhase().toLowerCase());
                    podMap.put("cpu", 5 + new Random().nextInt(20));
                    podMap.put("memory", 120 + new Random().nextInt(150));
                    podMap.put("restarts", 0);
                    podMap.put("service", getServiceNameFromPod(pod.getMetadata().getName()));
                    podList.add(podMap);
                });
            } catch (Exception e) {
                System.err.println("K8s pod lookup failed, falling back to DB: " + e.getMessage());
                return getDbPods();
            }
        } else {
            return getDbPods();
        }
        return podList;
    }

    // Restart a pod (deleting it in K8s or updating status in PostgreSQL)
    public boolean restartPod(String podName, String namespace) {
        if (isK8sConnected) {
            try {
                apiInstance.deleteNamespacedPod(podName, namespace, null, null, null, null, null, null);
                System.out.println("Kubernetes API: Successfully deleted pod " + podName + " in namespace " + namespace);
                return true;
            } catch (Exception e) {
                System.err.println("Kubernetes pod deletion failed: " + e.getMessage());
                return false;
            }
        }
        
        // Database-driven rollout simulation: set status to pending, then running
        try {
            jdbcTemplate.update("UPDATE pods SET status = 'pending', restarts = restarts + 1 WHERE pod_name = ?", podName);
            System.out.println("DB Rollout: Set pod " + podName + " status to PENDING.");

            // Schedule return to RUNNING in 3 seconds
            scheduler.schedule(() -> {
                try {
                    jdbcTemplate.update("UPDATE pods SET status = 'running', cpu = 15, memory = 200 WHERE pod_name = ?", podName);
                    System.out.println("DB Rollout: Set pod " + podName + " status back to RUNNING.");
                } catch (Exception err) {
                    System.err.println("Failed to finish DB pod restart rollout: " + err.getMessage());
                }
            }, 3, TimeUnit.SECONDS);

            return true;
        } catch (Exception e) {
            System.err.println("Database pod update failed: " + e.getMessage());
            return false;
        }
    }

    // Read live logs
    public String getPodLogs(String podName, String namespace) {
        if (isK8sConnected) {
            try {
                return apiInstance.readNamespacedPodLog(
                    podName,
                    namespace,
                    (String) null,
                    (Boolean) null,
                    (Boolean) null,
                    (Integer) null,
                    (String) null,
                    (Boolean) null,
                    (Integer) null,
                    (Integer) null,
                    (Boolean) null
                );
            } catch (Exception e) {
                return "Failed to fetch logs from live EKS cluster: " + e.getMessage();
            }
        }
        return "[Database Twin Log] " + podName + " container initialized.\n" +
               "[Database Twin Log] successfully bound socket port 8080.\n" +
               "[Database Twin Log] connection established with postgresql datasource.";
    }

    private String getServiceNameFromPod(String podName) {
        if (podName.contains("frontend")) return "frontend";
        if (podName.contains("gateway")) return "gateway";
        if (podName.contains("user")) return "user-service";
        if (podName.contains("order")) return "order-service";
        if (podName.contains("payment")) return "payment-service";
        return "other";
    }

    private List<Map<String, Object>> getDbNodes() {
        try {
            List<Map<String, Object>> dbNodes = jdbcTemplate.queryForList("SELECT node_name, cpu_usage, memory_usage FROM nodes");
            dbNodes.forEach(n -> {
                n.put("disk_usage", 40 + new Random().nextInt(20)); // generate disk usage dynamically
            });
            return dbNodes;
        } catch (Exception e) {
            System.err.println("DB node query failed, using empty mock: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> getDbPods() {
        try {
            return jdbcTemplate.queryForList("SELECT pod_name, status, cpu, memory, restarts, service FROM pods");
        } catch (Exception e) {
            System.err.println("DB pod query failed, using empty mock: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
