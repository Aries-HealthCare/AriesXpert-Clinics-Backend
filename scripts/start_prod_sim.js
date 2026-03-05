const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

async function start() {
  console.log('🚀 Starting MongoDB Memory Replica Set (Production Simulation)...');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  
  console.log(`✅ MongoDB Replica Set Started at: ${uri}`);
  console.log('📝 Updating Environment Variables...');

  const env = { 
    ...process.env, 
    MONGODB_URI: uri,
    PORT: '3001'
  };

  console.log('🚀 Starting NestJS Application...');
  
  // Run directly with ts-node for development to avoid build artifacts
  const srcPath = path.join(__dirname, '../src/main.ts');
  const child = spawn('node', ['-r', 'ts-node/register', srcPath], { env, stdio: 'inherit' });

  child.on('close', async (code) => {
    console.log(`Application exited with code ${code}`);
    await replSet.stop();
  });

  process.on('SIGINT', async () => {
    console.log('Stopping...');
    child.kill();
    await replSet.stop();
    process.exit();
  });
}

start();
