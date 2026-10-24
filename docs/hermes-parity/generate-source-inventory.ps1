param(
    [string]$HermesSource = 'C:\Users\bharg\AppData\Local\hermes\hermes-agent',
    [string]$OutputDirectory = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
$sourceRoot = [System.IO.Path]::GetFullPath($HermesSource).TrimEnd('\')
$desktopRoot = Join-Path $sourceRoot 'apps\desktop'
$scopeRoots = @('src', 'electron', 'public', 'assets', 'scripts', 'e2e', 'packaging')
$files = foreach ($scope in $scopeRoots) {
    Get-ChildItem -LiteralPath (Join-Path $desktopRoot $scope) -Recurse -File
}
$files += Get-ChildItem -LiteralPath $desktopRoot -File
$files += Get-ChildItem -LiteralPath (Join-Path $sourceRoot 'apps\shared') -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\(node_modules|dist|\.git)\\' }
$files += @('LICENSE', 'package.json', 'package-lock.json', 'eslint.config.shared.mjs', '.npmrc', '.nvmrc') |
    ForEach-Object { Get-Item -LiteralPath (Join-Path $sourceRoot $_) }

$rows = foreach ($file in ($files | Sort-Object FullName -Unique)) {
    $relative = $file.FullName.Substring($sourceRoot.Length + 1).Replace('\', '/')
    $scopeDecision = 'review-and-port'
    if ($relative -match '^apps/desktop/src/plugins/hermes-bots/') { $scopeDecision = 'exclude-bots' }
    elseif ($relative -match '^apps/desktop/src/app/messaging/') { $scopeDecision = 'exclude-messaging' }
    elseif ($relative -match '^apps/desktop/src/app/webhooks/') { $scopeDecision = 'review-bot-ingress-boundary' }
    $kind = if ($relative -match '(\.test\.|\.spec\.|/e2e/)') { 'test' }
        elseif ($relative -match '\.tsx$') { 'react-module' }
        elseif ($relative -match '/electron/') { 'electron-module' }
        elseif ($relative -match '\.(css|woff2?|ttf|png|jpe?g|webp|svg|gif|mp3|wav|ogg)$') { 'style-or-asset' }
        else { 'supporting-source' }
    [pscustomobject]@{
        path = $relative
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        kind = $kind
        scope_decision = $scopeDecision
        implementation_status = 'not-started'
        destination = ''
        verification = ''
    }
}
$csvPath = Join-Path $OutputDirectory 'source-inventory.csv'
$rows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding utf8
$summary = [pscustomobject]@{
    source_root = $sourceRoot
    generated_at_utc = [DateTime]::UtcNow.ToString('o')
    inventory_scope = 'desktop src/electron/public/assets/scripts/e2e/packaging and root files; shared except dependencies/build output; selected workspace manifests'
    excludes = @('installed dependency contents', 'generated build/release output', 'private Hermes state, credentials, sessions and logs', 'Python backend source (separate integration inventory required)')
    file_count = @($rows).Count
    inventory_sha256 = (Get-FileHash -LiteralPath $csvPath -Algorithm SHA256).Hash.ToLowerInvariant()
    by_kind = @($rows | Group-Object kind | ForEach-Object { @{kind=$_.Name; count=$_.Count} })
    by_scope_decision = @($rows | Group-Object scope_decision | ForEach-Object { @{decision=$_.Name; count=$_.Count} })
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'source-inventory-summary.json') -Encoding utf8
$summary | ConvertTo-Json -Depth 6
