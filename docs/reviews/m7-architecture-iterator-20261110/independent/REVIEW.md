# Independent review: generic-for initialization imports

Conclusion: PASS for the two reviewed implementation/test files. No unresolved finding in this bounded repair. This is not Hosted CI, a Full regression result, or merge clearance.

Review ID: architecture-generic-iterator-independent-20261110
Baseline: ab65ed3b5b4240eb653af4651a13c1b8c72b2e04
Candidate at review: uncommitted two-file change in m7-round-ten. Exact SHA-256 identities are recorded in review.json; a published commit must be read back and bound separately.

## Source review

The analyzer previously registered explicit Lua calls only. A generic-for loop implicitly invokes its first iterator expression, so a statically known iterator containing require could incorrectly borrow an approved deferred pair and conceal an initialization dependency cycle.

The repair normalizes stored call sites to callee expressions and registers only the first generic-for iterator with the containing owner. The existing lexical traversal resolves the iterator expressions before introducing loop-local names. Existing target resolution, aliases, first-return handling, single-write/declaring-owner restrictions, recursive termination, and explicit call behavior are preserved. State, control and additional expressions are evaluated, but their bare function values are not automatically invoked. A loop inside an uninvoked owner remains deferred. No policy exception, threshold, production Lua, generated runtime, CI workflow, fixture archive or timing data is changed.

## Independent execution

- 37/37 purpose-built probes matched both expected architecture classification and real execution counts in the repository's Fengari Lua 5.3 runtime. The probes use a counting require stub and terminating iterator bodies, not a platform simulator or official client. This proves the invocation distinction, not actual module-loader cycle behavior.
- The original baseline analyzer fails the expected classification in 19 of these same probes. These are not claimed as 19 repository tests or new production defects.
- Covered local/anonymous/assigned/forward-declared and aliased iterators; returned and double-factory iterators; lexical shadowing and multiple loop variables; nested/eager/dormant owners; nested generic/numeric/repeat scopes; factory, state/control/extra expression evaluation; noncalled state/control/extra function values and nonfirst factory returns; uncalled callback values; reassignment conservatism; mixed eager/deferred edges; ordinary, string and table calls.
- Five deliberately broken analyzer variants were rejected by relevant independent probes: removal of implicit invocation, automatic invocation of all iterator expressions, attributing every loop to initialization, choosing the second expression, and breaking explicit call registration. Mutants were isolated under this review directory and never written into the repository.
- Independent whole-repository analysis using original and candidate analyzers returned byte-identical reports: 338 modules, 1,929 edges and no errors. This shows the fix currently changes detection capability without rewriting the project's declared graph or its approved deferred pairs.
- Read and reused the author's original 7/7 baseline, two-group RED and final 9/9 focused-file logs. The reviewer did not rerun Full, create aggregate coverage by summing overlapping tests, or alter the author's worktree. git diff --check passed. Both reviewed source hashes were unchanged after probes.

## Boundaries and remaining work

This remains static analysis of resolvable single-write locals and returned functions. Dynamic dispatch, parameter callback inference and arbitrary Lua control-flow inference remain the original documented limitations, not newly claimed coverage. Official import, GIL, ready and device tests were not applicable or performed. Local execution used Node v24.22.1, not Hosted Node 24.18.0 or Windows. Publication, source identity binding, exact-head independent-review handshake, required CI, original Merge Queue and postmerge validation remain required.

## Reproduction and evidence

From the reviewed repository root, run node <path-to-probe.mjs> <output-directory>. The script uses process.cwd() and the explicit output directory, or creates a private temporary directory if no argument is supplied. It resolves the repository dependencies and reads the exact baseline through Git. The portable entry was rerun successfully on the same unchanged implementation/test hashes; this rerun is not added to the 37 distinct probe count. probe.mjs, results.json and probe.log retain every probe, actual result, mutation and identity. review.json records source and evidence SHA-256 values.
