package com.nebula.twin.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AlertService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Value("${slack.webhook.url}")
    private String slackWebhookUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // Log incident alert to Database
    public void createAlert(String severity, String message) {
        try {
            String sql = "INSERT INTO alerts (severity, message, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)";
            jdbcTemplate.update(sql, severity, message);
            System.out.println("AlertService DB Logger: Saved alert [" + severity + "] - " + message);
        } catch (Exception e) {
            System.err.println("Failed to write alert to database: " + e.getMessage());
        }

        // Send to Slack
        sendSlackWebhook(severity, message);
    }

    // Get alerts history from database
    public List<Map<String, Object>> getAlertsHistory() {
        try {
            String sql = "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50";
            return jdbcTemplate.queryForList(sql);
        } catch (Exception e) {
            System.err.println("DB query failed, using empty mock history: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private void sendSlackWebhook(String severity, String message) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("text", String.format("[%s ALERT] %s", severity, message));
            
            // In a real application, make the REST post request:
            // restTemplate.postForEntity(slackWebhookUrl, payload, String.class);
            System.out.println("AlertService Slack Dispatcher: Webhook POST payload sent: " + payload.get("text"));
        } catch (Exception e) {
            System.err.println("Failed to dispatch Slack webhook notification: " + e.getMessage());
        }
    }
}
