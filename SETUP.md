# Setup (10 minutes, one time)

This folder is the **entire contents** of your profile repo, `SumanthChary/SumanthChary`. Everything below happens on github.com.

## 1. Drop the files in

Copy everything in this folder into the repo root and commit to `main`:

```
README.md
SETUP.md                              (optional, you can delete it afterwards)
assets/*.svg                          (generated panels)
data/config.json  data/snapshot.json
scripts/build.mjs  scripts/snapshot.py
.github/workflows/update-profile.yml
```

The panels already work from the bundled snapshot, so the profile looks right the moment you push.

## 2. Make private repos count (this is the "show my private commits" part)

GitHub never exposes private commit details to visitors, by design. Two things you *can* do safely:

1. **Native graph:** Settings → Public profile → Contributions → tick **"Include private contributions on my profile"**. Visitors then see anonymous squares, never repo names or messages.
2. **These panels:** the Action reads your private history with a token and draws only **counts**, and only names the repos you allow in `data/config.json` → `privateNamesAllowed`. Everything else shows as a redaction bar.

To enable the Action:

1. github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate.
   - Repository access: **All repositories**
   - Permissions: **Contents: Read-only**, **Metadata: Read-only**
   - (A classic token with the `repo` scope also works.)
2. In `SumanthChary/SumanthChary` → Settings → Secrets and variables → Actions → **New repository secret**
   - Name: `PROFILE_STATS_TOKEN`, value: the token.
3. Actions tab → **update-profile** → **Run workflow**. Then it refreshes itself every 6 hours.

If the secret is missing the workflow fails loudly instead of silently publishing stale numbers.

## 3. Things to check

- **Links:** `galleyresume.com`, `postproai.app`, `sumanthdev.me`, LinkedIn, X and Peerlist were taken from your repo READMEs and old profile. Click each once.
- **Agent split:** the hero, ship log and activity panel show "by hand" vs "agent-assisted" commits (Lovable, v0, Claude). To hide it everywhere, set `"showAgentSplit": false` in `data/config.json` and delete the sentence about "Agents" in the README's *Ship log* section.
- **Image URLs:** the README loads the panels from `cdn.jsdelivr.net/gh/<you>/<repo>@main/assets/...` instead of a relative path. GitHub's image proxy fetches those server-side, so they still show for visitors (and you) whose network can't reach `raw.githubusercontent.com`. If you rename the repo or branch, update those four URLs. `build.mjs` keeps the `?v=` stamps current by itself.
- **Private names:** add or remove repos in `privateNamesAllowed`. Anything not listed there is redacted in the public SVGs.

## Preview locally

```bash
node scripts/build.mjs --snapshot      # offline, uses data/snapshot.json
GH_TOKEN=ghp_xxx node scripts/build.mjs   # live (your token)
```

Open `assets/*.svg` in a browser. The scripts have zero dependencies (Node 18+).
