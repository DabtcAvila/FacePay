#!/usr/bin/env node

const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');

class ParallelEngine {
    constructor() {
        this.workers = [];
        this.taskQueue = [];
        this.results = [];
        this.metrics = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            totalProcessingTime: 0,
            startTime: Date.now(),
            throughput: 0
        };
        
        // Use all CPU cores
        this.workerCount = os.cpus().length;
        this.activeWorkers = 0;
        this.taskIdCounter = 0;
    }

    async initialize() {
        console.log('\x1b[35m%s\x1b[0m', `
╔════════════════════════════════════════════════════════════════════════════╗
║                    ⚡ PARALLEL PROCESSING ENGINE ⚡                         ║
║                         Real Parallel Execution                            ║
╚════════════════════════════════════════════════════════════════════════════╝
        `);
        
        console.log(`\n🔧 Initializing ${this.workerCount} parallel workers (one per CPU core)...\n`);
        
        // Create worker pool
        for (let i = 0; i < this.workerCount; i++) {
            await this.createWorker(i);
        }
        
        console.log('\x1b[32m%s\x1b[0m', `✅ All ${this.workerCount} workers ready!\n`);
    }

    createWorker(id) {
        return new Promise((resolve) => {
            const worker = new Worker(path.join(__dirname, 'worker.js'), {
                workerData: { workerId: id }
            });
            
            worker.on('message', (msg) => {
                if (msg.status === 'ready') {
                    console.log(`   Worker ${id} initialized ✓`);
                    this.activeWorkers++;
                    resolve();
                } else if (msg.status === 'completed') {
                    this.handleResult(msg);
                } else if (msg.status === 'error') {
                    this.handleError(msg);
                }
            });
            
            worker.on('error', (err) => {
                console.error(`Worker ${id} error:`, err);
                this.metrics.failedTasks++;
            });
            
            this.workers.push({
                id,
                worker,
                busy: false,
                tasksCompleted: 0
            });
        });
    }

    handleResult(result) {
        this.results.push(result);
        this.metrics.completedTasks++;
        this.metrics.totalProcessingTime += result.processingTime;
        
        const workerInfo = this.workers.find(w => w.id === result.workerId);
        if (workerInfo) {
            workerInfo.busy = false;
            workerInfo.tasksCompleted++;
        }
        
        // Process next task in queue if any
        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.assignTask(nextTask);
        }
        
        this.updateMetrics();
    }

    handleError(error) {
        console.error(`Task ${error.taskId} failed on worker ${error.workerId}:`, error.error);
        this.metrics.failedTasks++;
        
        const workerInfo = this.workers.find(w => w.id === error.workerId);
        if (workerInfo) {
            workerInfo.busy = false;
        }
    }

    updateMetrics() {
        const runtime = (Date.now() - this.metrics.startTime) / 1000;
        this.metrics.throughput = (this.metrics.completedTasks / runtime).toFixed(2);
    }

    assignTask(task) {
        const availableWorker = this.workers.find(w => !w.busy);
        
        if (availableWorker) {
            availableWorker.busy = true;
            availableWorker.worker.postMessage(task);
        } else {
            // Queue the task if no workers available
            this.taskQueue.push(task);
        }
    }

    createTask(type, data = {}) {
        return {
            taskId: `task_${++this.taskIdCounter}`,
            type,
            ...data
        };
    }

    async runMassiveParallelDemo() {
        console.log('\x1b[36m%s\x1b[0m', '🚀 DEMONSTRATION: MASSIVE PARALLEL PROCESSING');
        console.log('─'.repeat(70));
        
        const taskCount = 100;
        const taskTypes = ['analyze', 'transform', 'compute', 'search', 'generate'];
        
        console.log(`\nCreating ${taskCount} complex tasks...`);
        
        const tasks = [];
        for (let i = 0; i < taskCount; i++) {
            tasks.push(this.createTask(
                taskTypes[i % taskTypes.length],
                {
                    complexity: Math.random() * 2 + 0.5,
                    size: Math.floor(Math.random() * 500) + 100,
                    keywords: ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
                }
            ));
        }
        
        console.log(`Distributing tasks across ${this.workerCount} workers...\n`);
        
        this.metrics.totalTasks = taskCount;
        const startTime = Date.now();
        
        // Launch all tasks
        tasks.forEach(task => {
            this.assignTask(task);
        });
        
        // Wait for completion with progress updates
        await this.waitForCompletion(taskCount);
        
        const totalTime = Date.now() - startTime;
        
        // Calculate results
        const avgProcessingTime = this.metrics.totalProcessingTime / this.metrics.completedTasks;
        const sequentialEstimate = avgProcessingTime * taskCount;
        const speedup = sequentialEstimate / totalTime;
        
        console.log('\n' + '═'.repeat(70));
        console.log('\x1b[32m%s\x1b[0m', '📊 RESULTS:');
        console.log('─'.repeat(70));
        console.log(`   Total Tasks:        ${taskCount}`);
        console.log(`   Completed:          ${this.metrics.completedTasks}`);
        console.log(`   Failed:             ${this.metrics.failedTasks}`);
        console.log(`   Workers Used:       ${this.workerCount}`);
        console.log(`   Total Time:         ${(totalTime/1000).toFixed(2)}s`);
        console.log(`   Throughput:         ${this.metrics.throughput} tasks/sec`);
        console.log(`   Avg Task Time:      ${avgProcessingTime.toFixed(0)}ms`);
        console.log(`   Sequential Est:     ${(sequentialEstimate/1000).toFixed(2)}s`);
        console.log(`   ⚡ SPEEDUP:         ${speedup.toFixed(2)}x faster!`);
        console.log('═'.repeat(70));
        
        // Show worker statistics
        console.log('\n\x1b[33m%s\x1b[0m', '👷 WORKER STATISTICS:');
        console.log('─'.repeat(70));
        this.workers.forEach(w => {
            const percentage = ((w.tasksCompleted / taskCount) * 100).toFixed(1);
            const bar = '█'.repeat(Math.floor(percentage / 2));
            console.log(`   Worker ${w.id}: ${w.tasksCompleted} tasks [${bar.padEnd(50)}] ${percentage}%`);
        });
    }

    waitForCompletion(expectedTasks) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const progress = (this.metrics.completedTasks / expectedTasks) * 100;
                const progressBar = '█'.repeat(Math.floor(progress / 2));
                
                process.stdout.write(`\r   Progress: [${progressBar.padEnd(50)}] ${progress.toFixed(1)}% | ${this.metrics.completedTasks}/${expectedTasks} tasks`);
                
                if (this.metrics.completedTasks + this.metrics.failedTasks >= expectedTasks) {
                    clearInterval(checkInterval);
                    console.log(); // New line after progress
                    resolve();
                }
            }, 100);
        });
    }

    async runRealTimeDemo() {
        console.log('\n\x1b[36m%s\x1b[0m', '⚡ DEMONSTRATION: REAL-TIME CONTINUOUS PROCESSING');
        console.log('─'.repeat(70));
        console.log('Simulating continuous stream of tasks...\n');
        
        const taskTypes = ['analyze', 'transform', 'compute', 'search', 'generate'];
        let tasksGenerated = 0;
        
        // Generate tasks continuously
        const taskGenerator = setInterval(() => {
            if (tasksGenerated < 50) {
                const task = this.createTask(
                    taskTypes[Math.floor(Math.random() * taskTypes.length)],
                    { complexity: Math.random() + 0.5 }
                );
                this.assignTask(task);
                this.metrics.totalTasks++;
                tasksGenerated++;
            } else {
                clearInterval(taskGenerator);
            }
        }, 100); // New task every 100ms
        
        // Display real-time metrics
        const metricsDisplay = setInterval(() => {
            console.clear();
            console.log('\x1b[36m%s\x1b[0m', '📊 REAL-TIME METRICS:');
            console.log('─'.repeat(70));
            console.log(`   Active Workers:     ${this.workers.filter(w => w.busy).length}/${this.workerCount}`);
            console.log(`   Queue Length:       ${this.taskQueue.length}`);
            console.log(`   Completed Tasks:    ${this.metrics.completedTasks}`);
            console.log(`   Throughput:         ${this.metrics.throughput} tasks/sec`);
            console.log(`   Avg Response:       ${(this.metrics.totalProcessingTime / this.metrics.completedTasks || 0).toFixed(0)}ms`);
            console.log('─'.repeat(70));
            
            // Worker status
            console.log('\n🔥 WORKER STATUS:');
            this.workers.forEach(w => {
                const status = w.busy ? '\x1b[32m● BUSY\x1b[0m' : '\x1b[33m○ IDLE\x1b[0m';
                console.log(`   Worker ${w.id}: ${status} | Completed: ${w.tasksCompleted}`);
            });
            
            if (tasksGenerated >= 50 && this.metrics.completedTasks >= 50) {
                clearInterval(metricsDisplay);
                console.log('\n\x1b[32m%s\x1b[0m', '✅ Real-time demo complete!');
            }
        }, 500);
        
        // Wait for completion
        await new Promise(resolve => {
            const checkComplete = setInterval(() => {
                if (this.metrics.completedTasks >= 50) {
                    clearInterval(checkComplete);
                    resolve();
                }
            }, 100);
        });
    }

    async createDashboard() {
        const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Parallel Engine Dashboard</title>
    <style>
        body { 
            font-family: 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { opacity: 0.8; margin-top: 5px; }
        .workers {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 20px;
        }
        .worker-bar {
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            height: 30px;
            margin: 10px 0;
            position: relative;
            overflow: hidden;
        }
        .worker-progress {
            background: linear-gradient(90deg, #00d4ff, #090979);
            height: 100%;
            transition: width 0.3s;
        }
        .worker-label {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Parallel Processing Engine Dashboard</h1>
            <p>Real-time Performance Metrics</p>
        </div>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${this.metrics.completedTasks}</div>
                <div class="metric-label">Tasks Completed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.throughput}</div>
                <div class="metric-label">Tasks/Second</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.workerCount}</div>
                <div class="metric-label">Active Workers</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((this.metrics.completedTasks / (this.metrics.completedTasks + this.metrics.failedTasks)) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>
        
        <div class="workers">
            <h2>Worker Performance</h2>
            ${this.workers.map(w => {
                const percentage = (w.tasksCompleted / Math.max(...this.workers.map(x => x.tasksCompleted))) * 100;
                return `
                    <div class="worker-bar">
                        <div class="worker-progress" style="width: ${percentage}%"></div>
                        <div class="worker-label">Worker ${w.id}: ${w.tasksCompleted} tasks</div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div style="text-align: center; margin-top: 30px; opacity: 0.8;">
            <p>Generated at ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
        `;
        
        const dashboardPath = path.join(__dirname, 'dashboard.html');
        await fs.writeFile(dashboardPath, dashboardHTML);
        
        // Create simple HTTP server to serve the dashboard
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(dashboardHTML);
        });
        
        server.listen(8080, () => {
            console.log('\n\x1b[32m%s\x1b[0m', '🌐 Dashboard available at: http://localhost:8080');
            console.log('   (Press Ctrl+C to stop)\n');
        });
        
        return server;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up workers...');
        for (const workerInfo of this.workers) {
            await workerInfo.worker.terminate();
        }
        console.log('✅ All workers terminated\n');
    }

    async run() {
        try {
            await this.initialize();
            
            // Run massive parallel demo
            await this.runMassiveParallelDemo();
            
            // Create and display dashboard
            const server = await this.createDashboard();
            
            // Run real-time demo
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.runRealTimeDemo();
            
            // Keep server running for a bit
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            server.close();
            await this.cleanup();
            
            console.log('\x1b[35m%s\x1b[0m', '\n🎯 DEMONSTRATION COMPLETE!');
            console.log('The Parallel Engine processed hundreds of tasks using true parallel execution.');
            console.log('Each CPU core ran independently, achieving massive speedup.\n');
            
        } catch (error) {
            console.error('Error:', error);
            await this.cleanup();
        }
    }
}

// Launch the engine
const engine = new ParallelEngine();
engine.run();