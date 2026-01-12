# Script to update git remote to your new repository
# Usage: .\update-remote.ps1 -NewRepoUrl "https://github.com/YOUR_USERNAME/REPO_NAME.git"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewRepoUrl
)

Write-Host "Updating git remote..." -ForegroundColor Cyan

# Rename current origin to upstream (to keep reference to original repo)
Write-Host "Renaming current 'origin' to 'upstream'..." -ForegroundColor Yellow
git remote rename origin upstream

# Add your new repository as origin
Write-Host "Adding your repository as 'origin'..." -ForegroundColor Yellow
git remote add origin $NewRepoUrl

# Verify the remotes
Write-Host "`nCurrent remotes:" -ForegroundColor Green
git remote -v

Write-Host "`n✅ Remote updated successfully!" -ForegroundColor Green
Write-Host "You can now push with: git push -u origin mai" -ForegroundColor Cyan

