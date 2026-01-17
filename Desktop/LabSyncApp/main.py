"""
Main script to demonstrate the health LP model and report generation.
"""
from datetime import datetime, timedelta
from health_lp import HealthLP
from report_generator import ReportGenerator


def main():
    """Example usage of the health LP and report generator."""
    
    # Initialize LP model
    lp = HealthLP(target_sleep_hours=8.0)
    
    # Set up date ranges
    today = datetime(2026, 1, 17)
    period_start = datetime(2026, 1, 1)
    period_end = datetime(2026, 1, 7)
    reference_start = datetime(2025, 12, 2)
    reference_end = datetime(2026, 1, 1)
    
    # Add sleep data for the period (create sleep debt - even just 1 hour total)
    for i in range(7):
        date = period_start + timedelta(days=i)
        # Create minimal sleep debt - just slightly under target each day
        # This will create about 1.0 hour total debt over 7 days (should be flagged)
        sleep_hours = 7.857  # Creates exactly 1.0 hour total debt
        lp.add_sleep_data(
            date=date,
            sleep_duration_hours=sleep_hours,
            sleep_quality_score=70.0 + (i % 2) * 10,
            sleep_efficiency=85.0
        )
    
    # Add other health metrics
    lp.add_metric("Resting Heart Rate", 72, 60, 100, "Cardiovascular")
    lp.add_metric("Max Heart Rate", 185, 150, 200, "Cardiovascular")
    lp.add_metric("Steps", 8500, 10000, 20000, "Activity")
    lp.add_metric("Active Minutes", 25, 30, 120, "Activity")
    lp.add_metric("Calories Burned", 2100, 2000, 3000, "Activity")
    lp.add_metric("Sleep Duration", 6.8, 7.0, 9.0, "Sleep")
    lp.add_metric("Sleep Quality", 65, 70, 100, "Sleep")
    lp.add_metric("Distance", 5.2, 6.0, 15.0, "Activity")
    lp.add_metric("VO2 Max", 42, 40, 60, "Cardiovascular")
    lp.add_metric("Exercise Duration", 20, 30, 90, "Activity")
    
    # Generate report
    generator = ReportGenerator(lp)
    report = generator.generate_report(
        patient_email="example@email.com",
        report_date=today,
        period_start=period_start,
        period_end=period_end,
        reference_start=reference_start,
        reference_end=reference_end
    )
    
    # Print text report
    print(generator.format_report_text(report))
    print("\n" + "="*60 + "\n")
    
    # Save HTML report
    html_report = generator.format_report_html(report)
    with open("health_report.html", "w") as f:
        f.write(html_report)
    print("HTML report saved to health_report.html")
    
    # Verify LP is working
    print("\n" + "="*60)
    print("LP MODEL VERIFICATION")
    print("="*60)
    print(f"Total metrics: {len(lp.metrics)}")
    print(f"Total flagged: {lp.get_total_flagged_count()}")
    print(f"Health score: {lp.optimize_health_score():.2f}")
    
    # Show sleep debt calculation
    sleep_debt = lp.calculate_sleep_debt(period_start, period_end)
    print(f"\nSleep debt calculation: {sleep_debt:.2f} hours")
    print(f"Target sleep per night: {lp.target_sleep_hours} hours")
    
    # Show flagged metrics by category
    flagged = lp.evaluate_all_metrics()
    print("\nFlagged metrics breakdown:")
    for category, metrics in flagged.items():
        print(f"  {category}: {len(metrics)} metrics")
        for metric in metrics:
            print(f"    - {metric.name}: {metric.value:.2f}")


if __name__ == "__main__":
    main()
