import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { Row } from './products.js';

export function readCsv(file: string): Row[] {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true, trim: false }) as Row[];
}

export function writeCsv(file: string, rows: Record<string, unknown>[], headers?: string[]): void {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  fs.writeFileSync(file, stringify(rows, { header: true, columns: cols }));
}
