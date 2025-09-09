#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class BaseAgent {
  constructor(name, type, capabilities = []) {
    this.name = name;
    this.type = type;
    this.id = `${type}_${Date.now()}`;
    this.capabilities = capabilities;
    this.status = 'idle';
    this.tasksCompleted = 0;
    this.currentTask = null;
    this.taskQueue = [];
    this.logFile = path.join(__dirname, '..', 'logs', `${this.name}.log`);
    this.taskFile = path.join(__dirname, '..', 'data', `${this.name}_tasks.json`);
    this.modelConfigFile = path.join(__dirname, '..', 'config', 'models.json');
    this.modelConfig = this.loadModelConfig();
  }

  loadModelConfig() {
    try {
      const config = JSON.parse(fs.readFileSync(this.modelConfigFile, 'utf8'));
      return config.models.agents;
    } catch (error) {
      return {
        model: 'claude-sonnet-4-20241022',
        name: 'Claude Sonnet 4',
        provider: 'anthropic'
      };
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Log write error:', error.message);
    }
  }

  initialize() {
    this.log(`Agent ${this.name} (${this.type}) initializing...`);
    this.log(`Model: ${this.modelConfig.name} (${this.modelConfig.model})`);
    this.log(`Capabilities: ${this.capabilities.join(', ')}`);
    this.status = 'ready';
    this.loadTasks();
    this.log('Agent ready and waiting for tasks');
  }

  loadTasks() {
    try {
      if (fs.existsSync(this.taskFile)) {
        const tasks = JSON.parse(fs.readFileSync(this.taskFile, 'utf8'));
        this.taskQueue = tasks.filter(t => t.status === 'pending');
        this.log(`Loaded ${this.taskQueue.length} pending tasks`);
      }
    } catch (error) {
      this.log('No previous tasks found', 'info');
    }
  }

  saveTasks() {
    try {
      const allTasks = [...this.taskQueue];
      if (this.currentTask) allTasks.push(this.currentTask);
      fs.writeFileSync(this.taskFile, JSON.stringify(allTasks, null, 2));
    } catch (error) {
      this.log(`Failed to save tasks: ${error.message}`, 'error');
    }
  }

  receiveTask(task) {
    const taskWithMeta = {
      ...task,
      id: `task_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      status: 'pending'
    };
    
    this.taskQueue.push(taskWithMeta);
    this.log(`Task received: ${task.name} (Priority: ${task.priority || 'normal'})`);
    this.saveTasks();
    
    if (this.status === 'ready') {
      this.processNextTask();
    }
    
    return taskWithMeta.id;
  }

  async processNextTask() {
    if (this.taskQueue.length === 0) {
      this.status = 'ready';
      this.log('No more tasks in queue');
      return;
    }

    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });

    this.currentTask = this.taskQueue.shift();
    this.status = 'working';
    this.log(`Starting task: ${this.currentTask.name}`);

    try {
      await this.executeTask(this.currentTask);
      this.currentTask.status = 'completed';
      this.currentTask.completedAt = new Date().toISOString();
      this.tasksCompleted++;
      this.log(`Task completed: ${this.currentTask.name}`, 'success');
    } catch (error) {
      this.currentTask.status = 'failed';
      this.currentTask.error = error.message;
      this.log(`Task failed: ${this.currentTask.name} - ${error.message}`, 'error');
    }

    this.saveTasks();
    this.currentTask = null;
    
    if (this.taskQueue.length > 0) {
      setTimeout(() => this.processNextTask(), 1000);
    } else {
      this.status = 'ready';
    }
  }

  async executeTask(task) {
    this.log(`Executing: ${task.command || task.name} [Model: ${this.modelConfig.name}]`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { 
      success: true, 
      result: 'Task executed by base agent',
      model: this.modelConfig.model,
      modelName: this.modelConfig.name
    };
  }

  getStatus() {
    return {
      name: this.name,
      type: this.type,
      id: this.id,
      status: this.status,
      currentTask: this.currentTask?.name || null,
      queueLength: this.taskQueue.length,
      tasksCompleted: this.tasksCompleted,
      capabilities: this.capabilities,
      model: this.modelConfig.model,
      modelName: this.modelConfig.name
    };
  }

  shutdown() {
    this.log('Agent shutting down...');
    this.saveTasks();
    this.status = 'offline';
    process.exit(0);
  }
}

module.exports = BaseAgent;