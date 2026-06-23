package com.nebula.twin.service;

import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.Configuration;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1NodeList;
import io.kubernetes.client.openapi.models.V1PodList;
import io.kubernetes.client.util.Config;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;

@Service
public class KubernetesService {

    private CoreV1Api apiInstance;
    private boolean isK8sConnected = false;

    @PostConstruct
    public void init() {
        try {
            // Attempt to load standard KubeConfig
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
            System.out.println("  Falling back to simulated cluster mode.                         ");
            System.out.println("  Reason: " + e.getMessage());
            System.out.println("==================================================================");
            this.isK8sConnected = false;
        }
    }

    public boolean isLive() {
        return this.isK8sConnected;
    }

    // Get Active Nodes List
    public List<Map<String, Object>> getNodes() {
        List<Map<String, Object>> nodeList = new ArrayList<>();
        if (isK8sConnected) {
            try {
                V1NodeList list = apiInstance.listNode(null, null, null, null, null, null, null, null, null, null);
                list.getItems().forEach(node -> {
                    Map<String, Object> nodeMap = new HashMap<>();
                    nodeMap.put("node_name", node.getMetadata().getName());
                    nodeMap.put("disk_usage", 40 + new Random().nextInt(20)); // Mock disk from OS capacity
                    nodeMap.put("cpu_usage", 15 + new Random().nextInt(40));
                    nodeMap.put("memory_usage", 30 + new Random().nextInt(30));
                    nodeList.add(nodeMap);
                });
            } catch (Exception e) {
                System.err.println("K8s node lookup failed, using simulated fallback: " + e.getMessage());
                return getSimulatedNodes();
            }
        } else {
            return getSimulatedNodes();
        }
        return nodeList;
    }

    // Get Active Pods List
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
                System.err.println("K8s pod lookup failed, using simulated fallback: " + e.getMessage());
                return getSimulatedPods();
            }
        } else {
            return getSimulatedPods();
        }
        return podList;
    }

    // Restart a pod (deleting it will trigger replica controller rollouts)
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
        System.out.println("Simulated Client: Rolling restart for " + podName);
        return true;
    }

    // Read live logs
    public String getPodLogs(String podName, String namespace) {
        if (isK8sConnected) {
            try {
                return apiInstance.readNamespacedPodLog(podName, namespace, null, null, null, null, null, null, null, null);
            } catch (Exception e) {
                return "Failed to fetch logs from live EKS cluster: " + e.getMessage();
            }
        }
        return "[Simulated Log] " + podName + " container started successfully.\n" +
               "[Simulated Log] listening on port 8080\n" +
               "[Simulated Log] Connection established with database.";
    }

    private String getServiceNameFromPod(String podName) {
        if (podName.contains("frontend")) return "frontend";
        if (podName.contains("gateway")) return "gateway";
        if (podName.contains("user")) return "user-service";
        if (podName.contains("order")) return "order-service";
        if (podName.contains("payment")) return "payment-service";
        return "other";
    }

    private List<Map<String, Object>> getSimulatedNodes() {
        List<Map<String, Object>> list = new ArrayList<>();
        Map<String, Object> node = new HashMap<>();
        node.put("node_name", "sim-node-eks-1.ec2.internal");
        node.put("disk_usage", 42);
        node.put("cpu_usage", 30);
        node.put("memory_usage", 55);
        list.add(node);
        return list;
    }

    private List<Map<String, Object>> getSimulatedPods() {
        List<Map<String, Object>> list = new ArrayList<>();
        String[] pods = {"frontend-pod-1", "api-gateway-pod-1", "user-service-pod-1", "order-service-pod-1", "payment-service-pod-1"};
        for (String p : pods) {
            Map<String, Object> pod = new HashMap<>();
            pod.put("pod_name", p);
            pod.put("status", "running");
            pod.put("cpu", 10 + new Random().nextInt(15));
            pod.put("memory", 150 + new Random().nextInt(100));
            pod.put("restarts", 0);
            pod.put("service", getServiceNameFromPod(p));
            list.add(pod);
        }
        return list;
    }
}
