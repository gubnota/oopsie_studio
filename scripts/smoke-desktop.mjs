import {execFileSync} from 'node:child_process';
const bin = process.argv[2] || 'src-tauri/target/release/oopsie-studio';
const result = JSON.parse(execFileSync(bin, ['--native-smoke'], {encoding:'utf8'}));
if (!result.success || result.runtime.node !== false) throw new Error('Native smoke failed');
console.log(JSON.stringify(result, null, 2));
