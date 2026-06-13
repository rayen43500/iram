# Installation rapide (Windows)
#   cd backend\nlp-service
#   copy .env.example .env
#   py -3 -m ensurepip --upgrade
#   py -3 -m pip install -r requirements.txt
#   py -3 -m uvicorn app:app --host 127.0.0.1 --port 5001 --reload

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Fichier .env cree — ajoutez GEMINI_API_KEY si besoin."
}

py -3 -m ensurepip --upgrade
py -3 -m pip install -r requirements.txt

Write-Host "Demarrage NLP ATB sur http://127.0.0.1:5001 ..."
py -3 -m uvicorn app:app --host 127.0.0.1 --port 5001 --reload
