const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = 'c:\\Users\\Nauman\\Desktop\\SAPIO\\mobile';
const tsc = path.join(cwd, 'node_modules', '.bin', 'tsc.cmd');

const res = spawnSync(tsc, ['--noEmit', '-p', 'tsconfig.json'], {
  cwd,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});

const out = (res.stdout || '') + '\n---STDERR---\n' + (res.stderr || '');
fs.writeFileSync(path.join(cwd, '_tsc_out.txt'), out);
fs.writeFileSync(path.join(cwd, '_exit.txt'), 'EXIT=' + (res.status ?? (res.error ? 'ERR' : 1)));
