#!/usr/bin/env python3
"""Verify widely-used MBBS research/education platform domains are active."""

import subprocess
import concurrent.futures

CANDIDATES = [
    # --- Primary research databases & search ---
    "pubmed.ncbi.nlm.nih.gov",
    "pmc.ncbi.nlm.nih.gov",
    "scholar.google.com",
    "semanticscholar.org",
    "europepmc.org",
    "medlineplus.gov",
    "base-search.net",
    # --- Open access / full text ---
    "doaj.org",
    "unpaywall.org",
    # --- Top medical journals ---
    "nejm.org",
    "thelancet.com",
    "bmj.com",
    "jamanetwork.com",
    "nature.com",
    "plos.org",
    "science.org",
    # --- Indian journals & publishers ---
    "japi.org",
    "ijmr.org.in",
    "journals.lww.com",
    "medknow.com",
    "indianpediatrics.net",
    # --- Clinical trials & registries ---
    "clinicaltrials.gov",
    "ctri.gov.in",
    "ctri.nic.in",
    "isrctn.com",
    # --- Point-of-care clinical reference ---
    "uptodate.com",
    "bestpractice.bmj.com",
    "medscape.com",
    "merckmanuals.com",
    "msdmanuals.com",
    "wikidoc.org",
    "dermnetnz.org",
    "radiopaedia.org",
    "litfl.com",
    # --- Medical education platforms (global) ---
    "osmosis.org",
    "lecturio.com",
    "amboss.com",
    "kenhub.com",
    "teachmeanatomy.info",
    "geekymedics.com",
    "zerotofinals.com",
    "ninjanerd.org",
    "onlinemeded.org",
    # --- Indian test-prep & government learning ---
    "marrow.com",
    "prepladder.com",
    "dams.co.in",
    "unacademy.com",
    "swayam.gov.in",
    # --- India regulatory / research bodies ---
    "nmc.org.in",
    "natboard.edu.in",
    "cdsco.gov.in",
    "ipc.gov.in",
    # --- Drugs & pharmacology ---
    "drugs.com",
    "mims.com",
    "dailymed.nlm.nih.gov",
    "fda.gov",
    "ema.europa.eu",
    "drugbank.com",
    "whocc.no",
    # --- Medical news ---
    "medpagetoday.com",
    "medindia.net",
    # --- Research tools: citation, writing, networking, AI ---
    "zotero.org",
    "mendeley.com",
    "connectedpapers.com",
    "researchgate.net",
    "orcid.org",
    "icmje.org",
    "elicit.com",
    "consensus.app",
    "rayyan.ai",
]

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def check(domain: str) -> tuple[str, str, str]:
    cmd = [
        "curl", "-4", "-s", "-o", "/dev/null", "-L", "--max-time", "15",
        "-k", "-A", UA, "-w", "%{http_code}", f"https://{domain}/",
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
        code = out.stdout.strip()
    except subprocess.TimeoutExpired:
        return (domain, "DEAD", "timeout")

    if not code or code == "000":
        return (domain, "DEAD", code or "000")
    if code.startswith(("2", "3")):
        return (domain, "UP", code)
    if code in {"401", "403", "406", "409", "429"}:
        return (domain, "UP-BOT", code)
    if code.startswith("5"):
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            code2 = out.stdout.strip()
        except subprocess.TimeoutExpired:
            return (domain, "DEAD", "timeout")
        if code2.startswith(("2", "3")):
            return (domain, "UP", code2)
        if code2 in {"401", "403", "406", "409", "429"}:
            return (domain, "UP-BOT", code2)
        return (domain, "FLAKY", code2 or code)
    return (domain, "CHECK-404", code)


def title_of(url: str) -> str:
    """Fetch first bytes of HTML and extract <title> to confirm site identity."""
    cmd = ["curl", "-4", "-s", "-L", "--max-time", "15", "-k", "-A", UA, url]
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=25)
        html = out.stdout.decode("utf-8", errors="replace")
    except subprocess.TimeoutExpired:
        return "(timeout)"
    if "<title" not in html.lower():
        return "(no title found)"
    low = html.lower()
    i = low.find("<title")
    start = html.find(">", i) + 1
    end = html.lower().find("</title>", start)
    title = html[start:end].strip() if end > start else "(empty)"
    return " ".join(title.split())[:100]


def main():
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for res in ex.map(check, CANDIDATES):
            results.append(res)

    order = {"UP": 0, "UP-BOT": 1, "CHECK-404": 2, "FLAKY": 3, "DEAD": 4}
    results.sort(key=lambda r: (order[r[1]], r[0]))

    print(f"{'STATUS':<10} {'CODE':<7} DOMAIN")
    print("-" * 60)
    for domain, status, code in results:
        print(f"{status:<10} {code:<7} {domain}")

    dead = [d for d, s, _ in results if s == "DEAD"]
    flaky = [d for d, s, _ in results if s == "FLAKY"]
    c404 = [d for d, s, _ in results if s == "CHECK-404"]
    print("\n--- SUMMARY ---")
    print(f"Total checked : {len(results)}")
    print(f"UP/UP-BOT     : {len(results) - len(dead) - len(flaky) - len(c404)}")
    print(f"CHECK-404     : {c404}")
    print(f"FLAKY         : {flaky}")
    print(f"DEAD          : {dead}")

    # Identity confirmation for uncertain/new domains
    uncertain = ["marrow.com", "ctri.gov.in", "ijmr.org.in", "japi.org",
                 "dams.co.in", "msdmanuals.com", "base-search.net", "litfl.com",
                 "medindia.net", "whocc.no"]
    print("\n--- IDENTITY CHECK (page titles) ---")
    for d in uncertain:
        print(f"{d:<22} -> {title_of(f'https://{d}/')}")


if __name__ == "__main__":
    main()
