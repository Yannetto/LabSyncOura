# LabSyncApp - Wearable Health Summary Report

A health metrics analysis system using Linear Programming (LP) to evaluate and flag health metrics, including sleep debt calculation.

## Features

- **Health LP Model**: Linear Programming model for health metrics evaluation
- **Sleep Debt Calculation**: Tracks cumulative sleep debt over time periods
- **Report Generation**: Generates text and HTML health summary reports
- **Metric Flagging**: Automatically flags metrics outside acceptable ranges
- **Category Organization**: Organizes metrics by Sleep, Cardiovascular, and Activity

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python main.py
```

This will:
1. Initialize the LP model
2. Add sample health metrics and sleep data
3. Calculate sleep debt
4. Generate a health summary report (text and HTML)

## Components

### `health_lp.py`
- `HealthLP`: Main LP model class
- `HealthMetric`: Represents individual health metrics
- `SleepData`: Stores sleep information for a day
- Sleep debt calculation methods
- Health score optimization

### `report_generator.py`
- `ReportGenerator`: Generates formatted reports
- Text and HTML report formatting
- Category-based metric organization

### `main.py`
- Example usage and demonstration
- Sample data generation

## Sleep Debt

Sleep debt is calculated as the cumulative deficit of sleep hours below the target (default 8 hours per night). The LP model includes sleep debt as a flaggable metric when it exceeds acceptable thresholds.

## Report Format

Reports include:
- Patient information
- Date ranges (reporting period and reference period)
- Total flagged metrics count
- Breakdown by category (Sleep 😴, Cardiovascular ❤️, Activity 🏃)
- Sleep debt information
- Overall health score
