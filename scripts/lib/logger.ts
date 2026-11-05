/** Every script writes a timestamped log file to logs/ as well as the console. */
import fs from 'node:fs';
import path from 'node:path';

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  file: string;
}

export function createLogger(scriptName: string, dir = 'logs'): Logger {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${scriptName}-${stamp}.log`);
  const write = (level: string, msg: string) => {
    const line = `${new Date().toISOString()} [${level}] ${msg}`;
    fs.appendFileSync(file, line + '\n');
    (level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log)(line);
  };
  return {
    info: (m) => write('INFO', m),
    warn: (m) => write('WARN', m),
    error: (m) => write('ERROR', m),
    file,
  };
}
