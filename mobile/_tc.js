const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const npm = 'C:\\Program Files\\nodejs\\npm.cmd';
const cwd = 'c:\\Users\\Nauman\\Desktop\\SAPIO\\mobile';

try {
  const out = execFileSync(npm, ['exec', 'tsc', '--', '--noEmit', '-p', 'tsconfig.json'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  fs.writeFileSync(path.join(cwd, '_tsc_out.txt'), out || 'NO_ERRORS');
  fs.writeFileSync(path.join(cwd, '_exit.txt'), 'EXIT=0');
} catch (e) {
  const combined = (e.stdout || '') + '\n' + (e.stderr || '');
  fs.writeFileSync(path.join(cwd, '_tsc_out.txt'), combined);
  fs.writeFileSync(path.join(cwd, '_exit.txt'), 'EXIT=' + (e.status ?? 1));
}
