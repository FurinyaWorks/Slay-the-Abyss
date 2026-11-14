"""Deterministic read-only presentation audit of a frozen HU TAO baseline.

Usage (from repository root):
  python experiments/characters/hutao-v6-lab/reviews/presentation/reproduce.py
Requires installed Python playwright + Chromium. No network, release or Git writes.
All state mutations below occur *only inside ephemeral headless browser pages*.
Forced wins test UI wiring only, never natural play or balance.
"""
import hashlib
import json
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

SOURCE = Path("experiments/characters/hutao-v6-lab/baseline/pr640.html")
EXPECTED_BLOB = "364e1d3e8c8559e2fcb26276b9ae8a2813f21735"


def main():
    data = SOURCE.read_bytes()
    git_blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if git_blob != EXPECTED_BLOB:
        raise RuntimeError("SOURCE_MISMATCH: refusing to audit another candidate")
    results = {"source_blob": git_blob, "modes": [], "bugs": {}, "limits": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=shutil.which('chromium') or shutil.which('google-chrome') or None)
        for mode, width, height in [("desktop", 1440, 900), ("mobile_emulated", 390, 844)]:
            page = browser.new_page(viewport={"width": width, "height": height},
                                    is_mobile=(mode == "mobile_emulated"))
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.set_content(data.decode("utf-8"), wait_until="load")
            first = {
                "mode": mode,
                "opening_hand": page.locator("[data-card]").count(),
                "overflow": page.evaluate("document.documentElement.scrollWidth > window.innerWidth"),
                "opening_hp": page.evaluate("__hutaoReadOnly.state().hp"),
                "opening_energy": page.evaluate("__hutaoReadOnly.state().energy"),
            }
            if mode == "desktop":
                first["source_counts"] = page.evaluate("""() => {
                  const ids=Object.keys(CARDS);
                  const failed=[];
                  for(const id of ids) for(const upgraded of [false,true]){
                    const game=new HutaoGame(2);
                    game.hp=72;game.energy=10;game.butterfly=2;
                    game.enemies[0].hp=1000;game.enemies[0].maxHp=1000;
                    const c=game.newCard(id,upgraded);game.hand=[c];
                    const allowed=game.canPlay(c);
                    const played=allowed.ok?game.play(c.uid):allowed;
                    if(!allowed.ok||!played.ok)failed.push({id,upgraded,reason:played.reason});
                  }
                  return {card_ids:ids.length,faces:ids.length*2,failed};
                }""")
                first["prep_effect_short_text"] = page.evaluate(
                    "conciseLines({id:'c14',upgraded:false})[0]")
                first["prep_effect_technical_text"] = page.evaluate(
                    "CARDS.c14.description")
            page.locator("#libraryBtn").click()
            first["library_rows"] = page.locator("#libResults .item").count()
            page.locator("#libResults [data-inspect-card]").first.click()
            first["detail_versions"] = page.locator(".detail-variant").count()
            page.locator("#closeDialog").click()
            page.locator("#practiceBtn").click()
            first["practice_rows"] = page.locator("#practiceResults .item").count()
            page.locator('[data-practice="r01"][data-upgraded="true"]').click()
            first["practice_add_upgraded"] = page.evaluate(
                "__hutaoReadOnly.state().hand.some(c=>c.id==='r01' && c.upgraded)")
            page.locator("[data-card]").first.click()
            first["energy_after_click"] = page.evaluate("__hutaoReadOnly.state().energy")
            page.locator("#endBtn").click()
            first["turn_after_end"] = page.evaluate("__hutaoReadOnly.state().turn")
            first["pageerrors"] = errors
            results["modes"].append(first)
            if mode == "desktop":
                page.evaluate("() => {g.energy=0;render();}")
                results["bugs"]["energy_zero_reasons"] = page.locator(".card-unavailable").all_text_contents()
                page.evaluate("() => {g.hp=6;g.energy=3;g.hand=[g.newCard('e')];render();}")
                results["bugs"]["hp_6_e_unavailable_reason"] = page.locator(".card-unavailable").inner_text()
                page.evaluate("""() => {
                    Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});
                    document.execCommand=()=>false;
                }""")
                page.locator("#reportBtn").click()
                results["bugs"]["false_clipboard_success"] = page.locator("#toast").inner_text()
                page.evaluate("reset()")
                phases = []
                for floor in range(1, 6):
                    page.evaluate("() => {g.testWinBattle();render();}")
                    phases.append(page.evaluate("({floor:g.floor,phase:g.phase})"))
                    if floor == 5:
                        break
                    page.locator('[data-reward="skip"]').click()
                    if floor == 2:
                        page.locator('[data-camp="rest"]').click()
                    if floor == 4:
                        page.locator('[data-camp="upgrade"]').click()
                        page.locator("[data-upgrade]").first.click()
                results["bugs"]["FORCED_phase_trace_not_natural"] = phases
            page.close()
        browser.close()
    results["limits"] = [
        "Headless emulation is not a real mobile phone.",
        "Single-card probes force hand/energy/HP/butterfly and are not natural gameplay.",
        "testWinBattle() bypasses combat; only UI-phase wiring is covered.",
        "Clipboard negative test deliberately makes execCommand return false.",
        "No player aesthetic approval, official Miliastra import, or full source-name review.",
    ]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
