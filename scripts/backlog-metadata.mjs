// Native Backlog metadata only. Keep this parser dependency-free: CI status
// publishers import delivery verification before npm packages are installed.
export function readTaskHeader(source) {
  const header = source.replace(/^\uFEFF/, '').split(/^---\s*$/m)[1] ?? '';
  const keys=[...header.matchAll(/^([\w-]+):/gm)].map(match=>match[1]);
  const metadataErrors=[...new Set(keys.filter((key,index)=>keys.indexOf(key)!==index))].map(key=>`重复元数据 ${key}`);
  if(!/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.test(source))metadataErrors.push('缺少完整frontmatter');
  const criteria=[...(source.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/)?.[1]??'').matchAll(/^- \[([ xX])\] /gm)];
  const scalar = key => header.match(new RegExp(`^${key}:\\s*([^\\r\\n]+)`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '') ?? null;
  const list = key => {
    const inline = header.match(new RegExp(`^${key}:[ \\t]*\\[([^\\r\\n]*)\\]`, 'm'));
    if (inline) return inline[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    const block = header.match(new RegExp(`^${key}:[ \\t]*\\r?\\n((?:[ \\t]+-[^\\r\\n]*\\r?\\n?)+)`, 'm'));
    return [...(block?.[1] ?? '').matchAll(/^[ \t]+-[ \t]+(.+)$/gm)].map(m => m[1].trim().replace(/^['"]|['"]$/g, ''));
  };
  return { id: scalar('id'), status: scalar('status'), priority: scalar('priority'), milestone: scalar('milestone'),
    parentTaskId: scalar('parent_task_id'), assignees: list('assignee'), labels: list('labels'), documentation: list('documentation'),
    dependencies:list('dependencies'),references:list('references'),metadataErrors,acCount:criteria.length,acCompleted:criteria.filter(match=>match[1].toLowerCase()==='x').length };
}
