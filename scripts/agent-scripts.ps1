[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('setup', 'status', 'test', 'docs', 'browser')]
    [string]$Command = 'status',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ToolArgs
)

$ErrorActionPreference = 'Stop'
$checkout = Join-Path (Split-Path $PSScriptRoot -Parent) 'tooling/agent-scripts'
$revision = '1159adf26ad007df38b87debb107d3946008d38b'
$remote = 'https://github.com/steipete/agent-scripts.git'

if ($Command -eq 'setup' -and !(Test-Path -LiteralPath $checkout)) {
    & git clone $remote $checkout
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & git -C $checkout checkout --detach $revision
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if (!(Test-Path -LiteralPath (Join-Path $checkout '.git'))) {
    throw 'Missing agent-scripts checkout. Run this script with setup first.'
}
$actualRemote = & git -C $checkout remote get-url origin
if ($LASTEXITCODE -ne 0 -or $actualRemote -ne $remote) {
    throw 'Unexpected agent-scripts origin; refusing to use it.'
}
$actualRevision = & git -C $checkout rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualRevision -ne $revision) {
    throw "Unexpected agent-scripts revision; expected $revision. Review updates explicitly."
}
if ($Command -eq 'status') {
    Write-Output "Checkout: $checkout"
    Write-Output "Revision: $actualRevision"
    & bun --version
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    foreach ($dependency in @('commander', 'puppeteer-core')) {
        $manifest = Join-Path $checkout "node_modules/$dependency/package.json"
        if (!(Test-Path -LiteralPath $manifest)) { throw "Missing $dependency; run setup." }
        $installed = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
        Write-Output "$dependency $($installed.version)"
    }
    exit 0
}

Push-Location $checkout
try {
    switch ($Command) {
        'setup' { & bun install --frozen-lockfile --ignore-scripts }
        'test' { & bun test scripts/browser-tools-navigation.test.ts scripts/browser-tools-profile.test.ts }
        'docs' { & bun scripts/docs-list.ts @ToolArgs }
        'browser' { & bun scripts/browser-tools.ts @ToolArgs }
    }
    $result = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $result
