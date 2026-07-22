<#
  installer-poste.ps1 — Mettre un PC Windows vierge au niveau pour travailler sur gamedoor41.fr

  À LANCER une seule fois sur un poste neuf, dans PowerShell.
  Ne fait rien de destructif : chaque outil n'est installé que s'il manque (idempotent).

  Utilisation :
    powershell -ExecutionPolicy Bypass -File installer-poste.ps1
    powershell -ExecutionPolicy Bypass -File installer-poste.ps1 -WithImageTools   # + Node & Python (scripts d'images)

  Ce que ce script FAIT tout seul :
    - installe Git et VS Code (via winget) s'ils manquent
    - installe l'extension Claude Code + les extensions recommandées du dépôt dans VS Code
    - clone le dépôt GAMEDOOR41 dans %USERPROFILE%\Projets\GAMEDOOR41
    - (option -WithImageTools) installe Node.js LTS et Python 3.12

  Ce que ce script NE PEUT PAS faire (à faire à la main, il te le rappelle à la fin) :
    - se connecter au compte Claude dans VS Code
    - activer VS Code Settings Sync (compte GitHub du taf)
    - autoriser les connecteurs MCP (Netlify, Gmail, Google Agenda, Wix) sur claude.ai
#>

param(
  [switch]$WithImageTools
)

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/BRAINCaen/GAMEDOOR41.git'
$ProjectsDir = Join-Path $env:USERPROFILE 'Projets'
$CloneDir = Join-Path $ProjectsDir 'GAMEDOOR41'

function Section($t) { Write-Host "`n===== $t =====" -ForegroundColor Cyan }
function OK($t)      { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t)    { Write-Host "  ->  $t" -ForegroundColor Gray }
function Warn($t)    { Write-Host "  /!\ $t" -ForegroundColor Yellow }

function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Install-Winget($id, $label) {
  Info "Installation de $label (winget $id)..."
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --scope user
  if ($LASTEXITCODE -ne 0) {
    # Certains paquets ignorent --scope user ; on retente sans.
    winget install --id $id -e --accept-source-agreements --accept-package-agreements
  }
}

Section 'Vérification de winget'
if (-not (Has 'winget')) {
  Warn "winget est absent. Installe 'Programme d'installation d'application' depuis le Microsoft Store, puis relance ce script."
  return
}
OK 'winget présent'

Section 'Git'
if (Has 'git') { OK "Git déjà installé ($((git --version)))" }
else { Install-Winget 'Git.Git' 'Git' }

Section 'VS Code'
if (Has 'code') { OK 'VS Code déjà installé' }
else { Install-Winget 'Microsoft.VisualStudioCode' 'VS Code' }

if ($WithImageTools) {
  Section 'Node.js LTS (option image tools)'
  if (Has 'node') { OK "Node déjà installé ($((node --version)))" }
  else { Install-Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS' }

  Section 'Python 3.12 (option image tools)'
  if (Has 'py') { OK 'Python (lanceur py) déjà installé' }
  else {
    Install-Winget 'Python.Python.3.12' 'Python 3.12'
    Warn "Si 'python' échoue avec un message du Microsoft Store : Paramètres Windows"
    Warn "  -> 'Alias d'exécution d'application' -> désactive python.exe et python3.exe"
  }
}

Section 'Extensions VS Code'
if (Has 'code') {
  $extensions = @(
    'anthropic.claude-code',
    'ritwickdey.LiveServer',
    'github.vscode-github-actions'
  )
  foreach ($ext in $extensions) {
    Info "Extension $ext"
    code --install-extension $ext --force | Out-Null
  }
  OK 'Extensions installées (Claude Code, Live Server, GitHub Actions)'
} else {
  Warn "VS Code pas encore dans le PATH de ce terminal — installe les extensions après avoir rouvert VS Code."
}

Section 'Clone du dépôt GAMEDOOR41'
if (-not (Has 'git')) {
  Warn "Git pas encore dans le PATH de ce terminal. Referme et rouvre PowerShell, puis relance ce script pour cloner."
} elseif (Test-Path $CloneDir) {
  OK "Dépôt déjà présent : $CloneDir (je fais un git pull)"
  git -C $CloneDir pull --ff-only
} else {
  if (-not (Test-Path $ProjectsDir)) { New-Item -ItemType Directory -Path $ProjectsDir | Out-Null }
  Info "Clone dans $CloneDir ..."
  git clone $RepoUrl $CloneDir
  OK 'Dépôt cloné'
}

Section 'TERMINÉ — étapes manuelles restantes (impossibles à automatiser)'
Warn "1. Rouvre PowerShell / VS Code : le PATH n'est pas rafraîchi dans ce terminal après une install winget."
Warn "2. Ouvre le dossier $CloneDir dans VS Code (CLAUDE.md se lit tout seul)."
Warn "3. Connecte-toi au compte Claude du taf dans l'extension Claude Code."
Warn "4. Active VS Code Settings Sync (icône compte en bas à gauche) avec le compte GitHub du taf."
Warn "5. Autorise les connecteurs MCP sur claude.ai (Netlify, Gmail, Google Agenda, Wix) — chaque poste OAuth individuellement."
Write-Host ""
