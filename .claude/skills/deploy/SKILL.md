---
name: deploy
description: Deploy or redeploy the simple-climbing-training-planner PWA to Firebase Hosting, or explain its deploy/CI pipeline. Use this whenever the user asks to deploy, ship, push a release, redeploy, or asks how the app gets to production, even if they just say "deploy this" or "is this live yet."
---

# Deploying this project

Canonical target is **Firebase Hosting** (`public: "."` in `firebase.json` — serves the repo root as-is, no build step).

## Manual deploy

```powershell
firebase deploy --only hosting
```

Hosting URL: <https://simple-climbing-planner.web.app>.

## Auto-deploy

Every push to `origin/main` (repo: <https://github.com/slm37102/simple-climbing-training-planner>) deploys automatically via GitHub Actions (`.github/workflows/firebase-deploy.yml`). This needs the `FIREBASE_SERVICE_ACCOUNT_SIMPLE_CLIMBING_PLANNER` repo secret (a service-account JSON with Firebase Hosting Admin) to be present.

To trigger a manual re-deploy instead of pushing to `main`, use the workflow's "Run workflow" button in GitHub Actions, or run the CLI command above.

## Notes

- No CI runs the test suite on push — the tests are the in-browser suite (see the `test` skill), so verify locally before pushing/deploying.
- Use conventional-commit subjects + the `Co-authored-by` trailer for commits (check `git log` for the exact style used in this repo).
