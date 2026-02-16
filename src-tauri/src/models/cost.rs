use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// A single cost record for an AI model invocation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostRecord {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub provider: String,
    pub model: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cost_usd: f64,
    #[serde(default)]
    pub artifact_id: Option<String>,
    #[serde(default)]
    pub workflow_run_id: Option<String>,
}

/// Budget configuration and current spend tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostBudget {
    #[serde(default)]
    pub daily_limit_usd: Option<f64>,
    #[serde(default)]
    pub monthly_limit_usd: Option<f64>,
    #[serde(default)]
    pub current_daily_usd: f64,
    #[serde(default)]
    pub current_monthly_usd: f64,
}

impl Default for CostBudget {
    fn default() -> Self {
        Self {
            daily_limit_usd: None,
            monthly_limit_usd: None,
            current_daily_usd: 0.0,
            current_monthly_usd: 0.0,
        }
    }
}

impl CostBudget {
    /// Check if daily budget is near the threshold (fraction 0.0–1.0)
    pub fn is_near_daily_limit(&self, threshold_fraction: f64) -> bool {
        if let Some(limit) = self.daily_limit_usd {
            self.current_daily_usd >= limit * threshold_fraction
        } else {
            false
        }
    }

    /// Check if monthly budget is near the threshold
    pub fn is_near_monthly_limit(&self, threshold_fraction: f64) -> bool {
        if let Some(limit) = self.monthly_limit_usd {
            self.current_monthly_usd >= limit * threshold_fraction
        } else {
            false
        }
    }

    /// Whether condensed mode should be suggested based on budget proximity
    pub fn should_suggest_condensed(&self, warning_threshold: f64) -> bool {
        self.is_near_daily_limit(warning_threshold) || self.is_near_monthly_limit(warning_threshold)
    }
}

/// Cost telemetry log stored per-project
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostLog {
    pub records: Vec<CostRecord>,
    pub budget: CostBudget,
}

impl Default for CostLog {
    fn default() -> Self {
        Self {
            records: Vec::new(),
            budget: CostBudget::default(),
        }
    }
}

impl CostLog {
    /// Load cost log from a JSON file
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path = path.as_ref();
        if !path.exists() {
            return Ok(Self::default());
        }
        let content =
            fs::read_to_string(path).map_err(|e| format!("Failed to read cost log: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse cost log: {}", e))
    }

    /// Save cost log to a JSON file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize cost log: {}", e))?;
        fs::write(path, content).map_err(|e| format!("Failed to write cost log: {}", e))?;
        Ok(())
    }

    /// Add a cost record and update running totals
    pub fn add_record(&mut self, record: CostRecord) {
        self.budget.current_daily_usd += record.cost_usd;
        self.budget.current_monthly_usd += record.cost_usd;
        self.records.push(record);
    }

    /// Total cost across all records
    pub fn total_cost(&self) -> f64 {
        self.records.iter().map(|r| r.cost_usd).sum()
    }

    /// Average cost per artifact (only records linked to artifacts)
    pub fn average_cost_per_artifact(&self) -> Option<f64> {
        let artifact_records: Vec<_> = self
            .records
            .iter()
            .filter(|r| r.artifact_id.is_some())
            .collect();
        if artifact_records.is_empty() {
            None
        } else {
            let total: f64 = artifact_records.iter().map(|r| r.cost_usd).sum();
            Some(total / artifact_records.len() as f64)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cost_budget_thresholds() {
        let budget = CostBudget {
            daily_limit_usd: Some(10.0),
            monthly_limit_usd: Some(100.0),
            current_daily_usd: 8.5,
            current_monthly_usd: 75.0,
        };

        // 0.8 threshold: daily 8.5 >= 10*0.8=8.0 → true
        assert!(budget.is_near_daily_limit(0.8));
        // 0.9 threshold: daily 8.5 >= 10*0.9=9.0 → false
        assert!(!budget.is_near_daily_limit(0.9));

        // Monthly 75 >= 100*0.8=80 → false
        assert!(!budget.is_near_monthly_limit(0.8));
        // Monthly 75 >= 100*0.7=70 → true
        assert!(budget.is_near_monthly_limit(0.7));

        assert!(budget.should_suggest_condensed(0.8));
    }

    #[test]
    fn test_cost_log_operations() {
        let mut log = CostLog::default();

        let record = CostRecord {
            id: "cost-001".to_string(),
            timestamp: Utc::now(),
            provider: "openai".to_string(),
            model: "gpt-4.1-mini".to_string(),
            input_tokens: 1000,
            output_tokens: 500,
            cost_usd: 0.05,
            artifact_id: Some("insight-001".to_string()),
            workflow_run_id: None,
        };

        log.add_record(record);

        assert_eq!(log.total_cost(), 0.05);
        assert_eq!(log.budget.current_daily_usd, 0.05);
        assert_eq!(log.average_cost_per_artifact(), Some(0.05));
    }

    #[test]
    fn test_cost_log_serialization() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let log_path = temp_dir.path().join("cost_log.json");

        let mut log = CostLog::default();
        log.budget.daily_limit_usd = Some(5.0);
        log.add_record(CostRecord {
            id: "cost-001".to_string(),
            timestamp: Utc::now(),
            provider: "anthropic".to_string(),
            model: "claude-sonnet-4".to_string(),
            input_tokens: 2000,
            output_tokens: 1000,
            cost_usd: 0.12,
            artifact_id: None,
            workflow_run_id: Some("wf-001".to_string()),
        });

        log.save(&log_path).unwrap();
        let loaded = CostLog::load(&log_path).unwrap();

        assert_eq!(loaded.records.len(), 1);
        assert_eq!(loaded.budget.daily_limit_usd, Some(5.0));
        assert_eq!(loaded.total_cost(), 0.12);
    }
}
