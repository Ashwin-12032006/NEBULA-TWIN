package com.nebula.twin.controller;

import com.nebula.twin.service.KubernetesService;
import com.nebula.twin.service.PrometheusService;
import com.nebula.twin.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class TwinApiController {

    @Autowired
    private KubernetesService kubernetesService;

    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private AlertService alertService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Fetch raw table rows from database
    @GetMapping("/db/table")
    public List<Map<String, Object>> getTableRows(@RequestParam String tableName) {
        List<String> allowedTables = Arrays.asList("users", "clusters", "nodes", "pods", "deployments", "alerts");
        if (!allowedTables.contains(tableName.toLowerCase())) {
            throw new IllegalArgumentException("Unauthorized table name: " + tableName);
        }
        
        try {
            // Sort by id for consistent ordering, falls back to raw select if no id column
            if (tableName.equalsIgnoreCase("alerts")) {
                return jdbcTemplate.queryForList("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100");
            }
            return jdbcTemplate.queryForList("SELECT * FROM " + tableName + " ORDER BY id ASC");
        } catch (Exception e) {
            try {
                return jdbcTemplate.queryForList("SELECT * FROM " + tableName);
            } catch (Exception ex) {
                System.err.println("DB query failed for table " + tableName + ": " + ex.getMessage());
                return new ArrayList<>();
            }
        }
    }

    // Get Active Cluster telemetry status
    @GetMapping("/cluster/status")
    public Map<String, Object> getClusterStatus() {
        Map<String, Object> response = new HashMap<>();
        List<Map<String, Object>> nodes = kubernetesService.getNodes();
        List<Map<String, Object>> pods = kubernetesService.getPods();

        // Calculate averages
        double sumCpu = 0;
        double sumMem = 0;
        for (Map<String, Object> pod : pods) {
            sumCpu += ((Number) pod.get("cpu")).doubleValue();
            sumMem += ((Number) pod.get("memory")).doubleValue();
        }
        int avgCpu = pods.isEmpty() ? 0 : (int) (sumCpu / pods.size());
        int avgMem = pods.isEmpty() ? 0 : (int) ((sumMem / pods.size() / 512.0) * 100);

        response.put("cluster_name", "EKS-PROD-LIVE");
        response.put("region", "us-east-1");
        response.put("k8s_mode", kubernetesService.isLive() ? "live" : "simulated");
        response.put("nodes", nodes);
        response.put("pods", pods);
        response.put("average_cpu", avgCpu);
        response.put("average_memory", avgMem);
        
        return response;
    }

    // Get live pod container logs
    @GetMapping("/pods/logs")
    public Map<String, String> getPodLogs(@RequestParam String podName, @RequestParam(defaultValue = "production") String namespace) {
        Map<String, String> response = new HashMap<>();
        String logs = kubernetesService.getPodLogs(podName, namespace);
        response.put("pod_name", podName);
        response.put("logs", logs);
        return response;
    }

    // Trigger Pod Restart / Self-healing rolling update
    @PostMapping("/pods/restart")
    public Map<String, Object> restartPod(@RequestParam String podName, @RequestParam(defaultValue = "production") String namespace) {
        Map<String, Object> response = new HashMap<>();
        boolean success = kubernetesService.restartPod(podName, namespace);
        
        if (success) {
            alertService.createAlert("WARNING", "Pod rolling restart triggered manually: " + podName);
        }

        response.put("pod_name", podName);
        response.put("success", success);
        response.put("timestamp", new Date());
        return response;
    }

    // Fetch Alerts history from DB
    @GetMapping("/alerts/history")
    public List<Map<String, Object>> getAlertsHistory() {
        return alertService.getAlertsHistory();
    }

    // Trigger manual fault alert
    @PostMapping("/alerts/trigger")
    public Map<String, Object> triggerFaultAlert(@RequestParam String podName, @RequestParam String service, @RequestParam String errorMsg) {
        Map<String, Object> response = new HashMap<>();
        String alertMsg = String.format("Pod outage detected: %s (Service: %s) - Error: %s", podName, service, errorMsg);
        
        alertService.createAlert("CRITICAL", alertMsg);

        response.put("success", true);
        response.put("message", "Outage warning successfully dispatched.");
        return response;
    }

    // Fetch metric telemetry history for a pod (15 ticks)
    @GetMapping("/pods/telemetry")
    public Map<String, Object> getPodTelemetry(@RequestParam String podName) {
        Map<String, Object> response = new HashMap<>();
        response.put("pod_name", podName);
        response.put("cpu_history", prometheusService.getMetricHistory(podName, "cpu"));
        response.put("memory_history", prometheusService.getMetricHistory(podName, "memory"));
        return response;
    }
}
