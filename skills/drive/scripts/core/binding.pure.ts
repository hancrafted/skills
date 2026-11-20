import { type Document, isMap, isSeq, parseDocument, type YAMLMap, type YAMLSeq } from 'yaml';
import catalogData from '../../catalog/catalog.json' with { type: 'json' };
import { isRecord, isText, openMapping } from './yaml.pure.ts';

export const PHASES = ['define', 'reason', 'implement', 'verify', 'evolve'] as const;
export type Phase = (typeof PHASES)[number];

export const TIERS = ['mid', 'top'] as const;
export type Tier = (typeof TIERS)[number];
export const isTier = (value: unknown): value is Tier => (TIERS as readonly unknown[]).includes(value);

export const PHASE_TIERS: Readonly<Record<Phase, Tier>> = {
  define: 'mid',
  reason: 'top',
  implement: 'mid',
  verify: 'top',
  evolve: 'mid',
};
export const DEFAULT_AGENT_TYPE = 'general-purpose';

export interface DetectedSkill {
  name: string;
  origin: 'installed' | 'authored';
  source: string | null;
}

export const CATALOG = {
  source: catalogData.source,
  skills: catalogData.skills as Readonly<Record<string, readonly Phase[]>>,
  decisionFolders: catalogData.decisionFolders as readonly string[],
};

export function phasesOf(skill: DetectedSkill): readonly Phase[] {
  if (skill.origin !== 'installed' || (skill.source !== null && skill.source !== CATALOG.source)) return [];
  return Object.hasOwn(CATALOG.skills, skill.name) ? (CATALOG.skills[skill.name] ?? []) : [];
}

