const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\Nauman\\Desktop\\SAPIO';
const mobile = path.join(root, 'mobile');
const tsc = path.join(root, 'node_modules', '.bin', 'tsc.cmd');

const res = spawnSync(tsc, ['--noEmit', '-p', 'tsconfig.json'], {
  cwd: mobile,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});

const out = (res.stdout || '') + '\n---STDERR---\n' + (res.stderr || '');
fs.writeFileSync(path.join(mobile, '_tsc_out.txt'), out);
fs.writeFileSync(path.join(mobile, '_exit.txt'), 'EXIT=' + (res.status ?? (res.error ? 'ERR:' + res.error : 1)));
