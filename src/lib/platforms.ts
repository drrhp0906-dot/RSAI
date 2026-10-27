// ============================================================
// Platform catalog: Priority-1 guideline bodies + Priority-2
// widely-used platforms (from the two verified .txt lists).
// Used by the router step to pick where to search, and by the
// credibility engine to score evidence / images.
// ============================================================

export interface Platform {
  domain: string;
  name: string;
  category: string;
  tier: 1 | 2; // 1 = first-priority guideline body, 2 = widely-used platform
  baseTrust: number; // 0-100
  keywords: string[]; // topic routing keywords (lowercase)
  note?: string;
}

export const PRIORITY_1: Platform[] = [
  // --- Global health authorities ---
  { domain: "who.int", name: "World Health Organization", category: "Global authority", tier: 1, baseTrust: 97, keywords: ["global", "outbreak", "tb", "hiv", "malaria", "icd", "public health", "epidemiology", "vaccination", "guideline"] },
  { domain: "cdc.gov", name: "US CDC", category: "Global authority", tier: 1, baseTrust: 94, keywords: ["infectious", "vaccine", "immunization", "epidemiology", "surveillance", "travel medicine"] },
  { domain: "nih.gov", name: "US NIH", category: "Global authority", tier: 1, baseTrust: 94, keywords: ["research", "consensus", "health topics"] },
  { domain: "nhlbi.nih.gov", name: "NHLBI", category: "Global authority", tier: 1, baseTrust: 93, keywords: ["cardiovascular", "asthma", "cholesterol", "blood pressure", "lung", "blood"] },
  { domain: "wma.net", name: "World Medical Association", category: "Ethics", tier: 1, baseTrust: 92, keywords: ["ethics", "helsinki", "consent"] },
  // --- Evidence repositories ---
  { domain: "cochranelibrary.com", name: "Cochrane Library", category: "Evidence repository", tier: 1, baseTrust: 96, keywords: ["systematic review", "meta-analysis", "evidence", "any"] },
  { domain: "nice.org.uk", name: "NICE (UK)", category: "Evidence repository", tier: 1, baseTrust: 95, keywords: ["guideline", "management", "treatment", "any"] },
  { domain: "sign.ac.uk", name: "SIGN (Scotland)", category: "Evidence repository", tier: 1, baseTrust: 92, keywords: ["guideline", "evidence"] },
  { domain: "g-i-n.net", name: "Guidelines International Network", category: "Evidence repository", tier: 1, baseTrust: 88, keywords: ["guideline"] },
  { domain: "pubmed.ncbi.nlm.nih.gov", name: "PubMed", category: "Evidence repository", tier: 1, baseTrust: 93, keywords: ["any"] },
  { domain: "scholar.google.com", name: "Google Scholar", category: "Evidence repository", tier: 1, baseTrust: 75, keywords: ["any"] },
  // --- India national bodies ---
  { domain: "icmr.gov.in", name: "ICMR", category: "India national", tier: 1, baseTrust: 95, keywords: ["india", "icmr", "dengue", "tb", "tuberculosis", "antimicrobial", "stewardship", "ethics", "national"] },
  { domain: "mohfw.gov.in", name: "MoHFW India", category: "India national", tier: 1, baseTrust: 95, keywords: ["india", "national program", "standard treatment", "guideline", "health policy"] },
  { domain: "ncdc.mohfw.gov.in", name: "NCDC India", category: "India national", tier: 1, baseTrust: 93, keywords: ["india", "outbreak", "dengue", "chikungunya", "leprosy", "surveillance"] },
  { domain: "nhm.gov.in", name: "National Health Mission", category: "India national", tier: 1, baseTrust: 91, keywords: ["india", "programme", "rmnch", "ncd"] },
  { domain: "tbcindia.mohfw.gov.in", name: "NTEP (TB India)", category: "India national", tier: 1, baseTrust: 94, keywords: ["tb", "tuberculosis", "ntep", "nikshay", "india"] },
  { domain: "nimhans.ac.in", name: "NIMHANS", category: "India national", tier: 1, baseTrust: 90, keywords: ["psychiatry", "mental health", "india"] },
  // --- India specialty societies ---
  { domain: "apiindia.org", name: "API (Physicians of India)", category: "India society", tier: 1, baseTrust: 88, keywords: ["india", "internal medicine", "physicians"] },
  { domain: "csi.org.in", name: "Cardiological Society of India", category: "India society", tier: 1, baseTrust: 88, keywords: ["cardiology", "heart", "india"] },
  { domain: "iapindia.org", name: "Indian Academy of Pediatrics", category: "India society", tier: 1, baseTrust: 89, keywords: ["pediatrics", "paediatrics", "child", "immunization", "india"] },
  { domain: "indianpediatrics.net", name: "Indian Pediatrics", category: "India society", tier: 1, baseTrust: 87, keywords: ["pediatrics", "paediatrics", "india"] },
  { domain: "fogsi.org", name: "FOGSI", category: "India society", tier: 1, baseTrust: 86, keywords: ["obstetrics", "gynaecology", "pregnancy", "india"] },
  { domain: "iadvl.org", name: "IADVL", category: "India society", tier: 1, baseTrust: 85, keywords: ["dermatology", "skin", "leprosy", "india"] },
  // --- Cardiology ---
  { domain: "escardio.org", name: "ESC (European Society of Cardiology)", category: "Cardiology", tier: 1, baseTrust: 96, keywords: ["cardiology", "heart", "af", "heart failure", "acs", "hypertension", "guideline"] },
  { domain: "professional.heart.org", name: "AHA Professional", category: "Cardiology", tier: 1, baseTrust: 95, keywords: ["cardiology", "acls", "cpr", "cholesterol", "blood pressure", "heart failure"] },
  { domain: "heart.org", name: "American Heart Association", category: "Cardiology", tier: 1, baseTrust: 93, keywords: ["heart", "stroke", "cardiology"] },
  { domain: "acc.org", name: "ACC", category: "Cardiology", tier: 1, baseTrust: 94, keywords: ["cardiology", "guideline", "chest pain", "valve"] },
  // --- Respiratory ---
  { domain: "goldcopd.org", name: "GOLD (COPD)", category: "Respiratory", tier: 1, baseTrust: 94, keywords: ["copd", "respiratory"] },
  { domain: "ginasthma.org", name: "GINA (Asthma)", category: "Respiratory", tier: 1, baseTrust: 94, keywords: ["asthma", "respiratory"] },
  { domain: "thoracic.org", name: "ATS", category: "Respiratory", tier: 1, baseTrust: 92, keywords: ["lung", "respiratory", "icu"] },
  { domain: "ersnet.org", name: "ERS", category: "Respiratory", tier: 1, baseTrust: 91, keywords: ["lung", "respiratory"] },
  // --- Infectious disease ---
  { domain: "idsociety.org", name: "IDSA", category: "Infectious disease", tier: 1, baseTrust: 93, keywords: ["antibiotic", "infection", "sepsis", "hiv", "opportunistic"] },
  { domain: "clinicalinfo.hiv.gov", name: "NIH HIV/OI Guidelines", category: "Infectious disease", tier: 1, baseTrust: 93, keywords: ["hiv", "aids", "opportunistic"] },
  // --- Endocrine / metabolic ---
  { domain: "diabetes.org", name: "ADA", category: "Endocrine", tier: 1, baseTrust: 94, keywords: ["diabetes", "insulin", "glycemic"] },
  { domain: "idf.org", name: "IDF", category: "Endocrine", tier: 1, baseTrust: 90, keywords: ["diabetes", "global"] },
  { domain: "endocrine.org", name: "Endocrine Society", category: "Endocrine", tier: 1, baseTrust: 92, keywords: ["thyroid", "adrenal", "pcos", "osteoporosis", "hormone"] },
  // --- Nephrology / GI / Hepatology ---
  { domain: "kdigo.org", name: "KDIGO", category: "Nephrology", tier: 1, baseTrust: 93, keywords: ["kidney", "ckd", "aki", "glomerulonephritis", "transplant"] },
  { domain: "easl.eu", name: "EASL", category: "Hepatology", tier: 1, baseTrust: 92, keywords: ["liver", "hepatitis", "cirrhosis", "nafld"] },
  { domain: "aasld.org", name: "AASLD", category: "Hepatology", tier: 1, baseTrust: 92, keywords: ["liver", "hepatitis"] },
  { domain: "gi.org", name: "ACG", category: "Gastroenterology", tier: 1, baseTrust: 91, keywords: ["gerd", "ibd", "gi bleed", "colon", "gastro"] },
  { domain: "gastro.org", name: "AGA", category: "Gastroenterology", tier: 1, baseTrust: 90, keywords: ["gastro", "gi"] },
  { domain: "worldgastroenterology.org", name: "WGO", category: "Gastroenterology", tier: 1, baseTrust: 88, keywords: ["gastro", "global"] },
  // --- Haematology / Oncology ---
  { domain: "hematology.org", name: "ASH", category: "Haematology", tier: 1, baseTrust: 92, keywords: ["anemia", "anaemia", "sickle", "vte", "clotting", "itp", "leukemia"] },
  { domain: "asco.org", name: "ASCO", category: "Oncology", tier: 1, baseTrust: 92, keywords: ["cancer", "oncology", "chemotherapy"] },
  { domain: "esmo.org", name: "ESMO", category: "Oncology", tier: 1, baseTrust: 92, keywords: ["cancer", "oncology"] },
  { domain: "nccn.org", name: "NCCN", category: "Oncology", tier: 1, baseTrust: 92, keywords: ["cancer", "oncology", "staging"] },
  // --- OB-GYN / Pediatrics / Psychiatry ---
  { domain: "acog.org", name: "ACOG", category: "OB-GYN", tier: 1, baseTrust: 93, keywords: ["pregnancy", "obstetric", "pph", "ectopic", "antenatal"] },
  { domain: "rcog.org.uk", name: "RCOG", category: "OB-GYN", tier: 1, baseTrust: 92, keywords: ["pregnancy", "obstetric", "gynaecology"] },
  { domain: "aap.org", name: "AAP", category: "Pediatrics", tier: 1, baseTrust: 92, keywords: ["pediatrics", "paediatrics", "child", "newborn"] },
  { domain: "psychiatry.org", name: "APA (Psychiatry)", category: "Psychiatry", tier: 1, baseTrust: 91, keywords: ["psychiatry", "depression", "schizophrenia", "dsm"] },
  // --- Anaesthesia / Critical care ---
  { domain: "asahq.org", name: "ASA (Anesthesiologists)", category: "Anaesthesia", tier: 1, baseTrust: 92, keywords: ["anesthesia", "anaesthesia", "airway", "monitoring"] },
  { domain: "wfsahq.org", name: "WFSA", category: "Anaesthesia", tier: 1, baseTrust: 89, keywords: ["anesthesia", "anaesthesia", "global"] },
  { domain: "sccm.org", name: "SCCM", category: "Critical care", tier: 1, baseTrust: 92, keywords: ["sepsis", "icu", "critical care"] },
  { domain: "esicm.org", name: "ESICM", category: "Critical care", tier: 1, baseTrust: 90, keywords: ["icu", "critical care"] },
  // --- Derm / Urology ---
  { domain: "aad.org", name: "AAD", category: "Dermatology", tier: 1, baseTrust: 91, keywords: ["skin", "psoriasis", "acne", "melanoma"] },
  { domain: "uroweb.org", name: "EAU", category: "Urology", tier: 1, baseTrust: 91, keywords: ["urology", "bph", "stones", "prostate"] },
  { domain: "auanet.org", name: "AUA", category: "Urology", tier: 1, baseTrust: 90, keywords: ["urology", "psa", "stones"] },
];

