$Desktop = [Environment]::GetFolderPath('Desktop')
$BatPath = Join-Path $PSScriptRoot "start-dev.bat"
$ShortcutPath = Join-Path $Desktop "Accounting-Advisor-Start.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Start dev server"
$Shortcut.Save()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
