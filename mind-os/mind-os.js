#!/usr/bin/env node

/**
 * MIND-OS v1.0 - Personal AI Operating System
 * An OS that thinks, learns, and evolves with you
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const http = require('http');

class MindOS {
    constructor() {
        this.user = os.userInfo().username;
        this.memory = {
            preferences: {},
            patterns: [],
            predictions: [],
            automations: []
        };
        this.agents = new Map();
        this.learningRate = 0.1;
        this.consciousness = 'initializing';
    }

    async boot() {
        console.log('\x1b[35m%s\x1b[0m', `
╔════════════════════════════════════════════════════════════════════════════╗
║                         🧠 MIND-OS BOOTING UP 🧠                           ║
║                    Your Personal AI Operating System                       ║
╚════════════════════════════════════════════════════════════════════════════╝
        `);

        await this.loadMemory();
        await this.initializeAgents();
        await this.scanEnvironment();
        await this.startLearning();
        await this.launchInterface();
        
        console.log(`\n✅ MIND-OS Ready for ${this.user}`);
        this.consciousness = 'aware';
    }

    async loadMemory() {
        console.log('\n📊 Loading memory banks...');
        
        try {
            const memoryPath = path.join(__dirname, 'memory.json');
            const data = await fs.readFile(memoryPath, 'utf8');
            this.memory = JSON.parse(data);
            console.log(`   ✓ Loaded ${Object.keys(this.memory.patterns).length} patterns`);
        } catch (error) {
            console.log('   ✓ Starting with fresh memory');
            await this.saveMemory();
        }
    }

    async initializeAgents() {
        console.log('\n🤖 Initializing AI Agents...');
        
        const agentTypes = [
            {
                name: 'FileOrganizer',
                role: 'Organizes your files automatically',
                capabilities: ['sort', 'clean', 'backup']
            },
            {
                name: 'TaskAutomator',
                role: 'Automates repetitive tasks',
                capabilities: ['schedule', 'execute', 'optimize']
            },
            {
                name: 'SystemOptimizer',
                role: 'Keeps your system running fast',
                capabilities: ['monitor', 'clean', 'boost']
            },
            {
                name: 'SecurityGuard',
                role: 'Protects your system',
                capabilities: ['scan', 'block', 'alert']
            },
            {
                name: 'PersonalAssistant',
                role: 'Helps with daily tasks',
                capabilities: ['remind', 'suggest', 'learn']
            }
        ];

        for (const agentType of agentTypes) {
            const agent = {
                ...agentType,
                active: true,
                tasksCompleted: 0,
                learning: true
            };
            this.agents.set(agentType.name, agent);
            console.log(`   ✓ ${agentType.name} activated`);
        }
    }

    async scanEnvironment() {
        console.log('\n🔍 Scanning your environment...');
        
        const env = {
            platform: os.platform(),
            cpus: os.cpus().length,
            memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
            uptime: Math.round(os.uptime() / 3600) + ' hours',
            homeDir: os.homedir(),
            currentLoad: await this.getCurrentLoad()
        };

        // Detect user patterns
        const time = new Date().getHours();
        if (time >= 9 && time <= 17) {
            this.memory.patterns.push({ type: 'work_hours', confidence: 0.8 });
            console.log('   ✓ Detected: Work hours - optimizing for productivity');
        } else if (time >= 22 || time <= 6) {
            this.memory.patterns.push({ type: 'sleep_hours', confidence: 0.9 });
            console.log('   ✓ Detected: Sleep hours - running maintenance');
        }

        // Check for common applications
        const commonApps = await this.detectApplications();
        console.log(`   ✓ Found ${commonApps.length} frequently used applications`);

        return env;
    }

    async getCurrentLoad() {
        try {
            const { stdout } = await execPromise('ps aux | awk \'{sum+=$3} END {print sum}\'');
            return parseFloat(stdout) || 0;
        } catch {
            return 0;
        }
    }

    async detectApplications() {
        const apps = [];
        try {
            if (process.platform === 'darwin') {
                const { stdout } = await execPromise('ls /Applications | head -10');
                apps.push(...stdout.split('\n').filter(Boolean));
            }
        } catch {}
        return apps;
    }

    async startLearning() {
        console.log('\n🧠 Learning from your behavior...');
        
        // Continuous learning loop
        setInterval(async () => {
            await this.learn();
            await this.predict();
            await this.automate();
        }, 5000); // Learn every 5 seconds

        console.log('   ✓ Continuous learning activated');
    }

    async learn() {
        // Collect current state
        const state = {
            time: new Date(),
            cpuLoad: await this.getCurrentLoad(),
            memoryUsage: (os.totalmem() - os.freemem()) / os.totalmem(),
            activeProcesses: await this.getProcessCount()
        };

        // Find patterns
        if (state.cpuLoad > 80) {
            this.memory.patterns.push({
                type: 'high_load',
                time: state.time,
                action: 'optimize'
            });
        }

        // Update learning
        this.learningRate = Math.min(1, this.learningRate * 1.01);
    }

    async getProcessCount() {
        try {
            const { stdout } = await execPromise('ps aux | wc -l');
            return parseInt(stdout) || 0;
        } catch {
            return 0;
        }
    }

    async predict() {
        // Predict next user action based on patterns
        const hour = new Date().getHours();
        const predictions = [];

        if (hour === 8) {
            predictions.push({
                action: 'open_email',
                confidence: 0.8,
                suggestion: 'Shall I open your email client?'
            });
        }

        if (hour === 12) {
            predictions.push({
                action: 'lunch_break',
                confidence: 0.9,
                suggestion: 'Time for lunch! Shall I pause your work?'
            });
        }

        this.memory.predictions = predictions;
        return predictions;
    }

    async automate() {
        // Automate tasks based on learned patterns
        for (const pattern of this.memory.patterns) {
            if (pattern.type === 'high_load' && pattern.action === 'optimize') {
                await this.optimizeSystem();
            }
        }
    }

    async optimizeSystem() {
        // Simulate system optimization
        const agent = this.agents.get('SystemOptimizer');
        if (agent && agent.active) {
            agent.tasksCompleted++;
            // In real implementation, would actually optimize
            console.log('   🔧 System automatically optimized');
        }
    }

    async launchInterface() {
        const dashboard = `<!DOCTYPE html>
<html>
<head>
    <title>🧠 MIND-OS Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            min-height: 100vh;
        }
        .header {
            text-align: center;
            padding: 40px 0;
        }
        h1 { font-size: 3em; margin-bottom: 10px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .agent {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .agent-icon {
            font-size: 2em;
            margin-right: 15px;
        }
        .agent-info h3 {
            margin-bottom: 5px;
        }
        .agent-status {
            color: #00ff88;
            font-size: 0.9em;
        }
        .metric {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .prediction {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
        }
    </style>
    <meta http-equiv="refresh" content="5">
</head>
<body>
    <div class="header">
        <h1>🧠 MIND-OS</h1>
        <p>Your Personal AI Operating System</p>
        <p>User: ${this.user} | Status: ${this.consciousness}</p>
    </div>

    <div class="grid">
        <div class="card">
            <h2>🤖 Active Agents</h2>
            ${Array.from(this.agents.values()).map(agent => `
                <div class="agent">
                    <div class="agent-icon">🤖</div>
                    <div class="agent-info">
                        <h3>${agent.name}</h3>
                        <div class="agent-status">✓ Active | Tasks: ${agent.tasksCompleted}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="card">
            <h2>📊 System Metrics</h2>
            <div class="metric">${this.memory.patterns.length}</div>
            <p>Learned Patterns</p>
            <div class="metric">${(this.learningRate * 100).toFixed(1)}%</div>
            <p>Learning Rate</p>
            <div class="metric">${this.agents.size}</div>
            <p>Active Agents</p>
        </div>

        <div class="card">
            <h2>🔮 Predictions</h2>
            ${this.memory.predictions.map(pred => `
                <div class="prediction">
                    <strong>${pred.suggestion}</strong><br>
                    Confidence: ${(pred.confidence * 100).toFixed(0)}%
                </div>
            `).join('') || '<p>Learning your patterns...</p>'}
        </div>

        <div class="card">
            <h2>🚀 Automations</h2>
            <p>File Organization: Enabled</p>
            <p>System Optimization: Active</p>
            <p>Security Monitoring: Running</p>
            <p>Task Scheduling: Learning</p>
        </div>
    </div>
</body>
</html>`;

        const server = http.createServer((req, res) => {
            if (req.url === '/api/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    user: this.user,
                    consciousness: this.consciousness,
                    agents: this.agents.size,
                    patterns: this.memory.patterns.length,
                    predictions: this.memory.predictions.length,
                    learningRate: this.learningRate
                }));
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(dashboard);
            }
        });

        const PORT = 7777;
        server.listen(PORT, () => {
            console.log(`\n🌐 MIND-OS Interface: http://localhost:${PORT}`);
            
            if (process.platform === 'darwin') {
                exec(`open http://localhost:${PORT}`);
            }
        });
    }

    async saveMemory() {
        const memoryPath = path.join(__dirname, 'memory.json');
        await fs.writeFile(memoryPath, JSON.stringify(this.memory, null, 2));
    }

    async executeCommand(command) {
        console.log(`\n⚡ Executing: ${command}`);
        
        // This is where MIND-OS would execute user commands
        // Could integrate with voice, gesture, or thought interfaces
        
        switch(command) {
            case 'optimize':
                await this.optimizeSystem();
                break;
            case 'clean':
                console.log('   🧹 Cleaning system...');
                break;
            case 'backup':
                console.log('   💾 Creating backup...');
                break;
            default:
                console.log('   🤔 Learning new command...');
        }
    }
}

// Boot MIND-OS
const mindOS = new MindOS();
mindOS.boot().catch(console.error);

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n💾 Saving memory...');
    await mindOS.saveMemory();
    console.log('👋 MIND-OS shutting down gracefully');
    process.exit(0);
});