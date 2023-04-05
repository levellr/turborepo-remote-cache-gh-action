import { spawn } from 'child_process';
import { resolve } from 'path';

const subprocess = spawn('node', [resolve(__dirname, '../server')]);

subprocess.stdout.on('data', (data) => console.log(data));
subprocess.stderr.on('data', (data) => console.error(data));
