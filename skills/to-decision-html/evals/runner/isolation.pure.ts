// The isolation grader: isolation is about what context reaches an eval run. A run may read only its workspace and
// the system and tool paths, and write only to its workspace and the system temp folder; in the temp folder it may
// read back only what it wrote there. It reads the paths file tools name and the path-like tokens in shell
// commands. Shell parsing is a token heuristic, so every problem names the token for a person to judge.
import path from 'node:path';
import type { ToolCall } from './transcript.pure.ts';

/** Devices any command may read or write. */
const DEVICES = ['/dev/null', '/dev/stdout', '/dev/stderr'];

/** Installed software a run may read and run without seeing anyone's files, but never write to. */
const SYSTEM = ['/usr', '/bin', '/sbin', '/System', '/Applications', '/opt/homebrew'];

/** Playwright's installed browsers, under the home folder on macOS and Linux; read like a system path. */
const BROWSERS = /(^|\/)(\.cache|Library\/Caches)\/ms-playwright(\/|$)/;

/** The temp folders every system has; the sandbox's parent, the system temp folder, is added per run. */
const TEMP = ['/tmp'];

/**
 * The top-level folders a path outside the workspace starts at. A shell token such as `</script>` or a sed
 * expression `s/a/out/` starts with a slash too, but at no real root, so it is text, not a path.
 */
const ROOTS =
  /^\/(Users|home|root|private|var|tmp|etc|Volumes|opt|usr|bin|sbin|dev|Library|System|Applications|mnt|srv|nix)(\/|$)/;

/** The input fields of file tools that hold a path. */
const PATH_FIELDS = ['file_path', 'notebook_path', 'path'];

/** File tools that change the file they name; every other file tool reads. */
const WRITING_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/** A heredoc's body is file content, not paths the command touches; its opening line stays. */
const HEREDOC = /<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g;

/**
 * An inline script handed to an interpreter: `python3 -c "…"`, `node -e '…'`. Its body is program text, not shell, so
 * a `;` or `open(` inside it says nothing about a program; each path it names is a `use`.
 */
