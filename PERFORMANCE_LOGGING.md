# Performance Logging System

This directory contains a comprehensive performance logging system for tracking audio transcription metrics.

## Files

- **`performance_logger.py`** - Main logging utility with classes and analysis functions
- **`performance_logs.jsonl`** - Log file (JSON Lines format, created automatically)

## Features

### 1. Performance Logger (`PerformanceLogger`)

Tracks timing metrics for audio processing pipeline:
- File size tracking (bytes and MB)
- Individual step timing
- Total processing time
- Success/failure status
- Percentage breakdown of time spent per step

### 2. Step Timer (`StepTimer`)

Context manager for timing individual blocks of code:

```python
with StepTimer(logger, "step_name", metadata="value"):
    # code to time
    pass
```

### 3. Analysis Tools

Built-in functions to analyze logs:
- `analyze_logs()`: Generate statistics (avg/min/max times, success rates)
- `print_analysis()`: Pretty-print report to console

## Usage

### Basic Usage

```python
from performance_logger import PerformanceLogger, StepTimer

# Initialize
logger = PerformanceLogger()
logger.start_session("audio.wav")

# Time a step
with StepTimer(logger, "transcription"):
    result = model.transcribe("audio.wav")

# End session
metrics = logger.end_session(success=True)
```

### Analyzing Logs

Run the script directly to analyze generated logs:

```bash
python performance_logger.py --last 10
```
