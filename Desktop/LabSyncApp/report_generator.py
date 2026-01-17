"""
Wearable Health Summary Report Generator.
Generates reports with flagged metrics including sleep debt.
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from health_lp import HealthLP, HealthMetric


class ReportGenerator:
    """Generates wearable health summary reports."""
    
    # Emoji mapping for categories
    CATEGORY_EMOJIS = {
        "Sleep": "😴",
        "Cardiovascular": "❤️",
        "Activity": "🏃"
    }
    
    def __init__(self, lp_model: HealthLP):
        """
        Initialize report generator.
        
        Args:
            lp_model: HealthLP model instance
        """
        self.lp_model = lp_model
    
    def generate_report(
        self,
        patient_email: str,
        report_date: datetime,
        period_start: datetime,
        period_end: datetime,
        reference_start: Optional[datetime] = None,
        reference_end: Optional[datetime] = None
    ) -> Dict:
        """
        Generate a complete health summary report.
        
        Args:
            patient_email: Patient's email address
            report_date: Date when report is generated
            period_start: Start of the reporting period (e.g., 7 days)
            period_end: End of the reporting period
            reference_start: Start of reference period (e.g., 30 days)
            reference_end: End of reference period
            
        Returns:
            Dictionary containing report data
        """
        # Calculate period duration
        period_days = (period_end - period_start).days + 1
        
        # Add/update sleep debt metric to LP model
        sleep_debt_metric = self.lp_model.get_sleep_debt_metric(
            period_start, 
            period_end
        )
        
        # Check if sleep debt is already in metrics (update or add)
        existing_sleep_debt_idx = next(
            (i for i, m in enumerate(self.lp_model.metrics) if m.name == "Sleep Debt"),
            None
        )
        if existing_sleep_debt_idx is not None:
            # Update existing sleep debt metric
            self.lp_model.metrics[existing_sleep_debt_idx] = sleep_debt_metric
        else:
            # Add new sleep debt metric
            self.lp_model.metrics.append(sleep_debt_metric)
        
        # Get flagged metrics by category
        flagged_by_category = self.lp_model.evaluate_all_metrics()
        total_flagged = self.lp_model.get_total_flagged_count()
        
        # Calculate reference period info if provided
        reference_info = None
        if reference_start and reference_end:
            reference_days = (reference_end - reference_start).days + 1
            reference_info = {
                "start": reference_start,
                "end": reference_end,
                "days": reference_days
            }
        
        # Build report structure
        report = {
            "patient_email": patient_email,
            "report_date": report_date,
            "period": {
                "start": period_start,
                "end": period_end,
                "days": period_days
            },
            "reference_period": reference_info,
            "total_flagged": total_flagged,
            "flagged_by_category": flagged_by_category,
            "health_score": self.lp_model.optimize_health_score(),
            "sleep_debt": {
                "value": sleep_debt_metric.value,
                "is_flagged": sleep_debt_metric.is_flagged,
                "target": self.lp_model.target_sleep_hours
            }
        }
        
        return report
    
    def format_report_text(self, report: Dict) -> str:
        """
        Format report as human-readable text.
        
        Args:
            report: Report dictionary from generate_report()
            
        Returns:
            Formatted text report
        """
        lines = []
        lines.append("=" * 60)
        lines.append("WEARABLE HEALTH SUMMARY REPORT")
        lines.append("=" * 60)
        lines.append("")
        
        # Patient and date info
        lines.append(f"Patient email: {report['patient_email']}")
        lines.append(f"Report date: {report['report_date'].strftime('%d/%m/%Y')}")
        lines.append("")
        
        # Period info
        period = report['period']
        lines.append(
            f"{period['days']} Days values: "
            f"{period['start'].strftime('%b %d, %Y')} - "
            f"{period['end'].strftime('%b %d, %Y')} "
            f"({period['days']} days)"
        )
        
        # Reference period info
        if report.get('reference_period'):
            ref = report['reference_period']
            lines.append(
                f"30 Days Reference Range: "
                f"{ref['start'].strftime('%b %d, %Y')} - "
                f"{ref['end'].strftime('%b %d, %Y')} "
                f"({ref['days']} days)"
            )
        
        lines.append("")
        lines.append("-" * 60)
        lines.append("")
        
        # Flagged metrics
        lines.append("FLAGGED METRICS")
        lines.append("")
        lines.append(f"Total flagged metrics: {report['total_flagged']}")
        lines.append("")
        
        # Group by category
        flagged_by_category = report['flagged_by_category']
        for category, metrics in flagged_by_category.items():
            emoji = self.CATEGORY_EMOJIS.get(category, "📊")
            count = len(metrics)
            lines.append(f"{emoji} {count} {category}")
            
            # List individual flagged metrics
            for metric in metrics:
                lines.append(f"  - {metric.name}: {metric.value:.2f} "
                           f"(Range: {metric.lower_threshold:.2f} - "
                           f"{metric.upper_threshold:.2f})")
        
        lines.append("")
        lines.append("-" * 60)
        lines.append("")
        
        # Sleep debt info
        sleep_debt = report.get('sleep_debt', {})
        if sleep_debt:
            lines.append("SLEEP DEBT")
            lines.append("")
            lines.append(f"Total sleep debt: {sleep_debt['value']:.2f} hours")
            lines.append(f"Target sleep: {sleep_debt['target']:.2f} hours/night")
            lines.append(f"Status: {'⚠️ FLAGGED' if sleep_debt['is_flagged'] else '✅ Normal'}")
            lines.append("")
        
        # Health score
        lines.append("-" * 60)
        lines.append(f"Overall Health Score: {report['health_score']:.1f}/100")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def format_report_html(self, report: Dict) -> str:
        """
        Format report as HTML (similar to the image shown).
        
        Args:
            report: Report dictionary from generate_report()
            
        Returns:
            HTML formatted report
        """
        period = report['period']
        ref = report.get('reference_period')
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Wearable Health Summary Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background-color: #ffffff;
        }}
        h1 {{
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 30px;
        }}
        .info-section {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }}
        .info-column {{
            flex: 1;
        }}
        .info-item {{
            margin-bottom: 10px;
        }}
        .flagged-section {{
            margin-top: 30px;
        }}
        .flagged-count {{
            font-size: 32px;
            font-weight: bold;
            margin: 20px 0;
        }}
        .category-group {{
            margin: 15px 0;
            font-size: 16px;
        }}
        .category-emoji {{
            font-size: 20px;
            margin-right: 8px;
        }}
        hr {{
            border: none;
            border-top: 1px solid #ddd;
            margin: 20px 0;
        }}
        .sleep-debt {{
            margin-top: 20px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }}
        .health-score {{
            margin-top: 20px;
            font-size: 18px;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <h1>Wearable Health Summary Report</h1>
    
    <div class="info-section">
        <div class="info-column">
            <div class="info-item">Patient email: {report['patient_email']}</div>
            <div class="info-item">
                {period['days']} Days values: {period['start'].strftime('%b %d, %Y')} - {period['end'].strftime('%b %d, %Y')} ({period['days']} days)
            </div>
        </div>
        <div class="info-column">
            <div class="info-item">Report date: {report['report_date'].strftime('%d/%m/%Y')}</div>
"""
        
        if ref:
            html += f"""
            <div class="info-item">
                30 Days Reference Range: {ref['start'].strftime('%b %d, %Y')} - {ref['end'].strftime('%b %d, %Y')} ({ref['days']} days)
            </div>
"""
        
        html += """
        </div>
    </div>
    
    <div class="flagged-section">
        <h2>Flagged Metrics</h2>
        <div class="flagged-count">{}</div>
""".format(report['total_flagged'])
        
        # Category breakdown
        flagged_by_category = report['flagged_by_category']
        for category, metrics in flagged_by_category.items():
            emoji = self.CATEGORY_EMOJIS.get(category, "📊")
            count = len(metrics)
            html += f"""
        <div class="category-group">
            <span class="category-emoji">{emoji}</span>
            <span>{count} {category}</span>
        </div>
"""
        
        # Sleep debt section
        sleep_debt = report.get('sleep_debt', {})
        if sleep_debt:
            status_emoji = "⚠️" if sleep_debt['is_flagged'] else "✅"
            html += f"""
        <hr>
        <div class="sleep-debt">
            <h3>Sleep Debt</h3>
            <p><strong>Total sleep debt:</strong> {sleep_debt['value']:.2f} hours</p>
            <p><strong>Target sleep:</strong> {sleep_debt['target']:.2f} hours/night</p>
            <p><strong>Status:</strong> {status_emoji} {'FLAGGED' if sleep_debt['is_flagged'] else 'Normal'}</p>
        </div>
"""
        
        html += f"""
        <hr>
        <div class="health-score">
            Overall Health Score: {report['health_score']:.1f}/100
        </div>
    </div>
</body>
</html>
"""
        
        return html
