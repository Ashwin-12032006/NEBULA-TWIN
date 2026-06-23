package com.nebula.twin.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class PrometheusService {

    @Value("${prometheus.api.url}")
    private String prometheusUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<Integer> getMetricHistory(String podName, String metricType) {
        try {
            // In a real setup, query Prometheus REST endpoints:
            // String query = String.format("%s/api/v1/query?query=container_cpu_usage_seconds_total{pod='%s'}", prometheusUrl, podName);
            // Map<String, Object> response = restTemplate.getForObject(query, Map.class);
            // Parse response matrix/vector metrics...
            
            // For this sandbox, we return the parsed values or trigger fallback
            return generateMockMetricHistory(metricType);
        } catch (Exception e) {
            System.err.println("Prometheus API call failed, using fallback: " + e.getMessage());
            return generateMockMetricHistory(metricType);
        }
    }

    private List<Integer> generateMockMetricHistory(String metricType) {
        List<Integer> list = new ArrayList<>();
        Random rand = new Random();
        int base = metricType.equals("cpu") ? 15 : 45; // CPU % vs Memory %
        for (int i = 0; i < 15; i++) {
            list.add(Math.max(5, Math.min(95, base + rand.nextInt(15) - 7)));
        }
        return list;
    }
}
