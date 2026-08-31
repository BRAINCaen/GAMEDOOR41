<#
  installer-poste-brain.ps1 — Mettre N'IMPORTE QUEL PC Windows au niveau
  pour modifier TOUS les sites BRAIN (GitHub BRAINCaen -> Netlify braincaen).

  À LANCER une seule fois par poste, dans PowerShell :
    powershell -ExecutionPolicy Bypass -File installer-poste-brain.ps1

  Options :
    -WithPython        installe aussi Python 3.12 (scripts d'images gamedoor41)
    -ProjectsDir "D:\Projets"   change le dossier de travail (défaut : %USERPROFILE%\Projets)

  Idempotent : n'installe que ce qui manque, met à jour les dépôts déjà clonés.

  Ce qu'il fait tout seul :
    - installe Git, VS Code, Node.js LTS, GitHub CLI (winget) + Netlify CLI (npm)
    - installe les extensions VS Code utiles
    - connecte GitHub (gh auth login) ET branche git dessus (gh auth setup-git)
      -> plus aucun mot de passe / token à saisir aux git push, y compris dépôts privés
    - clone (ou met à jour) TOUS les dépôts de l'organisation BRAINCaen
    - ouvre le dossier Projets dans VS Code

  Ce qu'il NE PEUT PAS faire (rappelé à la fin) :
    - se connecter au compte Claude dans l'extension Claude Code
    - activer VS Code Settings Sync
    - autoriser les connecteurs MCP sur claude.ai (Netlify, Gmail, Drive...)
    - se connecter à Netlify (netlify login) — utile seulement pour les sites hors git
#>

param(
  [switch]$WithPython,
  [switch]$Tout,
  # C:\Projets et pas %USERPROFILE%\Projets, pour deux raisons mesurees le 31/08/2026 :
  #  1. Chemin COURT. Sous un chemin long, le build Next.js de SYNERGIA-COMPT echoue de
  #     facon erratique avec des messages differents a chaque fois (fichiers introuvables
  #     qui existent pourtant). Le meme commit compile 3 fois sur 3 depuis un chemin court.
  #  2. Node remonte l'arborescence pour resoudre ses modules. Un node_modules ou un
  #     package.json trainant dans le dossier personnel est alors capte par TOUS les projets
  #     clones en dessous, qui compilent avec la mauvaise version de leurs outils.
  [string]$ProjectsDir = 'C:\Projets'
)

$ErrorActionPreference = 'Stop'
$Org = 'BRAINCaen'

# Dépôts volontairement EXCLUS de la synchro des postes (décision du 31/08/2026).
# Ces sites restent EN LIGNE et continuent de se déployer tout seuls à chaque push :
# on ne les clone simplement plus sur chaque PC, parce qu'ils ne sont plus édités au
# quotidien (tous figés depuis janvier-février 2026) et qu'ils demandent un build Node.
# Pour en récupérer un ponctuellement :  gh repo clone BRAINCaen/<NOM>
# Pour tout cloner malgré cette liste :   -Tout
$ReposExclus = @(
  'SYNERGIA-Brain-Chalon',    # site synergia-brain-chalon
  'SYNERGIA-Brain-LaTeste',   # site synergia-brain-lateste
  'SYNERGIA-Brain-Portel',    # site synergia-brain-portel
  'SYNERGIA-DEMO-COMPLETE',   # site synergia-demo
  'synergia-website'          # site synergia-team.fr
)

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

# Après une install winget, le PATH du terminal courant est périmé : on le recharge.
function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

Section 'Vérification de winget'
if (-not (Has 'winget')) {
  Warn "winget est absent. Installe 'Programme d'installation d'application' depuis le Microsoft Store, puis relance ce script."
  return
}
OK 'winget présent'

Section 'Outils de base'
if (Has 'git')  { OK "Git déjà installé ($(git --version))" }  else { Install-Winget 'Git.Git' 'Git' }
if (Has 'code') { OK 'VS Code déjà installé' }                 else { Install-Winget 'Microsoft.VisualStudioCode' 'VS Code' }
if (Has 'node') { OK "Node déjà installé ($(node --version))" } else { Install-Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
if (Has 'gh')   { OK 'GitHub CLI déjà installé' }              else { Install-Winget 'GitHub.cli' 'GitHub CLI' }

if ($WithPython) {
  if (Has 'py') { OK 'Python (lanceur py) déjà installé' }
  else {
    Install-Winget 'Python.Python.3.12' 'Python 3.12'
    Warn "Si 'python' ouvre le Microsoft Store : Paramètres Windows -> Alias d'exécution d'application -> désactive python.exe et python3.exe"
  }
}

Refresh-Path

Section 'Netlify CLI'
if (Has 'netlify') {
  OK "Netlify CLI déjà installé ($(netlify --version))"
} elseif (Has 'npm') {
  Info 'npm install -g netlify-cli ...'
  npm install -g netlify-cli
  Refresh-Path
  OK 'Netlify CLI installé'
} else {
  Warn "npm introuvable (Node vient d'être installé ?). Referme/rouvre PowerShell et relance ce script."
}

Section 'Extensions VS Code'
if (Has 'code') {
  $extensions = @(
    'anthropic.claude-code',
    'ritwickdey.LiveServer',
    'github.vscode-github-actions',
    'github.vscode-pull-request-github',
    'eamodio.gitlens',
    'netlify.netlify-vscode'
  )
  foreach ($ext in $extensions) {
    Info "Extension $ext"
    code --install-extension $ext --force | Out-Null
  }
  OK 'Extensions installées'
} else {
  Warn "VS Code pas encore dans le PATH — referme/rouvre PowerShell et relance le script."
}

Section 'Connexion GitHub'
if (-not (Has 'gh')) {
  Warn "gh pas encore dans le PATH. Referme/rouvre PowerShell et relance le script."
  return
}
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Info "Connexion au compte GitHub du taf. Choisis : GitHub.com -> HTTPS -> Login with a web browser."
  gh auth login --hostname github.com --git-protocol https --web --scopes 'repo,read:org,gist'
} else {
  OK "Déjà connecté à GitHub ($((gh api user --jq .login)))"
}

# Le point clé du 'depuis n'importe quel PC' : git utilise le jeton gh,
# donc les push (dépôts privés compris) passent sans mot de passe.
Info 'Branchement de git sur les identifiants gh (gh auth setup-git)...'
gh auth setup-git
OK 'git authentifié via GitHub CLI'

Section "Clone / mise à jour de tous les dépôts $Org"
if (-not (Test-Path $ProjectsDir)) { New-Item -ItemType Directory -Path $ProjectsDir | Out-Null }
Info "Dossier de travail : $ProjectsDir"

# Un node_modules ou un package.json situé AU-DESSUS des dépôts est capté par Node lors de
# la résolution des modules : les projets compilent alors avec les mauvaises versions et
# renvoient des erreurs incompréhensibles, sans rapport avec le code. On prévient.
$parent = Split-Path $ProjectsDir -Parent
foreach ($dossier in @($ProjectsDir, $parent) | Select-Object -Unique) {
  if (-not $dossier) { continue }
  foreach ($parasite in @('node_modules', 'package.json')) {
    $chemin = Join-Path $dossier $parasite
    if (Test-Path $chemin) {
      Warn "PARASITE : $chemin"
      Warn "  Node le captera pour tous les dépôts clonés en dessous et leurs builds échoueront"
      Warn "  avec des erreurs trompeuses. À déplacer ou supprimer s'il n'appartient à aucun projet."
    }
  }
}

$tous = gh repo list $Org --limit 200 --json name,sshUrl,url --jq '.[] | .name' 2>$null
if ($LASTEXITCODE -ne 0 -or -not $tous) {
  Warn "Impossible de lister les dépôts de $Org. Vérifie que le compte gh a bien accès à l'organisation."
  return
}

# Filtrage : on ne clone pas les dépôts mis de côté, sauf si -Tout est demandé.
if ($Tout) {
  $repos = $tous
  Info "-Tout demandé : les $($tous.Count) dépôts seront clonés, y compris les exclus."
} else {
  $repos = @($tous | Where-Object { $ReposExclus -notcontains $_ })
  $ecartes = @($tous | Where-Object { $ReposExclus -contains $_ })
  if ($ecartes.Count -gt 0) {
    # Jamais de mise à l'écart silencieuse : on dit toujours ce qui n'est PAS cloné.
    Warn "$($ecartes.Count) dépôt(s) volontairement NON clonés : $($ecartes -join ', ')"
    Info "Ces sites restent en ligne et se déploient toujours par push."
    Info "Pour en récupérer un : gh repo clone $Org/<NOM>   |   pour tout cloner : -Tout"
  }
  # Un nom qui figure dans la liste d'exclusion sans exister chez GitHub = liste périmée.
  $introuvables = @($ReposExclus | Where-Object { $tous -notcontains $_ })
  if ($introuvables.Count -gt 0) {
    Warn "Exclusions sans dépôt correspondant (liste à mettre à jour ?) : $($introuvables -join ', ')"
  }
}

$cloned = 0; $updated = 0; $failed = @()
foreach ($repo in $repos) {
  $dest = Join-Path $ProjectsDir $repo
  if (Test-Path (Join-Path $dest '.git')) {
    Info "$repo : déjà présent, git pull"
    git -C $dest pull --ff-only 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $updated++ } else { Warn "$repo : pull impossible (modifs locales ou branche divergente) — à regarder à la main" }
  } elseif (Test-Path $dest) {
    Warn "$repo : un dossier existe mais ce n'est pas un dépôt git — ignoré"
    $failed += $repo
  } else {
    Info "$repo : clone..."
    gh repo clone "$Org/$repo" $dest 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $cloned++; OK "$repo cloné" } else { $failed += $repo; Warn "$repo : clone échoué" }
  }
}
OK "$cloned dépôt(s) cloné(s), $updated mis à jour"
if ($failed.Count -gt 0) { Warn "À revoir : $($failed -join ', ')" }

Section 'Ouverture de VS Code'
if (Has 'code') { code $ProjectsDir }

Section 'TERMINÉ — étapes manuelles restantes'
Warn "1. Referme et rouvre PowerShell / VS Code (le PATH n'est pas rafraîchi après winget)."
Warn "2. Connecte-toi au compte Claude du taf dans l'extension Claude Code."
Warn "3. Active VS Code Settings Sync (icône compte, en bas à gauche) avec le compte GitHub du taf."
Warn "4. Autorise les connecteurs MCP sur claude.ai (Netlify, Gmail, Drive) — chaque poste OAuth individuellement."
Warn "5. Optionnel : 'netlify login' pour piloter Netlify en ligne de commande (sites hors git)."
Write-Host ""
Write-Host "Boucle de travail sur n'importe quel site :" -ForegroundColor Cyan
Write-Host "  cd $ProjectsDir\<DEPOT>  ->  modifier dans VS Code  ->  git add -A  ->  git commit -m 'msg'  ->  git push" -ForegroundColor Gray
Write-Host "  Netlify redeploie tout seul en 1 a 2 minutes." -ForegroundColor Gray
Write-Host ""
