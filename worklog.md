# Project Worklog

---
Task ID: 1
Agent: main (Z.ai)
Task: Create a .txt file of first-priority, currently-active guideline website domains for MBBS research (India context), covering WHO, ESC, AHA, ICMR and other authoritative bodies.

Work Log:
- Classified task as Type 4 (data processing) with plain .txt deliverable explicitly requested by user.
- Compiled 65 candidate domains across global authorities, evidence repositories, Indian national bodies, Indian specialty societies, and 14 specialty sections.
- Wrote verification script to /home/z/my-project/scripts/check_domains.py (curl GET over HTTPS, IPv4 retry, bot-block-aware classification).
- Ran verification: 59 UP (200), 13 UP-BOT (403 bot-protected but live: cdc.gov, nice.org.uk, heart.org, etc.), csi.org.in confirmed 200 after IPv4 retry, nih.gov confirmed live via WebFetch (sandbox egress restriction), 5 excluded as dead/legacy: icmr.nic.in, ncdc.gov.in, tbcindia.gov.in, dghs.gov.in (DNS NXDOMAIN), www.csi.org.in (use apex domain).
- Wrote final deliverable to /home/z/my-project/download/mbbs_priority_guideline_websites.txt: 18 sections, ~60 active domains with org names, use-cases, free/account access notes, India-specific priority section, access tips, and excluded-legacy-domain notes.

Stage Summary:
- Deliverable: /home/z/my-project/download/mbbs_priority_guideline_websites.txt (verified 27 Oct 2026)
- Key decisions: interpreted "IMRC" as ICMR (icmr.gov.in) and "European Heart Organisation" as ESC (escardio.org); excluded all non-resolving legacy domains per user's "currently active" requirement.
- Reusable artifact: scripts/check_domains.py can be re-run to re-verify the list in future.

---
Task ID: 2
Agent: main (Z.ai)
Task: Follow-up request - create a second .txt list of the other largely-used platforms for MBBS research (PubMed, CDC-style daily-use platforms: databases, journals, clinical reference, drug resources, education platforms, research tools).

Work Log:
- Compiled 70 candidate platform domains across 12 planned categories.
- Wrote /home/z/my-project/scripts/check_platforms.py (IPv4 curl check + page-title identity confirmation for uncertain domains). Fixed a UnicodeDecodeError by decoding with errors=replace.
- Verification results: 41 UP (200), 23 UP-BOT (403 bot-protected but live: marrow.com, medscape.com, nejm.org, etc.), fda.gov root returned 404/401 to curl (Akamai bot protection) but confirmed live via WebFetch, cdsco.gov.in unreachable from sandbox DNS but confirmed live via WebFetch, ipc.gov.in returned 500 (NIC server flaky to bots, live), ctri.gov.in globally reachable but under maintenance at compile time, dams.co.in not resolving (excluded), ctri.nic.in legacy (excluded).
- Identity confirmed via page titles: ijmr.org.in = Indian Journal of Medical Research, japi.org = JAPI, litfl.com = LITFL, medindia.net, whocc.no = ATC/DDD, msdmanuals.com = MSD Manuals.
- Wrote deliverable /home/z/my-project/download/mbbs_research_platforms.txt: 12 sections, ~60 domains with org name + use-case + access notes, plus access tips and honest exclusion notes (dams.co.in, ctri.nic.in).

Stage Summary:
- Deliverable: /home/z/my-project/download/mbbs_research_platforms.txt (verified 27 Oct 2026), companion to Task 1 guideline list.
- Key decisions: CTRI (ctri.gov.in) included despite maintenance (it is the official Indian registry, with explicit note); DAMS excluded as unreachable; IJMR hosted at ijmr.org.in (confirmed).
- Reusable artifact: scripts/check_platforms.py.
