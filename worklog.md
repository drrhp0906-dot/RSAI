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