export const PRIORITY_2: Platform[] = [
  // --- Research databases ---
  { domain: "pubmed.ncbi.nlm.nih.gov", name: "PubMed Central access via NLM", category: "Research database", tier: 2, baseTrust: 92, keywords: ["any", "research", "papers"] },
  { domain: "pmc.ncbi.nlm.nih.gov", name: "PubMed Central", category: "Research database", tier: 2, baseTrust: 92, keywords: ["any", "full text", "papers"] },
  { domain: "semanticscholar.org", name: "Semantic Scholar", category: "Research database", tier: 2, baseTrust: 82, keywords: ["papers", "ai", "summary"] },
  { domain: "europepmc.org", name: "Europe PMC", category: "Research database", tier: 2, baseTrust: 88, keywords: ["papers", "europe"] },
  { domain: "medlineplus.gov", name: "MedlinePlus", category: "Research database", tier: 2, baseTrust: 88, keywords: ["patient education", "basics"] },
  { domain: "clinicaltrials.gov", name: "ClinicalTrials.gov", category: "Trials registry", tier: 2, baseTrust: 93, keywords: ["trial", "drug", "intervention", "phase"] },
  { domain: "ctri.gov.in", name: "CTRI (India)", category: "Trials registry", tier: 2, baseTrust: 90, keywords: ["india", "trial"] },
  // --- Journals ---
  { domain: "nejm.org", name: "NEJM", category: "Journal", tier: 2, baseTrust: 95, keywords: ["trial", "research", "case"] },
  { domain: "thelancet.com", name: "The Lancet", category: "Journal", tier: 2, baseTrust: 95, keywords: ["trial", "global health", "research"] },
  { domain: "bmj.com", name: "BMJ", category: "Journal", tier: 2, baseTrust: 94, keywords: ["research", "practice", "trial"] },
  { domain: "jamanetwork.com", name: "JAMA Network", category: "Journal", tier: 2, baseTrust: 94, keywords: ["trial", "research"] },
  { domain: "nature.com", name: "Nature Portfolio", category: "Journal", tier: 2, baseTrust: 94, keywords: ["basic science", "research"] },
  { domain: "plos.org", name: "PLOS", category: "Journal", tier: 2, baseTrust: 86, keywords: ["open access", "research"] },
  { domain: "ijmr.org.in", name: "Indian Journal of Medical Research", category: "India journal", tier: 2, baseTrust: 90, keywords: ["india", "research"] },
  { domain: "japi.org", name: "JAPI", category: "India journal", tier: 2, baseTrust: 86, keywords: ["india", "internal medicine"] },
  { domain: "indianpediatrics.net", name: "Indian Pediatrics", category: "India journal", tier: 2, baseTrust: 87, keywords: ["india", "pediatrics"] },
  // --- Point-of-care reference ---
  { domain: "medscape.com", name: "Medscape", category: "Clinical reference", tier: 2, baseTrust: 80, keywords: ["drug", "overview", "workup", "treatment"] },
  { domain: "merckmanuals.com", name: "Merck Manuals", category: "Clinical reference", tier: 2, baseTrust: 86, keywords: ["overview", "basics", "treatment"] },
  { domain: "dermnetnz.org", name: "DermNet", category: "Clinical reference", tier: 2, baseTrust: 82, keywords: ["dermatology", "skin", "rash"] },
  { domain: "radiopaedia.org", name: "Radiopaedia", category: "Clinical reference", tier: 2, baseTrust: 80, keywords: ["radiology", "imaging", "ct", "mri", "x-ray"] },
  { domain: "litfl.com", name: "LITFL", category: "Clinical reference", tier: 2, baseTrust: 78, keywords: ["ecg", "icu", "toxicology"] },
  // --- Drugs ---
  { domain: "drugs.com", name: "Drugs.com", category: "Drug reference", tier: 2, baseTrust: 78, keywords: ["drug", "dose", "interaction", "side effect"] },
  { domain: "mims.com", name: "MIMS India", category: "Drug reference", tier: 2, baseTrust: 78, keywords: ["india", "brand", "drug", "dose"] },
  { domain: "dailymed.nlm.nih.gov", name: "DailyMed", category: "Drug reference", tier: 2, baseTrust: 90, keywords: ["drug label", "fda"] },
  { domain: "fda.gov", name: "US FDA", category: "Drug regulator", tier: 2, baseTrust: 93, keywords: ["drug approval", "recall", "safety"] },
  { domain: "cdsco.gov.in", name: "CDSCO India", category: "Drug regulator", tier: 2, baseTrust: 90, keywords: ["india", "drug approval", "recall"] },
  { domain: "ipc.gov.in", name: "Indian Pharmacopoeia Commission", category: "Drug regulator", tier: 2, baseTrust: 88, keywords: ["india", "formulary", "nfi", "pharmacopoeia"] },
  // --- Education / Indian test-prep (low trust for clinical claims, useful for learning) ---
  { domain: "osmosis.org", name: "Osmosis", category: "Education", tier: 2, baseTrust: 70, keywords: ["learn", "video", "pathophysiology"] },
  { domain: "lecturio.com", name: "Lecturio", category: "Education", tier: 2, baseTrust: 68, keywords: ["learn", "video"] },
  { domain: "amboss.com", name: "AMBOSS", category: "Education", tier: 2, baseTrust: 78, keywords: ["library", "qbank", "learn"] },
  { domain: "teachmeanatomy.info", name: "TeachMeAnatomy", category: "Education", tier: 2, baseTrust: 72, keywords: ["anatomy"] },
  { domain: "geekymedics.com", name: "Geeky Medics", category: "Education", tier: 2, baseTrust: 72, keywords: ["osce", "clinical skills"] },
  { domain: "zerotofinals.com", name: "Zero To Finals", category: "Education", tier: 2, baseTrust: 70, keywords: ["notes", "learn", "medicine"] },
  { domain: "marrow.com", name: "Marrow", category: "India education", tier: 2, baseTrust: 62, keywords: ["india", "neet pg", "qbank", "video"] },
  { domain: "prepladder.com", name: "PrepLadder", category: "India education", tier: 2, baseTrust: 60, keywords: ["india", "neet pg", "qbank"] },
  // --- India regulatory ---
  { domain: "nmc.org.in", name: "National Medical Commission", category: "India regulator", tier: 2, baseTrust: 90, keywords: ["india", "curriculum", "cbme", "regulation"] },
  { domain: "natboard.edu.in", name: "NBEMS", category: "India regulator", tier: 2, baseTrust: 89, keywords: ["india", "neet pg", "fmge", "exam"] },
  // --- News ---
  { domain: "medpagetoday.com", name: "MedPage Today", category: "News", tier: 2, baseTrust: 70, keywords: ["news", "conference"] },
  { domain: "medindia.net", name: "Medindia", category: "News", tier: 2, baseTrust: 64, keywords: ["india", "news", "consumer"] },
];

