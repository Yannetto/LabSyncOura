"""
Linear Programming model for health metrics optimization and flagging.
Includes sleep debt calculation and evaluation.
"""
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class HealthMetric:
    """Represents a health metric with its value and thresholds."""
    name: str
    value: float
    lower_threshold: float
    upper_threshold: float
    category: str
    is_flagged: bool = False
    
    def check_flag(self) -> bool:
        """Check if metric is outside acceptable range."""
        self.is_flagged = (
            self.value < self.lower_threshold or 
            self.value > self.upper_threshold
        )
        return self.is_flagged


@dataclass
class SleepData:
    """Sleep data for a given day."""
    date: datetime
    sleep_duration_hours: float
    sleep_quality_score: float  # 0-100
    sleep_efficiency: float  # 0-100


class HealthLP:
    """
    Linear Programming model for health metrics evaluation.
    Handles flagging logic and sleep debt calculation.
    """
    
    def __init__(self, target_sleep_hours: float = 8.0):
        """
        Initialize the LP model.
        
        Args:
            target_sleep_hours: Target sleep hours per night (default 8.0)
        """
        self.target_sleep_hours = target_sleep_hours
        self.metrics: List[HealthMetric] = []
        self.sleep_history: List[SleepData] = []
        
    def add_metric(
        self, 
        name: str, 
        value: float, 
        lower_threshold: float, 
        upper_threshold: float,
        category: str
    ) -> HealthMetric:
        """Add a health metric to the model."""
        metric = HealthMetric(
            name=name,
            value=value,
            lower_threshold=lower_threshold,
            upper_threshold=upper_threshold,
            category=category
        )
        metric.check_flag()
        self.metrics.append(metric)
        return metric
    
    def add_sleep_data(
        self, 
        date: datetime, 
        sleep_duration_hours: float,
        sleep_quality_score: float = 70.0,
        sleep_efficiency: float = 85.0
    ):
        """Add sleep data for a given day."""
        sleep_data = SleepData(
            date=date,
            sleep_duration_hours=sleep_duration_hours,
            sleep_quality_score=sleep_quality_score,
            sleep_efficiency=sleep_efficiency
        )
        self.sleep_history.append(sleep_data)
        # Sort by date
        self.sleep_history.sort(key=lambda x: x.date)
    
    def calculate_sleep_debt(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> float:
        """
        Calculate cumulative sleep debt over a period.
        
        Sleep debt = sum of (target_sleep - actual_sleep) for each day
        Only counts days where actual < target (deficit).
        
        Args:
            start_date: Start of the period
            end_date: End of the period
            
        Returns:
            Total sleep debt in hours
        """
        total_debt = 0.0
        
        # Filter sleep data for the period
        period_sleep = [
            s for s in self.sleep_history 
            if start_date <= s.date <= end_date
        ]
        
        for sleep_data in period_sleep:
            deficit = self.target_sleep_hours - sleep_data.sleep_duration_hours
            if deficit > 0:
                total_debt += deficit
        
        return total_debt
    
    def get_sleep_debt_metric(
        self, 
        start_date: datetime, 
        end_date: datetime,
        max_acceptable_debt: float = 0.99  # hours - flag even 1 hour of debt (using 0.99 to ensure 1.0 is flagged)
    ) -> HealthMetric:
        """
        Get sleep debt as a health metric.
        
        Args:
            start_date: Start of the period
            end_date: End of the period
            max_acceptable_debt: Maximum acceptable sleep debt in hours (default: 0.99 to flag 1.0+ hours)
            
        Returns:
            HealthMetric for sleep debt
        """
        sleep_debt = self.calculate_sleep_debt(start_date, end_date)
        
        # Sleep debt should be minimized, so upper threshold is the max acceptable
        # Even 1 hour of sleep debt should be flagged (using 0.99 so that 1.0+ gets flagged)
        metric = HealthMetric(
            name="Sleep Debt",
            value=sleep_debt,
            lower_threshold=0.0,  # No debt is ideal
            upper_threshold=max_acceptable_debt,
            category="Sleep"
        )
        metric.check_flag()
        return metric
    
    def evaluate_all_metrics(self) -> Dict[str, List[HealthMetric]]:
        """
        Evaluate all metrics and return flagged metrics by category.
        
        Returns:
            Dictionary mapping category names to lists of flagged metrics
        """
        flagged_by_category: Dict[str, List[HealthMetric]] = {}
        
        for metric in self.metrics:
            if metric.is_flagged:
                if metric.category not in flagged_by_category:
                    flagged_by_category[metric.category] = []
                flagged_by_category[metric.category].append(metric)
        
        return flagged_by_category
    
    def get_total_flagged_count(self) -> int:
        """Return total number of flagged metrics."""
        return sum(1 for m in self.metrics if m.is_flagged)
    
    def optimize_health_score(self) -> float:
        """
        Calculate an optimized health score based on all metrics.
        Uses a weighted approach to combine metrics.
        
        Returns:
            Health score from 0-100 (higher is better)
        """
        if not self.metrics:
            return 100.0
        
        total_score = 0.0
        total_weight = 0.0
        
        # Weights for different categories
        category_weights = {
            "Sleep": 0.3,
            "Cardiovascular": 0.3,
            "Activity": 0.4
        }
        
        for metric in self.metrics:
            weight = category_weights.get(metric.category, 0.1)
            
            # Calculate normalized score (0-1) for this metric
            if metric.upper_threshold > metric.lower_threshold:
                # Normalize value to 0-1 range
                normalized = (metric.value - metric.lower_threshold) / (
                    metric.upper_threshold - metric.lower_threshold
                )
                # Clamp to [0, 1]
                normalized = max(0.0, min(1.0, normalized))
                # Convert to score (1.0 = perfect, 0.0 = worst)
                if metric.is_flagged:
                    score = 0.3 if normalized < 0.5 else 0.7
                else:
                    score = normalized
            else:
                score = 1.0 if not metric.is_flagged else 0.5
            
            total_score += score * weight
            total_weight += weight
        
        if total_weight == 0:
            return 100.0
        
        return (total_score / total_weight) * 100.0
    
    def reset(self):
        """Reset all metrics and sleep history."""
        self.metrics = []
        self.sleep_history = []
