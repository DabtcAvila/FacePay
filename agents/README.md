# Agent System

## Architecture

The orchestrator manages a fleet of specialized agents:

### Available Agents

1. **DataProcessor Agent**
   - JSON parsing and transformation
   - Data aggregation
   - Report generation
   - File analysis

2. **FileManager Agent**
   - File operations
   - Backup creation
   - Directory organization
   - Cleanup operations
   - File monitoring

3. **SystemMonitor Agent**
   - System health monitoring
   - Performance tracking
   - Alert generation
   - Resource monitoring
   - Metrics collection

## How to Use

### 1. Start the Controller
```bash
cd agents
node orchestrator_controller.js
```

### 2. Launch Agents (in separate terminals)
```bash
# Terminal 1 - Data Processor
node agents/data_processor.js

# Terminal 2 - File Manager
node agents/file_manager.js

# Terminal 3 - System Monitor
node agents/monitor_agent.js
```

### 3. Controller Commands
- `status` - View queue and agent status
- `create` - Create example tasks
- `launch` - Show agent launch commands
- `quit` - Exit controller

## Task Assignment

Tasks are automatically assigned based on command keywords:
- Files/backup tasks → FileManager
- Monitor/health tasks → SystemMonitor
- Data/process tasks → DataProcessor

## Communication

Agents communicate through:
- **Task Queue** (`task_queue.json`) - Central task distribution
- **Agent Task Files** (`data/*_tasks.json`) - Agent-specific task lists
- **Logs** (`logs/*.log`) - Operation logs
- **Alerts** (`logs/alerts.json`) - System alerts

## Task Structure
```json
{
  "id": "task_123",
  "name": "Task Name",
  "command": "specific_command",
  "params": {},
  "priority": "high|normal|low",
  "targetAgent": "agent_type"
}
```

## Agent Status

Each agent provides real-time status including:
- Current state (idle/ready/working)
- Active task
- Queue length
- Tasks completed
- Capabilities