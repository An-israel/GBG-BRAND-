/** Tiny CLI flag parser. Every script supports --dry-run. */
export interface Args {
  dryRun: boolean;
  flags: Record<string, string | boolean>;
  positional: string[];
}

export function parseArgs(argv: string[] = process.argv.slice(2)): Args {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
      else flags[k] = true;
    } else positional.push(a);
  }
  return { dryRun: flags['dry-run'] === true, flags, positional };
}