export const ALL_PLATFORMS: Platform[] = [...PRIORITY_1, ...PRIORITY_2];

export function findByDomain(domain: string): Platform | undefined {
  const d = domain.replace(/^www\./, "").toLowerCase();
  return ALL_PLATFORMS.find((p) => p.domain.replace(/^www\./, "") === d);
}

// ---------- Credibility engine ----------

const EXTRA_TRUSTED_SUFFIXES = [".gov", ".gov.in", ".edu", ".ac.uk", ".edu.in", ".nic.in", ".int", ".europa.eu"];

export function domainTrust(domain: string, tier?: 1 | 2): number {
  const d = domain.replace(/^www\./, "").toLowerCase();
  const p = findByDomain(d);
  if (p) return Math.min(99, p.baseTrust);
  if (EXTRA_TRUSTED_SUFFIXES.some((s) => d.endsWith(s))) return 90;
  if (/\.(edu|ac)\.[a-z]{2}$/.test(d)) return 88;
  // Known major journal publishers
  if (/(oup|lww|springer|elsevier|wiley|tandf|sagepub|journals)\./.test(d)) return 82;
  if (d.endsWith(".org")) return 65;
  if (d.endsWith(".com")) return 55;
  return 50;
}

export function imageTrust(sourceDomain: string | undefined): { score: number; reason: string } {
  if (!sourceDomain) return { score: 25, reason: "Unknown source - removed for credibility" };
  const d = sourceDomain.replace(/^www\./, "").toLowerCase();
  const p = findByDomain(d);
  if (p && p.tier === 1) {
    return { score: Math.min(99, p.baseTrust), reason: `Source is a Priority-1 guideline body (${p.name})` };
  }
  if (EXTRA_TRUSTED_SUFFIXES.some((s) => d.endsWith(s))) {
    return { score: 90, reason: "Source is a government / academic domain" };
  }
  const score = domainTrust(d);
  if (score >= 80) return { score, reason: "Source is a recognised medical platform or journal" };
  return { score, reason: "Source is a general-purpose site - below credibility threshold" };
}

/** Heuristic keyword router used as fallback and as a hint for the LLM router. */
export function heuristicRoute(query: string): Platform[] {
  const q = query.toLowerCase();
  const scored = ALL_PLATFORMS.map((p) => {
    let score = 0;
    for (const kw of p.keywords) {
      if (kw === "any") {
        score += p.tier === 1 ? 1 : 0.5;
        continue;
      }
      if (q.includes(kw)) score += kw.includes(" ") ? 3 : 2;
    }
    if (q.includes("india") && p.keywords.includes("india")) score += 2;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score || a.p.tier - b.p.tier);
  const picked = scored.filter((s) => s.score > 0).slice(0, 6).map((s) => s.p);
  const defaults = [
    PRIORITY_1.find((p) => p.domain === "who.int")!,
    PRIORITY_1.find((p) => p.domain === "nice.org.uk")!,
    PRIORITY_1.find((p) => p.domain === "pubmed.ncbi.nlm.nih.gov")!,
  ];
  for (const d of defaults) {
    if (picked.length >= 5) break;
    if (!picked.includes(d)) picked.push(d);
  }
  return picked.slice(0, 6);
}
