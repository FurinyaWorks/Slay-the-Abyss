import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {resolve, relative, sep, posix} from 'node:path';
import {pathToFileURL} from 'node:url';

const manifestPath = 'config/repo-navigation.json';
const countedRoots = ['scripts', 'src/lua', 'tests', 'tests/lua', 'tests/helpers', 'tests/fixtures'];

function isSafePath(path) {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('/') &&
    !path.includes('\\') && !path.split('/').some(part => !part || part === '.' || part === '..');
}

function filesRecursively(root, directory, errors) {
  const output = [];
  if (!existsSync(resolve(root, directory))) {
    errors.push(`Missing source directory: ${directory}`);
    return output;
  }
  const visit = (dir) => {
    for (const entry of readdirSync(resolve(root, dir), {withFileTypes: true})) {
      const path = posix.join(dir, entry.name);
      if (entry.isSymbolicLink()) {errors.push(`Symlink in checked directory: ${path}`); continue;}
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) output.push(path);
    }
  };
  visit(directory);
  return output;
}

export function auditRepositoryNavigation(root = '.') {
  root = resolve(root);
  const errors = [];
  let manifest;
  try {manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));}
  catch (error) {return {errors: [`Cannot read ${manifestPath}: ${error.message}`], counts: {}, routes: []};}
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.routes) || !manifest.routes.length)
    errors.push('Invalid repo navigation schema or empty routes');
  const ids = new Set(), aliases = new Set();
  for (const route of manifest.routes ?? []) {
    if (!/^[a-z][a-z0-9-]*$/.test(route.id ?? '') || ids.has(route.id)) errors.push(`Invalid/duplicate route id: ${route.id}`);
    ids.add(route.id);
    if (typeof route.description !== 'string' || !route.description.trim()) errors.push(`Missing description: ${route.id}`);
    if (!Array.isArray(route.aliases) || !route.aliases.length || !Array.isArray(route.files) || !route.files.length)
      errors.push(`Missing aliases or anchor files: ${route.id}`);
    for (const alias of [route.id, ...(route.aliases ?? [])]) {
      if (typeof alias !== 'string' || !alias.trim() || aliases.has(alias.toLowerCase())) errors.push(`Invalid/duplicate alias: ${alias}`);
      aliases.add(String(alias).toLowerCase());
    }
    const visited = new Set();
    for (const file of route.files ?? []) {
      if (!isSafePath(file) || visited.has(file)) {errors.push(`Unsafe/duplicate anchor: ${route.id}: ${file}`);continue;}
      visited.add(file);
      const destination = resolve(root, file);
      try {
        if (!relative(root, destination) || relative(root, destination).startsWith(`..${sep}`) || !statSync(destination).isFile())
          throw Error('not an in-repository file');
      } catch {errors.push(`Stale anchor: ${route.id}: ${file}`);}
    }
  }
  for (const file of ['AGENTS.md', 'docs/REPO_NAVIGATION.md']) {
    if (!existsSync(resolve(root, file))) errors.push(`Missing agent navigation document: ${file}`);
  }
  const counts = {};
  for (const directory of countedRoots) {
    try {counts[directory] = readdirSync(resolve(root, directory), {withFileTypes: true}).filter(entry => entry.isFile()).length;}
    catch {errors.push(`Cannot count directory: ${directory}`);}
  }
  // Existing builders / test commands discover only flat entry points. Reject
  // silently unshipped runtime Lua or silently unexecuted nested test cases.
  for (const file of filesRecursively(root, 'src/lua', errors)) {
    if (file.endsWith('.lua') && posix.dirname(file) !== 'src/lua')
      errors.push(`Undiscoverable runtime Lua: ${file}; migrate the loader and LUA_PATH before nesting`);
  }
  for (const file of filesRecursively(root, 'tests', errors)) {
    if (file.endsWith('.test.mjs') && posix.dirname(file) !== 'tests')
      errors.push(`Undiscoverable Node test: ${file}; update npm/CI test discovery before nesting`);
    if (file.startsWith('tests/lua/') && file.endsWith('.lua') &&
        posix.dirname(file) !== 'tests/lua' && !file.startsWith('tests/lua/helpers/'))
      errors.push(`Undiscoverable Lua test: ${file}; update test-lua runner before nesting`);
  }
  return {errors, counts, routes: manifest.routes};
}

export function findRoutes(routes, query) {
  const term = String(query ?? '').trim().toLowerCase();
  return !term ? routes : routes.filter(route => [route.id, ...route.aliases, route.description, ...route.files]
    .some(value => value.toLowerCase().includes(term)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), check = args.length === 1 && args[0] === '--check';
  const audit = auditRepositoryNavigation();
  if (audit.errors.length) {for (const error of audit.errors) console.error(error);process.exitCode = 1;}
  if (check) {
    console.log(`Repository navigation ${audit.errors.length ? 'FAILED' : 'PASS'}; direct files: ` +
      Object.entries(audit.counts).map(([dir, n]) => `${dir}=${n}`).join(', '));
  } else if (!args.some(arg => arg.startsWith('--'))) {
    const matched = findRoutes(audit.routes, args.join(' '));
    for (const route of matched) console.log(`${route.id} — ${route.description}\n  ${route.files.join('\n  ')}`);
    if (!matched.length) {console.error('No route. Search with rg --files / rg -n; see docs/REPO_NAVIGATION.md');process.exitCode = 1;}
  } else {console.error('Usage: node tools/repo-navigation.mjs [query|--check]');process.exitCode = 1;}
}
