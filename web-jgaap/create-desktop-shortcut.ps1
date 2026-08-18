$Desktop = [Environment]::GetFolderPath('Desktop')
$BatPath = Join-Path $PSScriptRoot 'start-dev.bat'
$ShortcutPath = Join-Path $Desktop 'JGAAP-Start.lnk'

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = 'Start JGAAP accounting advisor (dev server on port 3001)'
$Shortcut.Save()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null

Write-Output ("Created: " + $ShortcutPath)
