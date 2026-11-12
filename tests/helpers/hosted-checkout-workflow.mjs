// Invert only this complete reviewed hosted safeguard before older immutable
// workflow contracts. Keep unrelated drift visible; never refresh old hashes.
export const hostedCheckoutWorkflowEdits = Object.freeze([
  [
    "          $workspace = Get-Item -LiteralPath $env:GITHUB_WORKSPACE\n",
    "          if ($env:EXECUTION_ENVIRONMENT -eq 'github-hosted' -and (Test-Path -LiteralPath '.git')) { throw 'Hosted checkout must start without a Git database' }\n"
      + "          $workspace = Get-Item -LiteralPath $env:GITHUB_WORKSPACE\n",
  ],
  [
    "        timeout-minutes: 5\n        with:\n          ref: ${{ github.sha }}\n",
    "        timeout-minutes: 5\n        env:\n"
      + "          # Keep even small fetches packed so the following byte guard sees them.\n"
      + "          GIT_CONFIG_COUNT: '1'\n          GIT_CONFIG_KEY_0: fetch.unpackLimit\n          GIT_CONFIG_VALUE_0: '1'\n"
      + "        with:\n          ref: ${{ github.sha }}\n",
  ],
  [
    '      # Keep the measured runtime, every test and every fixture deadline.\n',
    "      - name: Check hosted checkout Git pack payload\n        if: runner.environment == 'github-hosted'\n"
      + '        run: node scripts/check-network-policy.mjs --hosted-checkout\n'
      + '      # Keep the measured runtime, every test and every fixture deadline.\n',
  ],
].map(Object.freeze));

export function beforeHostedCheckoutWorkflow(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const edits = hostedCheckoutWorkflowEdits.map(pair => pair.map(value => value.replaceAll('\n', eol)));
  if (!edits.every(([, after]) => text.split(after).length === 2)) return text;
  for (const [before, after] of edits) text = text.replace(after, before);
  return text;
}
