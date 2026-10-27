#!/usr/bin/env python3
"""Verify that candidate guideline-website domains are currently active.
Checks each domain over HTTPS with curl (GET, follow redirects).
Classification:
  UP        -> responded 2xx/3xx
  UP-BOT    -> responded 401/403/406/429 (server live, blocks bots)
  FLAKY     -> 5xx after one retry
  DEAD      -> DNS failure / timeout / no connection
"""

import subprocess
import concurrent.futures

CANDIDATES = [
    # --- Global health authorities ---
    "who.int",
    "cdc.gov",
    "nih.gov",
    "nhlbi.nih.gov",
    "wma.net",
    # --- Evidence & guideline repositories ---
    "cochranelibrary.com",
    "nice.org.uk",
    "sign.ac.uk",
    "g-i-n.net",
    "pubmed.ncbi.nlm.nih.gov",
    "scholar.google.com",
    # --- India: national bodies ---
    "icmr.gov.in",
    "icmr.nic.in",
    "mohfw.gov.in",
    "dghs.gov.in",
    "ncdc.mohfw.gov.in",
    "ncdc.gov.in",
    "nhm.gov.in",
    "tbcindia.mohfw.gov.in",
    "tbcindia.gov.in",
    # --- India: specialty societies ---
    "apiindia.org",
    "iapindia.org",
    "csi.org.in",
    "fogsi.org",
    "nimhans.ac.in",
    "indianpediatrics.net",
    "iadvl.org",
    # --- Cardiology ---
    "escardio.org",
    "heart.org",
    "professional.heart.org",
    "acc.org",
    # --- Respiratory ---
    "goldcopd.org",
    "ginasthma.org",
    "thoracic.org",
    "ersnet.org",
    # --- Infectious disease ---
    "idsociety.org",
    "clinicalinfo.hiv.gov",
    # --- Endocrine / metabolic ---
    "diabetes.org",
    "idf.org",
    "endocrine.org",
    # --- Nephrology ---
    "kdigo.org",
    # --- GI / hepatology ---
    "easl.eu",
    "aasld.org",
    "gi.org",
    "gastro.org",
    "worldgastroenterology.org",
    # --- Haematology / oncology ---
    "hematology.org",
    "asco.org",
    "esmo.org",
    "nccn.org",
    # --- OB-GYN / paediatrics ---
    "acog.org",
    "rcog.org.uk",
    "aap.org",
    # --- Neuro / psychiatry ---
    "psychiatry.org",
    # --- Anaesthesia / critical care ---
    "asahq.org",
    "wfsahq.org",
    "sccm.org",
    "esicm.org",
    # --- Derm / urology ---
    "aad.org",
    "eadv.org",
    "uroweb.org",
    "auanet.org",
    # --- Bonus clinical reference (paid/institutional) ---
    "uptodate.com",
    "bestpractice.bmj.com",
    "medscape.com",
]

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def check(domain: str) -> tuple[str, str, str]:
    """Return (domain, classification, http_code_or_error)."""
    cmd = [
        "curl", "-s", "-o", "/dev/null", "-L", "--max-time", "15", "--retry", "0",
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
    if code in {"401", "403", "406", "429"}:
        return (domain, "UP-BOT", code)
    if code.startswith("5"):
        # one retry for server errors
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            code2 = out.stdout.strip()
        except subprocess.TimeoutExpired:
            return (domain, "DEAD", "timeout")
        if code2.startswith(("2", "3")):
            return (domain, "UP", code2)
        if code2 in {"401", "403", "406", "429"}:
            return (domain, "UP-BOT", code2)
        return (domain, "FLAKY", code2 or code)
    # other 4xx (404 on root path is common on sites with routed homepages)
    return (domain, "CHECK-404", code)


def main():
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for res in ex.map(check, CANDIDATES):
            results.append(res)

    order = {"UP": 0, "UP-BOT": 1, "CHECK-404": 2, "FLAKY": 3, "DEAD": 4}
    results.sort(key=lambda r: (order[r[1]], r[0]))

    print(f"{'STATUS':<10} {'CODE':<7} DOMAIN")
    print("-" * 55)
    for domain, status, code in results:
        print(f"{status:<10} {code:<7} {domain}")

    dead = [d for d, s, _ in results if s == "DEAD"]
    flaky = [d for d, s, _ in results if s == "FLAKY"]
    c404 = [d for d, s, _ in results if s == "CHECK-404"]
    print("\n--- SUMMARY ---")
    print(f"Total checked : {len(results)}")
    print(f"UP            : {len(results) - len(dead) - len(flaky) - len(c404)}")
    print(f"CHECK-404     : {c404}")
    print(f"FLAKY         : {flaky}")
    print(f"DEAD          : {dead}")


if __name__ == "__main__":
    main()
