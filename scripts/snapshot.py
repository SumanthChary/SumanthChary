#!/usr/bin/env python3
"""Local helper: build data/snapshot.json from cloned repos (same shape the live GraphQL fetch produces).
Usage: python3 -I scripts/snapshot.py <dir-with-clones> <out.json> <vis.json>
"""
import json, os, subprocess, sys, collections, hashlib, datetime as dt
root, out, vis_file = sys.argv[1], sys.argv[2], sys.argv[3]
VIS = json.load(open(vis_file))
ME = "167327959+SumanthChary@users.noreply.github.com"
CFG = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "config.json")))
ALLOWED = CFG["privateNamesAllowed"]
def safe(name, private):  # never write private repo names that are not allow-listed
    return name if (not private or name in ALLOWED) else "private-" + hashlib.sha1(name.encode()).hexdigest()[:6]
IST = dt.timezone(dt.timedelta(minutes=330))
AS_OF = dt.date(2026, 11, 27)
EXT = {".ts":"TypeScript",".tsx":"TypeScript",".js":"JavaScript",".jsx":"JavaScript",".mjs":"JavaScript",".py":"Python",".css":"CSS",".html":"HTML",".sql":"SQL"}
SKIP = ("node_modules","dist/","build/",".next/","lock","supabase/types","types.ts",".min.")
cal = collections.defaultdict(lambda: {"pub":0,"prv":0,"agent":0})
repos = []
for name in sorted(os.listdir(root)):
    p = os.path.join(root, name)
    if not os.path.isdir(os.path.join(p, ".git")) or name not in VIS: continue
    private = VIS[name] == "private"
    log = subprocess.run(["git","log","--format=%ae|%an|%aI"], cwd=p, capture_output=True, text=True, errors="replace").stdout.splitlines()
    mine = agent = 0; first = last = None
    for l in log:
        ae, an, ad = l.split("|")
        d = dt.datetime.fromisoformat(ad).astimezone(IST).date().isoformat()
        first = d if first is None or d < first else first
        last = d if last is None or d > last else last
        if ae == ME or an in ("Sumanth Chary", "SumanthChary"):
            mine += 1; cal[d]["prv" if private else "pub"] += 1
        else:
            agent += 1; cal[d]["agent"] += 1
    langs = collections.Counter()
    for f in subprocess.run(["git","ls-files"], cwd=p, capture_output=True, text=True).stdout.splitlines():
        if any(s in f for s in SKIP): continue
        lang = EXT.get(os.path.splitext(f)[1].lower())
        if not lang: continue
        try: langs[lang] += open(os.path.join(p, f), "rb").read().count(b"\n")
        except Exception: pass
    repos.append({"name":safe(name, private),"isPrivate":private,"pushedAt":last,"createdAt":first,"mine":mine,"agent":agent,"languages":dict(langs)})
start = AS_OF - dt.timedelta(days=371)
calendar = []
d = start
while d <= AS_OF:
    c = cal.get(d.isoformat(), {"pub":0,"prv":0,"agent":0})
    calendar.append({"date":d.isoformat(), **c}); d += dt.timedelta(days=1)
json.dump({"source":"snapshot","asOf":AS_OF.isoformat(),"user":{"login":"SumanthChary","name":"Sumanth Chary"},"calendar":calendar,"repos":repos}, open(out,"w"), indent=1)
print("repos", len(repos), "days", len(calendar))