export function mergeDetected(groups: readonly (readonly DetectedSkill[])[], exclude: string): DetectedSkill[] {
  const found = new Map<string, DetectedSkill>();
  for (const skill of groups.flat()) if (skill.name !== exclude && !found.has(skill.name)) found.set(skill.name, skill);
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface PhaseBinding {
  model: Tier;
  skills: string[];
  inline: boolean;
}

export const NOTIFY_ADAPTERS = ['push-notification', 'none'] as const;
export type NotifyAdapter = (typeof NOTIFY_ADAPTERS)[number];
export const DEFAULT_NOTIFY_ADAPTER: NotifyAdapter = 'push-notification';

export interface Binding {
  agentType: string;
  phases: Record<Phase, PhaseBinding>;
  notify: { adapter: NotifyAdapter };
}

export interface SeedOptions {
  agentType?: string;
  tier?: Tier;
}

const HEADER = [
  " The Binding (hancrafted/skills docs/decision-records/drive/0001-workflow-phases-are-ports-bound-per-project.md): which skills serve each DRIVE phase (n:m), the model tier each phase's Subagents run on,",
  ' and the agent type every agent uses. `drive setup` seeds it and adds newly installed skills; you own every edit.',
  ' `skills` and `model` (a tier, mid or top, mapped to models in project.yml) per phase are yours to change;',
  ' `seen` lists the skills setup has already offered, so one you',
  ' remove here is not added back.',
  ' `notify.adapter` (push-notification | none) names how the Orchestrator reaches you at the Decision gate;',
  ' the CLI sends nothing.',
].join('\n');

export const INLINE_NOTE = ' none bound: the Orchestrator does this phase inline';

function mapAt(parent: YAMLMap, key: string, doc: Document): YAMLMap {
  const found = parent.get(key, true);
  if (isMap(found)) return found;
  const created = doc.createNode({}) as YAMLMap;
  parent.set(key, created);
  return created;
}

function seqAt(parent: YAMLMap, key: string, doc: Document): YAMLSeq {
  const found = parent.get(key, true);
  if (isSeq(found)) return found;
  const created = doc.createNode([]) as YAMLSeq;
  parent.set(key, created);
  return created;
}

const names = (seq: YAMLSeq): string[] => seq.items.map((item) => String((item as { value?: unknown }).value ?? item));

function seedMissing(doc: Document, root: YAMLMap, seed: SeedOptions): void {
  if (!root.has('agentType')) root.set('agentType', seed.agentType ?? DEFAULT_AGENT_TYPE);
  const notify = mapAt(root, 'notify', doc);
  if (!notify.has('adapter')) notify.set('adapter', DEFAULT_NOTIFY_ADAPTER);
  const phases = mapAt(root, 'phases', doc);
  for (const phase of PHASES) {
    const node = mapAt(phases, phase, doc);
    if (!node.has('model')) node.set('model', seed.tier ?? PHASE_TIERS[phase]);
    seqAt(node, 'skills', doc);
  }
}

function offerNewSkills(doc: Document, root: YAMLMap, detected: readonly DetectedSkill[]): void {
  const phases = mapAt(root, 'phases', doc);
  const seen = seqAt(root, 'seen', doc);
  const offered = new Set(names(seen));
  for (const skill of detected.filter((candidate) => !offered.has(candidate.name))) {
    for (const phase of phasesOf(skill)) {
      const skills = seqAt(mapAt(phases, phase, doc), 'skills', doc);
      if (!names(skills).includes(skill.name)) skills.add(doc.createNode(skill.name));
    }
    seen.add(doc.createNode(skill.name));
  }
}

function settleInlineNote(skills: YAMLSeq): void {
  const empty = skills.items.length === 0;
  skills.flow = empty;
  if (empty && skills.comment === undefined) skills.comment = INLINE_NOTE;
  if (!empty && skills.comment === INLINE_NOTE) skills.comment = undefined;
}

export function updateBinding(
  existing: string | null,
  detected: readonly DetectedSkill[],
  seed: SeedOptions = {},
): string {
  const { doc, root } = openMapping(existing, 'binding');
  if (existing === null) doc.commentBefore = HEADER;
  seedMissing(doc, root, seed);
  offerNewSkills(doc, root, detected);
  const phases = mapAt(root, 'phases', doc);
  for (const phase of PHASES) settleInlineNote(seqAt(mapAt(phases, phase, doc), 'skills', doc));
  return doc.toString();
}

function readPhase(phase: Phase, value: unknown): PhaseBinding | { error: string } {
  if (!isRecord(value)) return { error: `phases.${phase} must be a mapping` };
  const skills = value.skills ?? [];
  if (!isTier(value.model))
    return {
      error: `phases.${phase}.model must be a tier: ${TIERS.join(' or ')}`,
    };
  if (!Array.isArray(skills) || !skills.every((item) => typeof item === 'string'))
    return { error: `phases.${phase}.skills must be a list of skill names` };
  return {
    model: value.model,
    skills: skills as string[],
    inline: skills.length === 0,
  };
}

function readPhases(root: Record<string, unknown>): Record<Phase, PhaseBinding> | { error: string } {
  const section = isRecord(root.phases) ? root.phases : {};
  const phases = {} as Record<Phase, PhaseBinding>;
  for (const phase of PHASES) {
    const read = readPhase(phase, section[phase]);
    if ('error' in read) return read;
    phases[phase] = read;
  }
  return phases;
}

export function readBinding(text: string): Binding | { error: string } {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) return { error: `binding is not valid YAML: ${doc.errors[0]?.message}` };
  const root: unknown = doc.toJS();
  return isRecord(root) ? readRoot(root) : { error: 'binding must be a mapping' };
}

function readRoot(root: Record<string, unknown>): Binding | { error: string } {
  const { agentType } = root;
  if (!isText(agentType)) return { error: 'agentType must be a non-empty string' };
  const phases = readPhases(root);
  if ('error' in phases) return phases;
  const notify = readNotify(root.notify);
  return 'error' in notify ? notify : { agentType, phases, notify };
}

const isNotifyAdapter = (value: unknown): value is NotifyAdapter =>
  (NOTIFY_ADAPTERS as readonly unknown[]).includes(value);

function readNotify(section: unknown): Binding['notify'] | { error: string } {
  const adapter = isRecord(section) ? (section.adapter ?? DEFAULT_NOTIFY_ADAPTER) : DEFAULT_NOTIFY_ADAPTER;
  if (section !== undefined && section !== null && !isRecord(section)) return { error: 'notify must be a mapping' };
  return isNotifyAdapter(adapter)
    ? { adapter }
    : { error: `notify.adapter '${String(adapter)}' is unknown; expected ${NOTIFY_ADAPTERS.join(', ')}` };
}
