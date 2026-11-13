# Zhongli 32/40 paid candidate — AUTHOR TESTED; INDEPENDENT REVIEW PENDING

Baseline 27f2a651. Source ea5887d8 role contract; no values changed.
32 costs 1 energy and 3 jade, native flame_barrier 6/8, neither retain nor exhaust.
40 costs 1 energy and 3 jade, native block 12/16, both selfRetain and exhaust.
Only two canonical paid specs added; existing resource and native tail handlers reused.

Prepared tests cover public resource boundaries, strict flags/auto, costs, retain→exhaust lifecycle, native zero-damage retaliation and lethal non-retaliation, and fixed-reward Run UID/wholeRun native-tail fault restore/retry. Author execution of prepared new wrapper: 1/1 PASS, 32.22 seconds, both Lua PASS markers and no traceback. This is 84 resource/face cases, two retain/exhaust lifecycles, two lethal non-retaliation plus two normal zero-hit/expiry cases, 14 automatic-mode cases, four insufficient-energy cases, and four fixed reward Run fault/retry chains. First execution passed without corrections. Independent review remains pending.
Reward fixture explicitly sets offers and moves the acquired card into hand. It is not natural acquisition, nor a change to the existing 14-card domain. A separate 16-domain can follow; current dispatcher unchanged.

Jade does not absorb damage. Single-enemy/dynamic-encounter gates unchanged. Native lethal player damage does not retaliate, unlike old JS; design HOLD remains. No formal registration, source/human/balance approval, full75 playability or global loop proof.

Old 28/66 guard wrapper also passed 1/1 serially (35.94 seconds), including native lethal non-retaliation. No full suite or parallel test processes run.
