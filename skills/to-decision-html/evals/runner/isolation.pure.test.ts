import { describe, expect, it } from 'vitest';
import { isolationProblems } from './isolation.pure.ts';

// The sandbox sits in the system temp folder, as makeSandbox creates it; its parent is that temp folder.
const TEMP = '/private/var/folders/x/T';
const WORKSPACE = `${TEMP}/decision-eval-1`;
const ALIAS = '/var/folders/x/T/decision-eval-1';
const roots = [WORKSPACE, ALIAS];

describe('isolation', () => {
  describe('success cases', () => {
    it('passes file tools and commands that stay in the workspace, under either spelling of it', () => {
      // ARRANGE
      const tools = [
        { name: 'Read', input: { file_path: `${WORKSPACE}/handoff.md` } },
        { name: 'Write', input: { file_path: `${ALIAS}/page.html`, content: 'see /Users/someone/notes.md' } },
        { name: 'Glob', input: { pattern: '**/*.md' } },
        { name: 'Grep', input: { pattern: 'ink', path: 'skill/references' } },
        {
          name: 'Bash',
          input: { command: `ls -la ${WORKSPACE} && node skill/scripts/grade.ts page.html 2>/dev/null` },
        },
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual([]);
    });

    it('passes reads of system and tool paths: /usr, /System, /Applications, /opt/homebrew, Playwright browsers', () => {
      // ARRANGE
      const tools = [
        {
          name: 'Bash',
          input: { command: '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless page.html' },
        },
        { name: 'Bash', input: { command: 'ls ~/.cache/ms-playwright ~/Library/Caches/ms-playwright' } },
        { name: 'Bash', input: { command: '/opt/homebrew/bin/node --version && /usr/bin/qlmanage -t page.html' } },
        { name: 'Read', input: { file_path: '/System/Library/Fonts/Helvetica.ttc' } },
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual([]);
    });

    it('passes writes to the system temp folder, and reading back what the run wrote there', () => {
      // ARRANGE
      const tools = [
        { name: 'Bash', input: { command: 'mkdir -p /tmp/shots && node shot.mjs /tmp/shots/load.png' } },
        { name: 'Read', input: { file_path: '/tmp/shots/load.png' } },
        { name: 'Write', input: { file_path: `${TEMP}/probe.js`, content: '' } },
        {
          name: 'Bash',
          input: { command: `node ${TEMP}/probe.js > /private/tmp/probe.log && cat /private/tmp/probe.log` },
        },
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual([]);
    });

    it('counts a temp path named in a script the run wrote as its own, so it may read it back', () => {
      // ARRANGE
      const script = "await page.screenshot({ path: '/tmp/ink-near.png' });";
      const tools = [
        { name: 'Write', input: { file_path: 'shot.mjs', content: script } },
        { name: 'Bash', input: { command: 'node shot.mjs' } },
        { name: 'Read', input: { file_path: '/tmp/ink-near.png' } },
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual([]);
    });

    it('counts a temp path an inline -c or -e script names as its own, in the same command and after it', () => {
      // ARRANGE
      const command = [
        'python3 -I -c "',
        "import re;s=open('ink.html').read();open('/tmp/ink-check.js','w').write(s)\" && node --check /tmp/ink-check.js",
      ].join('\n');
      const tools = [
        { name: 'Bash', input: { command } },
        { name: 'Bash', input: { command: 'cat /tmp/ink-check.js' } },
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('fails reads of the home folder, ~/.npm and another repository', () => {
      // ARRANGE
      const tools = [
        { name: 'Read', input: { file_path: '/Users/someone/repo/AGENTS.md' } },
        { name: 'Bash', input: { command: 'cat ~/.claude/CLAUDE.md' } },
        {
          name: 'Bash',
          input: { command: 'node ~/.npm/_npx/abc/node_modules/playwright/cli.js screenshot page.html' },
        },
        { name: 'Grep', input: { pattern: 'ink', path: '/Users/someone/other-repo' } },
      ];
      const expected = [
        'Read reads /Users/someone/repo/AGENTS.md, outside the run workspace and the system and tool paths',
        'Bash reads ~/.claude/CLAUDE.md, outside the run workspace and the system and tool paths',
        'Bash reads ~/.npm/_npx/abc/node_modules/playwright/cli.js, outside the run workspace and the system and tool paths',
        'Grep reads /Users/someone/other-repo, outside the run workspace and the system and tool paths',
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('fails writes anywhere but the workspace and the temp folder, system paths included', () => {
      // ARRANGE
      const tools = [
        { name: 'Write', input: { file_path: '/Users/someone/Downloads/page.html', content: '' } },
        { name: 'Bash', input: { command: 'cp page.html /usr/local/share/page.html' } },
        { name: 'Bash', input: { command: 'echo hi > ~/notes.txt' } },
        { name: 'Edit', input: { file_path: '/opt/homebrew/etc/config', old_string: 'a', new_string: 'b' } },
      ];
      const expected = [
        'Write writes /Users/someone/Downloads/page.html, outside the run workspace and the temp folder',
        'Bash writes /usr/local/share/page.html, outside the run workspace and the temp folder',
        'Bash writes ~/notes.txt, outside the run workspace and the temp folder',
        'Edit writes /opt/homebrew/etc/config, outside the run workspace and the temp folder',
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('fails reading something in the temp folder that the run did not write, another sandbox included', () => {
      // ARRANGE
      const tools = [
        { name: 'Bash', input: { command: 'ls /tmp' } },
        { name: 'Read', input: { file_path: `${TEMP}/decision-eval-2/ink.html` } },
        { name: 'Bash', input: { command: 'cd /tmp/claude-501 && cat notes.md' } },
      ];
      const expected = [
        'Bash reads /tmp, in the temp folder but not written by the run',
        `Read reads ${TEMP}/decision-eval-2/ink.html, in the temp folder but not written by the run`,
        'Bash reads /tmp/claude-501, in the temp folder but not written by the run',
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('fails a path outside the workspace that an inline script names', () => {
      // ARRANGE
      const tools = [
        { name: 'Bash', input: { command: `python3 -c "print(open('/Users/someone/notes.md').read())"` } },
      ];
      const expected = ['Bash reads /Users/someone/notes.md, outside the run workspace and the system and tool paths'];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not mistake a sibling folder sharing the workspace prefix for the workspace', () => {
      // ARRANGE
      const tools = [{ name: 'Read', input: { file_path: `${WORKSPACE}-2/page.html` } }];
      const expected = [`Read reads ${WORKSPACE}-2/page.html, in the temp folder but not written by the run`];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('ignores URLs, the null device and the body of a heredoc', () => {
      // ARRANGE
      const heredoc = `cat > page.html <<'EOF'\n<div></div>\n<script src="/Users/x.js"></script>\nEOF\n/usr/bin/open page.html`;
      const tools = [
        {
          name: 'Bash',
          input: { command: 'curl -s https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/m.js >/dev/null' },
        },
        { name: 'Bash', input: { command: heredoc } },
        { name: 'WebFetch', input: { url: 'https://example.com/a' } },
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual([]);
    });

    it('resolves a parent folder from where the command changed directory to', () => {
      // ARRANGE
      const tools = [
        { name: 'Bash', input: { command: `cd ${WORKSPACE}/.work && cat head.html > ../ink.html` } },
        { name: 'Bash', input: { command: 'cd .work && cd .. && cd .. && ls' } },
        { name: 'Bash', input: { command: 'cd .. && ls ../other-run' } },
      ];
      const expected = [
        'Bash reads .., in the temp folder but not written by the run',
        'Bash reads .., in the temp folder but not written by the run',
        'Bash reads ../other-run, outside the run workspace and the system and tool paths',
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('reads markup and sed expressions as text: a path outside starts at a real root folder', () => {
      // ARRANGE
      const tools = [
        { name: 'Bash', input: { command: "printf '    </script>\\n  </body>\\n</html>\\n' >> page.html" } },
        { name: 'Bash', input: { command: "sed -i '' 's/a/out/; s/const x/const y/' ui.js" } },
        { name: 'Bash', input: { command: 'cat /etc/hosts' } },
      ];
      const expected = ['Bash reads /etc/hosts, outside the run workspace and the system and tool paths'];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it("lets a run read back its own tool output that the CLI spilled to the run's project folder, and no other", () => {
      // ARRANGE
      const own = '/Users/someone/.claude/projects/-private-var-folders-x-T-decision-eval-1/s1/tool-results/b6.txt';
      const other = '/Users/someone/.claude/projects/-Users-someone-repo/s2/tool-results/c7.txt';
      const tools = [
        { name: 'Read', input: { file_path: own } },
        { name: 'Read', input: { file_path: other } },
        { name: 'Write', input: { file_path: own, content: '' } },
      ];
      const expected = [
        `Read reads ${other}, outside the run workspace and the system and tool paths`,
        `Write writes ${own}, outside the run workspace and the temp folder`,
      ];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });

    it('allows no folder in the home folder but the Playwright browser cache', () => {
      // ARRANGE
      const tools = [{ name: 'Bash', input: { command: 'ls ~/Library/Caches/other' } }];
      const expected = ['Bash reads ~/Library/Caches/other, outside the run workspace and the system and tool paths'];

      // ACT
      const problems = isolationProblems(tools, roots);

      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
});