const INLINE_SCRIPT = /(?<=\s)(?:-c|-e|--eval)\s+(["'])([\s\S]*?)\1/g;

/** Stands in for an inline script while the shell around it is parsed; its index names the script. */
const SCRIPT_MARK = /^@@script(\d+)@@$/;

/** A redirection and its target: `>`, `>>`, `2>`, `&>` write it, `<` reads it. */
const REDIRECT = /(?:\d|&)?(>>?|<)\s*(['"]?)([^\s'"<>|;&()`]+)\2/g;

/** Programs that read the paths they are given, and programs that create or change them. */
const READERS = new Set(
  'cat less more head tail ls find grep rg file stat wc du tree diff xxd od strings sed awk open'.split(' '),
);
const WRITERS = new Set(['mkdir', 'touch', 'tee', 'rm', 'rmdir']);
/** Programs whose last path is where they write: `cp from to`. */
const COPIERS = new Set(['cp', 'mv', 'ln', 'install', 'rsync']);
/** Options whose value is a file the program writes. */
const OUTPUT_FLAGS = new Set(['-o', '--output', '--out', '--outdir', '--screenshot', '--user-data-dir']);

/**
 * How a tool uses a path. `use` is a path a command runs or hands to a program the heuristic cannot read, such as
 * `node shot.mjs /tmp/a.png`: it counts as a read outside the temp folder and as a write in it.
 */
type Access = 'read' | 'write' | 'use';

/** A path a tool touched: the token as written, the folder it resolves from, and how it was used. */
interface Touch {
  readonly token: string;
  readonly from: string;
  readonly access: Access;
}

const isPathToken = (token: string): boolean => /^(~|\.\.(\/|$))/.test(token) || ROOTS.test(token);

/** How the program a segment runs uses an argument; `undefined` when the program says nothing about it. */
function programAccess(program: string, last: boolean): Access | undefined {
  if (READERS.has(program)) return 'read';
  if (WRITERS.has(program)) return 'write';
  if (COPIERS.has(program)) return last ? 'write' : 'read';
  return undefined;
}

function accessOf(tokens: readonly string[], index: number): Access {
  const previous = tokens[index - 1];
  if (index === 0) return 'use';
  if (previous === 'cd') return 'read';
  if (OUTPUT_FLAGS.has(previous)) return 'write';
  return programAccess(path.posix.basename(tokens[0]), index === tokens.length - 1) ?? 'use';
}

/** Redirection targets that are paths, and the segment with its redirections removed. */
function redirections(segment: string): { touches: { token: string; access: Access }[]; rest: string } {
  const touches = [...segment.matchAll(REDIRECT)]
    .filter((match) => isPathToken(match[3]))
    .map((match) => ({ token: match[3], access: match[1] === '<' ? ('read' as const) : ('write' as const) }));
  return { touches, rest: segment.replace(REDIRECT, ' ') };
}

/** The path tokens an inline script names, each a `use`. */
const scriptTouches = (body: string, from: string): Touch[] =>
  body
    .split(/[\s'"=<>()`,;[\]{}]+/)
    .filter(isPathToken)
    .map((token) => ({ token, from, access: 'use' }));

/** Path tokens in order, each resolved from the folder the command's `cd`s have reached by then. */
function commandTouches(command: string, start: string): Touch[] {
  const touches: Touch[] = [];
  const scripts: string[] = [];
  const shell = command
    .replace(HEREDOC, '$3')
    .replace(INLINE_SCRIPT, (_match, _quote, body: string) => ` @@script${scripts.push(body) - 1}@@ `);
  let from = start;
  for (const segment of shell.split(/&&|\|\||[;|\n]/)) {
    const { touches: redirected, rest } = redirections(segment);
    for (const touch of redirected) touches.push({ ...touch, from });
    const tokens = rest.split(/[\s'"=<>()`]+/).filter(Boolean);
    tokens.forEach((token, index) => {
      const script = SCRIPT_MARK.exec(token);
      if (script !== null) touches.push(...scriptTouches(scripts[Number(script[1])], from));
      if (isPathToken(token)) touches.push({ token, from, access: accessOf(tokens, index) });
      if (tokens[index - 1] === 'cd' && !token.startsWith('~')) from = path.posix.resolve(from, token);
    });
  }
  return touches;
}

function touchesOf({ name, input }: ToolCall, start: string): Touch[] {
  if (name === 'Bash') return typeof input.command === 'string' ? commandTouches(input.command, start) : [];
  const fields = PATH_FIELDS.map((field) => input[field]);
  if (name === 'Glob') fields.push(input.pattern);
  const access = WRITING_TOOLS.has(name) ? 'write' : 'read';
  return fields
    .filter((value): value is string => typeof value === 'string' && /^(~|\/|\.\.)/.test(value))
    .map((token) => ({ token, from: start, access }));
}

/** Text a tool wrote into a file: a temp path a script names is one the run creates when it runs the script. */
function writtenText({ name, input }: ToolCall): string {
  if (name === 'Write') return typeof input.content === 'string' ? input.content : '';
  if (name === 'Edit') return typeof input.new_string === 'string' ? input.new_string : '';
  if (name === 'MultiEdit' && Array.isArray(input.edits))
    return (input.edits as { new_string?: unknown }[]).map((edit) => String(edit.new_string ?? '')).join('\n');
  return '';
}

/** One spelling for macOS's /private/tmp and /private/var, so the run's own temp paths match however written. */
const canonical = (target: string): string => target.replace(/^\/private(?=\/(tmp|var)(\/|$))/, '');

const within = (target: string, root: string): boolean => target === root || target.startsWith(`${root}/`);

const OUTSIDE_READ = 'outside the run workspace and the system and tool paths';
const OUTSIDE_WRITE = 'outside the run workspace and the temp folder';
const UNWRITTEN_TEMP = 'in the temp folder but not written by the run';

type Place = 'workspace' | 'system' | 'temp' | 'outside';

/** Walks the tool calls in order, remembering what the run wrote in the temp folder. */
class Run {
  private readonly own: string[] = [];
  private readonly workspace: readonly string[];
  private readonly temp: readonly string[];
  /** The CLI's own project folders for this run, where it spills a tool output too long to return inline. */
  private readonly spills: readonly string[];

  /** `roots` are the workspace's spellings; the sandbox sits in the system temp folder, so their parent is it. */
  constructor(roots: readonly string[]) {
    this.workspace = roots.map(canonical);
    this.temp = [...TEMP, ...this.workspace.map((root) => path.posix.dirname(root))];
    this.spills = roots.map((root) => `/.claude/projects/${root.replace(/[^a-zA-Z0-9]/g, '-')}/`);
  }

  private inTemp = (target: string) => this.temp.some((root) => within(target, root));

  private isToolCache = (token: string) => BROWSERS.test(token) || this.spills.some((spill) => token.includes(spill));

  /**
   * Where a token points: the home folder cannot be resolved, so it stays a place of its own. The run's spilled tool
   * output is read like a system path: it holds what the run itself produced, no outside context.
   */
  private placeOf({ token, from }: Touch): { place: Place; target: string } {
    if (this.isToolCache(token)) return { place: 'system', target: token };
    if (token.startsWith('~')) return { place: 'outside', target: token };
    const target = canonical(path.posix.resolve(from, token));
    if (this.workspace.some((root) => within(target, root)) || DEVICES.includes(target))
      return { place: 'workspace', target };
    if (SYSTEM.some((root) => within(target, root))) return { place: 'system', target };
    return { place: this.inTemp(target) ? 'temp' : 'outside', target };
  }

  /** The problem with one touch, or null; a write or use in the temp folder makes the path the run's own. */
  problem(touch: Touch): string | null {
    const { place, target } = this.placeOf(touch);
    const writes = touch.access === 'write';
    if (place === 'workspace') return null;
    if (place !== 'temp') return writes ? OUTSIDE_WRITE : place === 'system' ? null : OUTSIDE_READ;
    if (touch.access === 'read') return this.own.some((mine) => within(target, mine)) ? null : UNWRITTEN_TEMP;
    this.own.push(target);
    return null;
  }

  /** Claims the temp paths a script the run wrote names. */
  claim(text: string): void {
    for (const token of text.split(/[\s'"=<>()`,;]+/).filter((part) => ROOTS.test(part))) {
      const target = canonical(path.posix.normalize(token));
      if (this.inTemp(target)) this.own.push(target);
    }
  }
}

/** The first root is where relative paths start, as it was the agent's working folder. */
export function isolationProblems(tools: readonly ToolCall[], roots: readonly string[]): string[] {
  const run = new Run(roots);
  return tools.flatMap((tool) => {
    const problems = touchesOf(tool, roots[0]).flatMap((touch) => {
      const problem = run.problem(touch);
      const verb = touch.access === 'write' ? 'writes' : 'reads';
      return problem === null ? [] : [`${tool.name} ${verb} ${touch.token}, ${problem}`];
    });
    run.claim(writtenText(tool));
    return problems;
  });
}
