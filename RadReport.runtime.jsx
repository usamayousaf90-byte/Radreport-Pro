const { useState, useRef, useEffect, useCallback } = React;

/* ── Fonts ── */
const _f = document.createElement("link");
_f.rel = "stylesheet";
_f.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap";
document.head.appendChild(_f);

/* ══════════════════════════════════
   GLOBAL STYLES
══════════════════════════════════ */
const CSS = `
  *{box-sizing:border-box;}
  body{margin:0;}
  @media print{.np{display:none!important;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes aiGlow{0%,100%{box-shadow:0 0 6px rgba(91,33,182,.4);}50%{box-shadow:0 0 22px rgba(91,33,182,.9);}}
  @keyframes micPulse{0%,100%{box-shadow:0 0 0 3px rgba(220,38,38,.35);}50%{box-shadow:0 0 0 9px rgba(220,38,38,.12);}}
  @keyframes slideUp{from{transform:translateY(16px);opacity:0;}to{transform:translateY(0);opacity:1;}}
  @keyframes breathe{0%,100%{opacity:.6;}50%{opacity:1;}}
  .ri:focus{border-color:#4F46E5!important;box-shadow:0 0 0 3px rgba(79,70,229,.12)!important;outline:none;}
  .hm:hover{transform:translateY(-2px);box-shadow:var(--sh)!important;}
  .hm{transition:all .2s;cursor:pointer;}
  .hr:hover{border-color:var(--hc)!important;background:var(--hbg)!important;}
  .hr{transition:all .18s;cursor:pointer;}

  /* ── Home page animations ── */
  @keyframes fadeUp{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes fadeLeft{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}

  /* ECG heartbeat trace */
  @keyframes ecgDraw{
    0%{stroke-dashoffset:900;}
    60%{stroke-dashoffset:0;}
    100%{stroke-dashoffset:0;}
  }
  @keyframes ecgFade{
    0%,50%{opacity:1;}
    90%,100%{opacity:0;}
  }

  /* Sonar pulse rings */
  @keyframes sonarPulse{
    0%{transform:scale(.3);opacity:.9;}
    100%{transform:scale(1);opacity:0;}
  }

  /* Floating orbs */
  @keyframes orbFloat{
    0%,100%{transform:translate(0,0) scale(1);}
    33%{transform:translate(24px,-18px) scale(1.05);}
    66%{transform:translate(-16px,22px) scale(.96);}
  }

  /* Card hover */
  .mc{transition:all .35s cubic-bezier(.34,1.4,.64,1);cursor:pointer;position:relative;}
  .mc:hover{transform:translateY(-8px) scale(1.015);}
  .mc:hover .mc-cta{opacity:1;transform:translateX(0);}
  .mc:hover .mc-glow{opacity:1;}
  .mc-cta{opacity:0;transform:translateX(-6px);transition:all .25s ease;}
  .mc-glow{opacity:0;transition:opacity .35s ease;}

  /* Scan line sweep */
  @keyframes scanSweep{
    0%{transform:translateY(-100%);opacity:0;}
    10%{opacity:.7;}
    90%{opacity:.7;}
    100%{transform:translateY(100vh);opacity:0;}
  }

  /* Ticker scroll */
  @keyframes tickerScroll{
    0%{transform:translateX(0);}
    100%{transform:translateX(-50%);}
  }

  /* Number pop */
  @keyframes numPop{
    0%{opacity:0;transform:scale(.7) translateY(8px);}
    70%{transform:scale(1.08) translateY(-2px);}
    100%{opacity:1;transform:scale(1) translateY(0);}
  }

  /* Dot grid pulse */
  @keyframes dotPulse{
    0%,100%{opacity:.12;}
    50%{opacity:.28;}
  }

  /* Glow border */
  @keyframes borderGlow{
    0%,100%{box-shadow:0 0 0 0 var(--gc,rgba(0,180,216,.3));}
    50%{box-shadow:0 0 0 6px var(--gc,rgba(0,180,216,0));}
  }
`;

/* ══════════════════════════════════════════════════════
   FIELD SUGGESTIONS LOOKUP
   Key = lowercase field name
   k: 'n'=normal(green), 'ab'=abnormal(red), 'i'=info(grey)
══════════════════════════════════════════════════════ */
const FS = {
  "_default": [{t:"Within normal limits",k:"n"},{t:"Unremarkable",k:"n"},{t:"Abnormal finding — further evaluation",k:"ab"},{t:"Correlate clinically",k:"i"}],
  "4-chamber view": [{t:"Normal 4-chamber view",k:"n"}, {t:"Abnormal \u2014 cardiology referral",k:"ab"}, {t:"Cardiomegaly",k:"ab"}, {t:"Hypoplastic left heart",k:"ab"}, {t:"VSD suspected",k:"ab"}],
  "a-wave (positive/absent/reversed)": [{t:"Positive a-wave \u2014 normal",k:"n"}, {t:"Absent a-wave \u2014 increased risk",k:"i"}, {t:"Reversed a-wave \u2014 pre-terminal \u2014 emergency",k:"ab"}],
  "abi left": [{t:"Normal >0.9",k:"n"}, {t:"Borderline 0.8\u20130.9",k:"i"}, {t:"Mild PAD 0.6\u20130.8",k:"ab"}, {t:"Moderate PAD 0.4\u20130.6",k:"ab"}, {t:"Severe PAD <0.4",k:"ab"}],
  "abi right": [{t:"Normal >0.9",k:"n"}, {t:"Borderline 0.8\u20130.9",k:"i"}, {t:"Mild PAD 0.6\u20130.8",k:"ab"}, {t:"Moderate PAD 0.4\u20130.6",k:"ab"}, {t:"Severe PAD <0.4",k:"ab"}],
  "aca resistive index": [{t:"Normal RI 0.6\u20130.8 neonatal",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Elevated \u2014 raised ICP?",k:"ab"}, {t:"Low \u2014 hyperperfusion/luxury perfusion",k:"ab"}],
  "acceleration time (ms)": [{t:"Normal <70 ms",k:"n"}, {t:"Borderline 70\u2013100 ms",k:"i"}, {t:"Prolonged >100 ms \u2014 parvus-tardus \u2014 RAS?",k:"ab"}],
  "accessory spleen": [{t:"Not seen",k:"n"}, {t:"Accessory spleen \u2014 incidental",k:"i"}, {t:"Multiple accessory spleens",k:"ab"}],
  "adequacy of sample (if aspirate)": [{t:"Adequate sample \u2014 sent to laboratory",k:"n"}, {t:"Borderline adequacy",k:"i"}, {t:"Inadequate \u2014 repeat required",k:"ab"}],
  "adrenals": [{t:"Not seen \u2014 normal",k:"n"}, {t:"Possible thickening",k:"i"}, {t:"Adrenal mass",k:"ab"}, {t:"Adrenal haemorrhage",k:"ab"}],
  "afi (cm)": [{t:"Normal 8\u201318 cm",k:"n"}, {t:"Low-normal 5\u20138 cm",k:"i"}, {t:"Oligohydramnios <5 cm",k:"ab"}, {t:"Polyhydramnios >25 cm",k:"ab"}],
  "afi/mvp": [{t:"Normal liquor volume",k:"n"}, {t:"Mildly reduced",k:"i"}, {t:"Mildly increased",k:"i"}, {t:"Oligohydramnios",k:"ab"}, {t:"Polyhydramnios",k:"ab"}],
  "afoul/mvp": [{t:"Normal liquor volume",k:"n"}, {t:"Mildly reduced",k:"i"}, {t:"Mildly increased",k:"i"}, {t:"Oligohydramnios",k:"ab"}, {t:"Polyhydramnios",k:"ab"}],
  "air bronchograms": [{t:"Not seen",k:"n"}, {t:"Dynamic air bronchograms \u2014 pneumonia",k:"i"}, {t:"Static air bronchograms \u2014 obstructive atelectasis",k:"ab"}],
  "air-fluid levels": [{t:"Not seen",k:"n"}, {t:"Single \u2014 non-specific",k:"i"}, {t:"Multiple \u2014 obstruction",k:"ab"}, {t:"Ladder-type pattern",k:"ab"}],
  "airspace opacity": [{t:"Not seen",k:"n"}, {t:"Haziness \u2014 early consolidation?",k:"i"}, {t:"Consolidation",k:"ab"}, {t:"Collapse/consolidation",k:"ab"}],
  "alpha angle (degrees)": [{t:"Normal \u226560\u00b0 \u2014 Graf type I",k:"n"}, {t:"Physiological 50\u201359\u00b0 \u2014 Graf IIa/b",k:"i"}, {t:"Deficient <50\u00b0 \u2014 Graf IIc or worse",k:"ab"}, {t:"Critical <43\u00b0 \u2014 urgent orthopaedic referral",k:"ab"}],
  "amniotic fluid index (afi) (cm)": [{t:"Normal 8\u201318 cm",k:"n"}, {t:"Low-normal 5\u20138 cm",k:"i"}, {t:"Oligohydramnios <5 cm",k:"ab"}, {t:"Polyhydramnios >25 cm",k:"ab"}],
  "anastomosis patency": [{t:"Patent \u2014 normal waveform",k:"n"}, {t:"Stenosis suspected",k:"ab"}, {t:"Thrombosis \u2014 absent flow",k:"ab"}],
  "anterior tibial artery": [{t:"Patent \u2014 monophasic acceptable distally",k:"n"}, {t:"Reduced flow",k:"i"}, {t:"Absent \u2014 occlusion",k:"ab"}, {t:"Not visualised",k:"ab"}],
  "anterior wall intact": [{t:"Intact",k:"n"}, {t:"Gastroschisis \u2014 no membrane",k:"ab"}, {t:"Exomphalos \u2014 membrane-covered",k:"ab"}],
  "aortic diameter": [{t:"Normal <3 cm",k:"n"}, {t:"Mildly dilated 3.0\u20134.4 cm",k:"i"}, {t:"AAA \u22653 cm",k:"ab"}, {t:"Large AAA >5.5 cm \u2014 urgent surgical referral",k:"ab"}],
  "appendicolith": [{t:"Not seen",k:"n"}, {t:"Suspected / possible",k:"i"}, {t:"Present \u2014 obstructing",k:"ab"}, {t:"Present \u2014 non-obstructing",k:"ab"}],
  "ascites": [{t:"Not seen",k:"n"}, {t:"Trace ascites",k:"i"}, {t:"Small amount",k:"ab"}, {t:"Moderate ascites",k:"ab"}, {t:"Large tense ascites",k:"ab"}],
  "asymmetry": [{t:"Symmetric",k:"n"}, {t:"Asymmetric \u2014 extracapsular extension?",k:"ab"}, {t:"Focal asymmetry",k:"ab"}],
  "augmentation": [{t:"Present \u2014 normal venous response",k:"n"}, {t:"Absent \u2014 obstruction suspected",k:"ab"}],
  "axillary vein": [{t:"Compressible \u2014 patent",k:"n"}, {t:"Non-compressible \u2014 DVT",k:"ab"}],
  "b-lines": [{t:"Not seen \u2014 dry lung \u2014 normal",k:"n"}, {t:"Focal B-lines <3/zone",k:"i"}, {t:"Multiple \u22653/zone \u2014 interstitial syndrome",k:"i"}, {t:"Confluent B-lines \u2014 pulmonary oedema",k:"ab"}, {t:"Diffuse bilateral \u2014 cardiac failure/ARDS",k:"ab"}],
  "background echotexture": [{t:"Homogeneous",k:"n"}, {t:"Heterogeneous \u2014 expected for dense",k:"i"}, {t:"Markedly heterogeneous",k:"ab"}],
  "beta angle (degrees)": [{t:"Normal <55\u00b0",k:"n"}, {t:"Borderline 55\u201377\u00b0",k:"i"}, {t:"Abnormal >77\u00b0 \u2014 cartilaginous displacement",k:"ab"}],
  "bile duct anastomosis": [{t:"No stricture",k:"n"}, {t:"Stricture present",k:"ab"}, {t:"Biliary leak",k:"ab"}],
  "biloma": [{t:"Not seen",k:"n"}, {t:"Small \u2014 monitor",k:"i"}, {t:"Biloma \u2014 biliary leak suspected",k:"ab"}, {t:"Large \u2014 drainage required",k:"ab"}],
  "birads": [{t:"BIRADS 1 \u2014 Normal",k:"n"}, {t:"BIRADS 2 \u2014 Benign",k:"n"}, {t:"BIRADS 3 \u2014 Probably benign \u2014 6/12 follow-up",k:"i"}, {t:"BIRADS 4A \u2014 Low suspicion",k:"ab"}, {t:"BIRADS 4B \u2014 Intermediate",k:"ab"}, {t:"BIRADS 4C \u2014 Moderate suspicion",k:"ab"}, {t:"BIRADS 5 \u2014 High suspicion \u2014 biopsy required",k:"ab"}],
  "bladder": [{t:"Normal wall, anechoic contents",k:"n"}, {t:"Mild trabeculation",k:"i"}, {t:"Wall thickening",k:"ab"}, {t:"Calculi",k:"ab"}, {t:"Intraluminal lesion",k:"ab"}, {t:"Diverticulum",k:"ab"}],
  "bony roof morphology": [{t:"Angular \u2014 normal bony roof",k:"n"}, {t:"Rounded \u2014 mild bony deficiency",k:"i"}, {t:"Flat \u2014 severe bony deficiency",k:"ab"}],
  "bowel gas pattern": [{t:"Normal bowel gas pattern",k:"n"}, {t:"Mild gaseous distension",k:"i"}, {t:"Dilated loops",k:"ab"}, {t:"Air-fluid levels",k:"ab"}, {t:"Pneumoperitoneum",k:"ab"}],
  "bowel obstruction features": [{t:"Not seen",k:"n"}, {t:"Mildly dilated loops \u2014 non-specific",k:"i"}, {t:"Dilated loops \u2014 partial obstruction",k:"ab"}, {t:"No peristalsis \u2014 complete obstruction",k:"ab"}, {t:"Closed loop obstruction",k:"ab"}],
  "bpp score (out of 8)": [{t:"8/8 \u2014 normal",k:"n"}, {t:"6/8 \u2014 equivocal \u2014 reassess 24h",k:"i"}, {t:"4/8 \u2014 delivery considered",k:"ab"}, {t:"2/8 \u2014 urgent management",k:"ab"}, {t:"0/8 \u2014 emergency delivery",k:"ab"}],
  "brachial vein": [{t:"Compressible \u2014 patent",k:"n"}, {t:"Non-compressible \u2014 DVT",k:"ab"}],
  "bursae": [{t:"Not distended",k:"n"}, {t:"Trace fluid \u2014 borderline",k:"i"}, {t:"Bursitis \u2014 distended",k:"ab"}, {t:"Complex fluid \u2014 infection/haemorrhage?",k:"ab"}],
  "calcification": [{t:"Not seen",k:"n"}, {t:"Mild \u2014 incidental",k:"i"}, {t:"Moderate",k:"ab"}, {t:"Marked",k:"ab"}],
  "calculi": [{t:"Not seen",k:"n"}, {t:"Suspected / possible",k:"i"}, {t:"Single calculus",k:"ab"}, {t:"Multiple calculi",k:"ab"}, {t:"Impacted calculus",k:"ab"}],
  "cardiac activity": [{t:"Present \u2014 regular, rate 120\u2013160 bpm",k:"n"}, {t:"Present \u2014 rate at lower limit 110\u2013120",k:"i"}, {t:"Present \u2014 rate at upper limit 160\u2013170",k:"i"}, {t:"Bradycardia <110 bpm \u2014 urgent review",k:"ab"}, {t:"Not detected",k:"ab"}],
  "cartilage": [{t:"Normal thickness and echogenicity",k:"n"}, {t:"Mild thinning",k:"i"}, {t:"Moderate thinning",k:"ab"}, {t:"Full-thickness defect",k:"ab"}],
  "cartilaginous roof": [{t:"Adequate coverage",k:"n"}, {t:"Slightly reduced",k:"i"}, {t:"Poor coverage",k:"ab"}, {t:"Displaced \u2014 dislocation",k:"ab"}],
  "caudate vein prominence": [{t:"Not prominent \u2014 normal",k:"n"}, {t:"Prominent \u2014 hepatic vein obstruction?",k:"ab"}],
  "caudate:right lobe ratio": [{t:"Normal <0.65",k:"n"}, {t:"Borderline 0.65\u20130.8",k:"i"}, {t:"Elevated >0.65 \u2014 cirrhosis pattern",k:"ab"}],
  "cbd diameter": [{t:"Normal calibre <8 mm",k:"n"}, {t:"Mildly dilated 8\u201310 mm",k:"i"}, {t:"Dilated >10 mm \u2014 biliary obstruction?",k:"ab"}],
  "cca end diastolic velocity": [{t:"Normal",k:"n"}, {t:"Reversed \u2014 string sign",k:"ab"}],
  "cca imt (mm)": [{t:"Normal <0.9 mm",k:"n"}, {t:"Borderline 0.9\u20131.0 mm",k:"i"}, {t:"Increased >1.0 mm",k:"ab"}, {t:"Significantly increased",k:"ab"}],
  "cca peak systolic velocity (cm/s)": [{t:"Normal <125 cm/s",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Elevated \u2014 stenosis?",k:"ab"}],
  "central stenosis": [{t:"No significant central canal stenosis",k:"n"}, {t:"Mild stenosis",k:"i"}, {t:"Moderate stenosis",k:"ab"}, {t:"Severe \u2014 cord/cauda impingement",k:"ab"}],
  "cerebellum": [{t:"Normal \u2014 bilateral symmetric hemispheres",k:"n"}, {t:"Hypoplasia",k:"ab"}, {t:"Asymmetric",k:"ab"}, {t:"Haemorrhage",k:"ab"}],
  "cerebral ventricles (mm)": [{t:"Normal <10 mm",k:"n"}, {t:"Borderline 10\u201312 mm \u2014 follow-up",k:"i"}, {t:"Mild ventriculomegaly 10\u201315 mm",k:"ab"}, {t:"Severe >15 mm \u2014 tertiary referral",k:"ab"}],
  "cervical length": [{t:"Normal >25 mm",k:"n"}, {t:"Borderline 20\u201325 mm",k:"i"}, {t:"Short <20 mm",k:"ab"}, {t:"Very short <15 mm \u2014 urgent review",k:"ab"}],
  "cervical length (mm)": [{t:"Normal >25 mm",k:"n"}, {t:"Borderline 20\u201325 mm",k:"i"}, {t:"Short <20 mm",k:"ab"}, {t:"Very short <15 mm \u2014 urgent review",k:"ab"}],
  "chorionicity (if multiple)": [{t:"Dichorionic-diamniotic (DCDA)",k:"n"}, {t:"Monochorionic-diamniotic (MCDA) \u2014 specialist",k:"i"}, {t:"Monochorionic-monoamniotic (MCMA) \u2014 high risk",k:"ab"}],
  "choroid plexus": [{t:"Normal \u2014 bilateral symmetric",k:"n"}, {t:"Choroid plexus cysts \u2014 isolated",k:"i"}, {t:"Haemorrhage into choroid plexus",k:"ab"}],
  "choroidal detachment": [{t:"Not seen",k:"n"}, {t:"Present \u2014 haemorrhagic",k:"ab"}, {t:"Kissing choroidal detachments",k:"ab"}],
  "cisterna magna": [{t:"Normal 2\u201310 mm",k:"n"}, {t:"Mildly prominent",k:"i"}, {t:"Enlarged >10 mm",k:"ab"}, {t:"Obliterated \u2014 possible Chiari II",k:"ab"}],
  "collateral flow": [{t:"Not seen",k:"n"}, {t:"Collateral formation \u2014 chronic occlusion",k:"i"}, {t:"Poor collateral formation",k:"ab"}],
  "collection/effusion": [{t:"Not seen",k:"n"}, {t:"Small \u2014 likely physiological",k:"i"}, {t:"Collection present",k:"ab"}, {t:"Abscess features",k:"ab"}, {t:"Haematoma",k:"ab"}],
  "common femoral artery": [{t:"Triphasic waveform \u2014 normal",k:"n"}, {t:"Biphasic \u2014 possible inflow disease",k:"i"}, {t:"Monophasic \u2014 significant proximal stenosis",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "common femoral vein": [{t:"Compressible \u2014 no DVT",k:"n"}, {t:"Chronic wall thickening",k:"i"}, {t:"Non-compressible \u2014 acute DVT",k:"ab"}, {t:"Partial thrombosis",k:"ab"}],
  "composition": [{t:"Predominantly fatty \u2014 BIRADS A",k:"n"}, {t:"Scattered fibroglandular \u2014 BIRADS B",k:"n"}, {t:"Heterogeneously dense \u2014 BIRADS C",k:"i"}, {t:"Extremely dense \u2014 BIRADS D",k:"ab"}],
  "compressibility": [{t:"Fully compressible \u2014 normal",k:"n"}, {t:"Partially compressible \u2014 equivocal",k:"i"}, {t:"Non-compressible \u2014 appendicitis",k:"ab"}, {t:"Non-compressible \u2014 DVT (vessel)",k:"ab"}],
  "compression fracture": [{t:"Not seen",k:"n"}, {t:"Mild endplate depression \u2014 degenerative",k:"i"}, {t:"Compression fracture",k:"ab"}, {t:"Burst fracture",k:"ab"}, {t:"Pathological fracture",k:"ab"}],
  "consolidation": [{t:"Not seen",k:"n"}, {t:"Compressive atelectasis",k:"i"}, {t:"Consolidation \u2014 pneumonia suspected",k:"ab"}, {t:"Hepatisation \u2014 complex consolidation",k:"ab"}],
  "contents": [{t:"Anechoic \u2014 normal",k:"n"}, {t:"Trace sediment",k:"i"}, {t:"Echogenic debris",k:"ab"}, {t:"Calculus",k:"ab"}, {t:"Blood clot",k:"ab"}],
  "contrast": [{t:"Non-contrast",k:"i"}, {t:"Arterial phase",k:"i"}, {t:"Portal venous phase",k:"i"}, {t:"Delayed phase",k:"i"}, {t:"Multiphase",k:"i"}],
  "cord insertion": [{t:"Normal central cord insertion",k:"n"}, {t:"Marginal \u2014 monitor",k:"i"}, {t:"Velamentous \u2014 monitor closely",k:"ab"}],
  "corpus callosum": [{t:"Present and normal",k:"n"}, {t:"Not visualised \u2014 agenesis?",k:"ab"}, {t:"Partially formed \u2014 partial agenesis",k:"ab"}],
  "cortical echogenicity": [{t:"Normal",k:"n"}, {t:"Mildly increased",k:"i"}, {t:"Increased \u2014 ischaemia?",k:"ab"}, {t:"Haemorrhagic change",k:"ab"}],
  "cortical thickness": [{t:"Normal <3 mm",k:"n"}, {t:"Borderline 3\u20134 mm",k:"i"}, {t:"Thickened >4 mm \u2014 suspicious",k:"ab"}, {t:"Eccentric cortical bulge",k:"ab"}],
  "cortical thickness (node)": [{t:"Normal <3 mm",k:"n"}, {t:"Thickened >3 mm \u2014 suspicious",k:"ab"}],
  "corticomedullary differentiation": [{t:"Well preserved",k:"n"}, {t:"Mildly reduced",k:"i"}, {t:"Poor CMD",k:"ab"}, {t:"Lost CMD",k:"ab"}],
  "cpr (cerebro-placental ratio)": [{t:"Normal CPR >1.0",k:"n"}, {t:"Borderline 0.8\u20131.0",k:"i"}, {t:"Abnormal <0.8 \u2014 brain sparing \u2014 delivery planning",k:"ab"}],
  "creeping fat sign": [{t:"Not seen",k:"n"}, {t:"Present \u2014 Crohn's disease feature",k:"ab"}],
  "ctr (cardiothoracic ratio)": [{t:"Normal <0.5",k:"n"}, {t:"Borderline 0.5\u20130.55",k:"i"}, {t:"Cardiomegaly CTR >0.5",k:"ab"}, {t:"Massive cardiomegaly",k:"ab"}],
  "cysts": [{t:"Not seen",k:"n"}, {t:"Simple cyst Bosniak I",k:"i"}, {t:"Multiple simple cysts",k:"i"}, {t:"Complex \u2014 Bosniak IIF/III",k:"ab"}, {t:"Bosniak IV \u2014 malignant features",k:"ab"}],
  "cysts (bosniak)": [{t:"Not seen \u2014 Bosniak 0",k:"n"}, {t:"Bosniak I \u2014 simple",k:"i"}, {t:"Bosniak II \u2014 minimally complex",k:"i"}, {t:"Bosniak IIF \u2014 follow-up required",k:"ab"}, {t:"Bosniak III \u2014 indeterminate",k:"ab"}, {t:"Bosniak IV \u2014 malignant features",k:"ab"}],
  "d-sign/septal flattening": [{t:"Not seen \u2014 normal septal motion",k:"n"}, {t:"Septal flattening \u2014 RV pressure overload",k:"ab"}, {t:"D-sign \u2014 severe RV strain \u2014 PE?",k:"ab"}],
  "dandy-walker continuum": [{t:"Not seen",k:"n"}, {t:"Dandy-Walker malformation",k:"ab"}, {t:"Dandy-Walker variant",k:"ab"}, {t:"Mega cisterna magna",k:"ab"}],
  "degree of stenosis": [{t:"No significant stenosis",k:"n"}, {t:"Moderate stenosis 50\u201370%",k:"i"}, {t:"Severe stenosis >70%",k:"ab"}, {t:"Critical stenosis",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "depth": [{t:"Subcutaneous",k:"i"}, {t:"Sub-fascial",k:"i"}, {t:"Intramuscular",k:"i"}],
  "diameter (mm)": [{t:"Normal calibre",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Upper limit of normal",k:"i"}, {t:"Moderately dilated",k:"ab"}, {t:"Markedly dilated",k:"ab"}],
  "dilatation": [{t:"Not dilated",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Moderately dilated",k:"ab"}, {t:"Significantly dilated",k:"ab"}],
  "disc herniation": [{t:"Not seen",k:"n"}, {t:"Broad-based bulge",k:"i"}, {t:"Paracentral herniation",k:"ab"}, {t:"Central herniation",k:"ab"}, {t:"Foraminal herniation",k:"ab"}, {t:"Sequestrated fragment",k:"ab"}],
  "diverticula": [{t:"Not seen",k:"n"}, {t:"Small diverticulum",k:"i"}, {t:"Large diverticulum",k:"ab"}, {t:"Multiple diverticula",k:"ab"}, {t:"Diverticulum with calculus",k:"ab"}],
  "doppler flow left": [{t:"Normal vascularity",k:"n"}, {t:"Slightly reduced",k:"i"}, {t:"Slightly increased",k:"i"}, {t:"Absent \u2014 torsion?",k:"ab"}, {t:"Markedly increased \u2014 orchitis",k:"ab"}],
  "doppler flow right": [{t:"Normal vascularity",k:"n"}, {t:"Slightly reduced",k:"i"}, {t:"Slightly increased",k:"i"}, {t:"Absent \u2014 torsion?",k:"ab"}, {t:"Markedly increased \u2014 orchitis",k:"ab"}],
  "duct size": [{t:"Normal (<3 mm)",k:"n"}, {t:"Mildly prominent 3\u20134 mm",k:"i"}, {t:"Dilated >3 mm",k:"ab"}, {t:"Markedly dilated with side branches \u2014 IPMN?",k:"ab"}],
  "dvt left": [{t:"No DVT \u2014 compressible, normal flow",k:"n"}, {t:"Chronic venous changes",k:"i"}, {t:"Acute DVT \u2014 non-compressible",k:"ab"}, {t:"Partial DVT",k:"ab"}],
  "dvt right": [{t:"No DVT \u2014 compressible, normal flow",k:"n"}, {t:"Chronic venous changes",k:"i"}, {t:"Acute DVT \u2014 non-compressible",k:"ab"}, {t:"Partial DVT",k:"ab"}],
  "eca psv": [{t:"Normal \u2014 no stenosis",k:"n"}, {t:"Elevated \u2014 ECA stenosis",k:"ab"}],
  "echogenicity": [{t:"Normal echogenicity",k:"n"}, {t:"Mildly increased",k:"i"}, {t:"Mildly decreased",k:"i"}, {t:"Markedly increased",k:"ab"}, {t:"Heterogeneous",k:"ab"}, {t:"Decreased \u2014 infiltrative?",k:"ab"}],
  "echotexture": [{t:"Homogeneous echotexture",k:"n"}, {t:"Mildly heterogeneous",k:"i"}, {t:"Markedly heterogeneous",k:"ab"}, {t:"Coarsened",k:"ab"}],
  "effusion": [{t:"Not seen",k:"n"}, {t:"Trace \u2014 physiological",k:"n"}, {t:"Small effusion",k:"i"}, {t:"Moderate effusion",k:"ab"}, {t:"Large effusion",k:"ab"}, {t:"Complex/echogenic \u2014 haemarthrosis?",k:"ab"}],
  "effusion character": [{t:"Anechoic \u2014 simple transudate",k:"n"}, {t:"Complex \u2014 exudate",k:"i"}, {t:"Echogenic \u2014 haemothorax",k:"ab"}, {t:"Septated \u2014 empyema",k:"ab"}],
  "effusion character (anechoic/complex/echogenic)": [{t:"Anechoic \u2014 simple transudate",k:"n"}, {t:"Complex \u2014 exudate/haemothorax",k:"i"}, {t:"Echogenic \u2014 haemothorax",k:"ab"}, {t:"Septated/loculated \u2014 empyema",k:"ab"}],
  "effusion present": [{t:"Not seen",k:"n"}, {t:"Small <250 ml",k:"i"}, {t:"Moderate 250\u2013500 ml",k:"i"}, {t:"Large >500 ml \u2014 drainage considered",k:"ab"}, {t:"Bilateral effusions",k:"ab"}],
  "effusion volume (estimate)": [{t:"Not seen",k:"n"}, {t:"Small <250 ml",k:"i"}, {t:"Moderate 250\u2013500 ml",k:"i"}, {t:"Large >500 ml",k:"ab"}, {t:"Massive \u2014 urgent drainage",k:"ab"}],
  "ejaculatory ducts": [{t:"Not dilated",k:"n"}, {t:"Dilated \u2014 obstruction?",k:"ab"}, {t:"Calculi in duct",k:"ab"}],
  "end-diastolic flow (present/absent/reversed)": [{t:"Present \u2014 normal",k:"n"}, {t:"Absent \u2014 increased fetal risk",k:"i"}, {t:"Reversed \u2014 imminent compromise \u2014 urgent",k:"ab"}],
  "endometrial thickness (mm)": [{t:"Normal for phase/age",k:"n"}, {t:"Upper limit of normal",k:"i"}, {t:"Thickened \u2014 further evaluation",k:"ab"}, {t:"Thin/atrophic",k:"ab"}],
  "enlarged mesenteric nodes": [{t:"Not seen",k:"n"}, {t:"Small reactive nodes",k:"i"}, {t:"Enlarged >10 mm \u2014 mesenteric adenitis",k:"ab"}, {t:"Conglomerate nodes \u2014 malignancy?",k:"ab"}],
  "epididymal cysts": [{t:"Not seen",k:"n"}, {t:"Small epididymal cyst \u2014 benign",k:"i"}, {t:"Multiple cysts",k:"ab"}, {t:"Large cyst >1 cm",k:"ab"}],
  "estimated rap (mmhg)": [{t:"Normal 0\u20135 mmHg",k:"n"}, {t:"Mildly elevated 5\u201310 mmHg",k:"i"}, {t:"Elevated 10\u201315 mmHg",k:"ab"}, {t:"Markedly elevated >15 mmHg",k:"ab"}],
  "exposure": [{t:"Adequate exposure",k:"n"}, {t:"Slightly overexposed",k:"i"}, {t:"Slightly underexposed",k:"i"}, {t:"Overexposed \u2014 limiting evaluation",k:"ab"}, {t:"Underexposed",k:"ab"}],
  "femoral head coverage (%)": [{t:"Normal >50%",k:"n"}, {t:"Borderline 40\u201350%",k:"i"}, {t:"Reduced <40%",k:"ab"}, {t:"Severely reduced <33%",k:"ab"}],
  "femoral head position": [{t:"Centred within acetabulum",k:"n"}, {t:"Slightly lateralised",k:"i"}, {t:"Subluxed",k:"ab"}, {t:"Dislocated",k:"ab"}],
  "femoral vein": [{t:"Compressible \u2014 no DVT",k:"n"}, {t:"Non-compressible \u2014 DVT",k:"ab"}, {t:"Partial thrombosis",k:"ab"}],
  "fetal body movements": [{t:"Present \u2014 \u22653 discrete movements",k:"n"}, {t:"Reduced <3 movements",k:"ab"}, {t:"Absent",k:"ab"}],
  "fetal breathing movements (30 min)": [{t:"Present \u22651 episode >30 sec",k:"n"}, {t:"Absent in 30 min \u2014 reduced BPP score",k:"ab"}],
  "fetal heart rate": [{t:"Normal 120\u2013160 bpm",k:"n"}, {t:"Lower limit 110\u2013120",k:"i"}, {t:"Upper limit 160\u2013170",k:"i"}, {t:"Bradycardia <110 \u2014 urgent",k:"ab"}, {t:"Tachycardia >170",k:"ab"}],
  "fetal number": [{t:"Singleton",k:"n"}, {t:"Twin \u2014 DCDA",k:"i"}, {t:"Twin \u2014 MCDA \u2014 specialist follow-up",k:"i"}, {t:"Twin \u2014 MCMA \u2014 high risk",k:"ab"}, {t:"Higher-order multiples",k:"ab"}],
  "fetal tone": [{t:"Normal \u2014 extension and flexion seen",k:"n"}, {t:"Absent \u2014 no limb movement",k:"ab"}],
  "fibroids": [{t:"Not seen",k:"n"}, {t:"Single small fibroid <2 cm",k:"i"}, {t:"Multiple fibroids",k:"ab"}, {t:"Large fibroid >5 cm",k:"ab"}, {t:"Submucosal fibroid",k:"ab"}, {t:"Pedunculated fibroid",k:"ab"}],
  "flow direction": [{t:"Hepatopetal \u2014 normal",k:"n"}, {t:"Hepatofugal \u2014 abnormal",k:"ab"}, {t:"Absent flow",k:"ab"}],
  "fluid character": [{t:"Clear straw-coloured fluid \u2014 serous",k:"n"}, {t:"Blood-stained fluid",k:"i"}, {t:"Turbid fluid",k:"i"}, {t:"Purulent \u2014 abscess",k:"ab"}, {t:"Frank pus",k:"ab"}, {t:"Haemorrhage \u2014 frank blood",k:"ab"}],
  "focal lesions": [{t:"No focal lesion",k:"n"}, {t:"Simple cyst",k:"i"}, {t:"Haemangioma \u2014 typical",k:"i"}, {t:"Hypoechoic lesion",k:"ab"}, {t:"Hyperechoic lesion",k:"ab"}, {t:"Complex lesion \u2014 evaluation required",k:"ab"}],
  "focal lesions \u2014 number": [{t:"No focal lesion",k:"n"}, {t:"Single lesion",k:"i"}, {t:"Two lesions",k:"i"}, {t:"Multiple lesions",k:"ab"}, {t:"Numerous lesions \u2014 ?metastases",k:"ab"}],
  "focal lesions \u2014 size & character": [{t:"Not applicable",k:"n"}, {t:"Simple cyst",k:"i"}, {t:"Likely haemangioma",k:"i"}, {t:"Indeterminate \u2014 further imaging",k:"ab"}, {t:"Suspicious solid lesion",k:"ab"}],
  "follicles": [{t:"Normal follicular pattern",k:"n"}, {t:"Dominant follicle",k:"i"}, {t:"Corpus luteum \u2014 physiological",k:"i"}, {t:"Polycystic morphology \u2014 PCOS",k:"ab"}, {t:"No follicles \u2014 post-menopausal",k:"ab"}],
  "foraminal stenosis": [{t:"Not seen",k:"n"}, {t:"Mild bilateral foraminal narrowing",k:"i"}, {t:"Moderate right",k:"ab"}, {t:"Moderate left",k:"ab"}, {t:"Severe \u2014 nerve root compression",k:"ab"}],
  "fourth ventricle": [{t:"Normal",k:"n"}, {t:"Dilated",k:"ab"}, {t:"Not identified",k:"ab"}],
  "free fluid": [{t:"Not seen",k:"n"}, {t:"Trace \u2014 physiological",k:"i"}, {t:"Small amount",k:"ab"}, {t:"Moderate amount",k:"ab"}, {t:"Large amount \u2014 ascites",k:"ab"}],
  "free intraperitoneal fluid": [{t:"Not seen",k:"n"}, {t:"Trace \u2014 physiological in females",k:"i"}, {t:"Free fluid \u2014 small",k:"ab"}, {t:"Free fluid \u2014 moderate to large \u2014 surgical review",k:"ab"}],
  "ga by lmp": [{t:"Consistent with dates",k:"i"}, {t:"Appropriate for gestation",k:"i"}, {t:"Discordant \u2014 re-date by USS",k:"ab"}],
  "ga by uss": [{t:"Consistent with LMP dates",k:"i"}, {t:"SGA \u2014 small for gestational age",k:"ab"}, {t:"LGA \u2014 large for gestational age",k:"ab"}],
  "gallbladder wall oedema": [{t:"Not seen",k:"n"}, {t:"Mild thickening \u2014 ascites-related",k:"i"}, {t:"Marked oedema \u2014 portal hypertension",k:"ab"}],
  "germinal matrix haemorrhage (grade)": [{t:"Not seen",k:"n"}, {t:"Grade I \u2014 subependymal only",k:"i"}, {t:"Grade II \u2014 IVH no dilatation",k:"ab"}, {t:"Grade III \u2014 IVH with dilatation",k:"ab"}, {t:"Grade IV \u2014 periventricular haemorrhage",k:"ab"}],
  "global lv function (visual estimate)": [{t:"Normal \u2014 hyperdynamic to normal contractility",k:"n"}, {t:"Mildly impaired",k:"i"}, {t:"Moderately impaired",k:"ab"}, {t:"Severely impaired \u2014 urgent management",k:"ab"}],
  "globe integrity": [{t:"Intact globe",k:"n"}, {t:"Disrupted globe \u2014 penetrating injury",k:"ab"}, {t:"Scleral laceration \u2014 urgent ophthalmology",k:"ab"}],
  "graf type": [{t:"Type I \u2014 normal mature hip",k:"n"}, {t:"Type IIa \u2014 immature <3 months",k:"i"}, {t:"Type IIb \u2014 delayed ossification >3 months",k:"i"}, {t:"Type IIc \u2014 at-risk",k:"ab"}, {t:"Type D \u2014 dislocating",k:"ab"}, {t:"Type III \u2014 dislocated",k:"ab"}, {t:"Type IV \u2014 severely dislocated",k:"ab"}],
  "grey-white differentiation": [{t:"Preserved",k:"n"}, {t:"Subtle loss \u2014 rescan",k:"i"}, {t:"Loss of GWD \u2014 ischaemia",k:"ab"}, {t:"Diffuse loss \u2014 oedema",k:"ab"}],
  "ha acceleration time (ms)": [{t:"Normal <70 ms",k:"n"}, {t:"Borderline 70\u2013100 ms",k:"i"}, {t:"Prolonged >100 ms \u2014 HA stenosis?",k:"ab"}],
  "ha psv (cm/s)": [{t:"Normal HA PSV >40 cm/s",k:"n"}, {t:"Reduced 20\u201340 cm/s",k:"i"}, {t:"Low <20 cm/s \u2014 HA stenosis/thrombosis?",k:"ab"}],
  "ha ri": [{t:"Normal HA RI 0.5\u20130.7",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Raised >0.8 \u2014 rejection/stenosis?",k:"ab"}],
  "ha waveform": [{t:"Normal \u2014 low RI with systolic peak",k:"n"}, {t:"Tardus parvus \u2014 indirect stenosis sign",k:"i"}, {t:"Absent \u2014 HA thrombosis",k:"ab"}, {t:"Highly pulsatile",k:"ab"}],
  "haematoma": [{t:"Not seen",k:"n"}, {t:"Small perirenal \u2014 monitor",k:"i"}, {t:"Moderate haematoma",k:"ab"}, {t:"Large \u2014 intervention required",k:"ab"}],
  "head shape": [{t:"Normal for gestation",k:"n"}, {t:"Lemon sign \u2014 spina bifida?",k:"ab"}, {t:"Strawberry shape",k:"ab"}, {t:"Cloverleaf skull",k:"ab"}],
  "head size": [{t:"Normal size",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 mass?",k:"ab"}, {t:"Focal hypoechoic lesion",k:"ab"}],
  "hepatic vein diameter": [{t:"Normal",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Dilated \u2014 hepatic venous outflow obstruction",k:"ab"}],
  "hepatic vein waveform": [{t:"Triphasic \u2014 normal",k:"n"}, {t:"Biphasic",k:"i"}, {t:"Monophasic/flat",k:"ab"}, {t:"Reversed component",k:"ab"}],
  "hepatic veins": [{t:"Normal triphasic waveform",k:"n"}, {t:"Biphasic",k:"i"}, {t:"Monophasic/flat",k:"ab"}, {t:"Reversed a-wave",k:"ab"}],
  "hernia": [{t:"Not seen",k:"n"}, {t:"Suspected",k:"i"}, {t:"Present \u2014 reducible",k:"ab"}, {t:"Present \u2014 irreducible \u2014 urgent",k:"ab"}],
  "hilum": [{t:"Echogenic hilum present \u2014 normal",k:"n"}, {t:"Absent hilum \u2014 suspicious",k:"ab"}, {t:"Replaced hilum \u2014 malignancy?",k:"ab"}],
  "hydrocele": [{t:"Not seen",k:"n"}, {t:"Small \u2014 likely incidental",k:"i"}, {t:"Moderate hydrocele",k:"ab"}, {t:"Large hydrocele",k:"ab"}, {t:"Pyocele features",k:"ab"}],
  "hydronephrosis": [{t:"Not seen",k:"n"}, {t:"Mild \u2014 calyceal fullness",k:"i"}, {t:"Moderate",k:"i"}, {t:"Severe hydronephrosis",k:"ab"}, {t:"Gross \u2014 with cortical thinning",k:"ab"}],
  "hydronephrosis (grade)": [{t:"None",k:"n"}, {t:"Grade I \u2014 mild calyceal dilatation",k:"i"}, {t:"Grade II \u2014 moderate pelvicalyceal",k:"i"}, {t:"Grade III \u2014 significant",k:"ab"}, {t:"Grade IV \u2014 cortical thinning",k:"ab"}],
  "hyperdensity": [{t:"Not seen",k:"n"}, {t:"Physiological calcification",k:"i"}, {t:"Acute haemorrhage",k:"ab"}, {t:"Hyperdense MCA sign",k:"ab"}, {t:"Pathological calcification",k:"ab"}],
  "hypodensity": [{t:"Not seen",k:"n"}, {t:"Subtle \u2014 artefact vs early ischaemia",k:"i"}, {t:"Focal \u2014 infarct",k:"ab"}, {t:"Diffuse \u2014 oedema",k:"ab"}],
  "ica edv": [{t:"Normal <40 cm/s",k:"n"}, {t:"Borderline 40\u2013100 cm/s",k:"i"}, {t:"Elevated >100 cm/s \u2014 severe stenosis",k:"ab"}],
  "ica psv (cm/s)": [{t:"Normal <125 cm/s \u2014 no significant stenosis",k:"n"}, {t:"Elevated 125\u2013230 cm/s \u2014 50\u201369% stenosis",k:"i"}, {t:"Elevated >230 cm/s \u2014 severe stenosis 70\u201399%",k:"ab"}, {t:"Very high \u2014 near occlusion",k:"ab"}],
  "ica/cca ratio": [{t:"Normal <2.0",k:"n"}, {t:"Borderline 2.0\u20134.0",k:"i"}, {t:"Elevated >4.0 \u2014 severe stenosis",k:"ab"}],
  "iliac vessels": [{t:"Patent iliac artery and vein",k:"n"}, {t:"Iliac artery stenosis",k:"ab"}, {t:"Iliac vein thrombosis",k:"ab"}],
  "immediate complication": [{t:"No immediate complication",k:"n"}, {t:"Minor local haematoma \u2014 resolved",k:"i"}, {t:"Haemorrhage \u2014 intervention required",k:"ab"}, {t:"Vasovagal episode",k:"ab"}, {t:"Pneumothorax \u2014 post-procedure CXR required",k:"ab"}],
  "inflammatory change": [{t:"Not seen",k:"n"}, {t:"Mild increased echogenicity",k:"i"}, {t:"Marked fat stranding \u2014 cellulitis",k:"ab"}, {t:"Abscess formation",k:"ab"}],
  "inspiration": [{t:"Adequate \u2014 10+ ribs visible",k:"n"}, {t:"Suboptimal \u2014 8\u20139 ribs",k:"i"}, {t:"Inadequate \u2014 <8 ribs",k:"ab"}],
  "internal echogenicity": [{t:"Anechoic \u2014 cystic",k:"n"}, {t:"Hyperechoic \u2014 lipoma",k:"i"}, {t:"Isoechoic to fat",k:"i"}, {t:"Heterogeneous \u2014 complex",k:"ab"}, {t:"Hypoechoic \u2014 solid",k:"ab"}],
  "intima-media thickness": [{t:"Normal <0.9 mm",k:"n"}, {t:"Borderline 0.9\u20131.0 mm",k:"i"}, {t:"Increased >1.0 mm",k:"ab"}, {t:"Significantly increased",k:"ab"}],
  "intrahepatic biliary dilatation": [{t:"Not seen",k:"n"}, {t:"Mild \u2014 central ducts only",k:"i"}, {t:"Moderate dilatation",k:"ab"}, {t:"Marked central and peripheral",k:"ab"}],
  "intraocular foreign body": [{t:"Not seen",k:"n"}, {t:"Suspected \u2014 metallic artefact",k:"i"}, {t:"Present \u2014 posterior segment",k:"ab"}, {t:"Present \u2014 anterior segment",k:"ab"}],
  "isthmus thickness": [{t:"Normal <4 mm",k:"n"}, {t:"Mildly thickened",k:"i"}, {t:"Thickened",k:"ab"}],
  "ivc": [{t:"Normal calibre, compressible",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Dilated non-collapsing \u2014 raised CVP",k:"ab"}, {t:"Thrombosis",k:"ab"}],
  "ivc anastomosis": [{t:"Patent \u2014 normal flow",k:"n"}, {t:"Stenosis",k:"ab"}, {t:"Thrombosis",k:"ab"}],
  "ivc collapsibility (%)": [{t:"Normal collapse >50% \u2014 CVP <5 mmHg",k:"n"}, {t:"Intermediate 25\u201350% \u2014 CVP 5\u201310 mmHg",k:"i"}, {t:"Minimal collapse <25% \u2014 raised CVP >10 mmHg",k:"ab"}],
  "ivc diameter (mm)": [{t:"Normal <21 mm with >50% collapse",k:"n"}, {t:"Mildly dilated 21\u201325 mm",k:"i"}, {t:"Dilated >25 mm \u2014 raised CVP",k:"ab"}, {t:"Plethoric \u2014 tamponade/right heart failure",k:"ab"}],
  "ivs thickness": [{t:"Normal 7\u201311 mm",k:"n"}, {t:"Borderline 12\u201313 mm",k:"i"}, {t:"Hypertrophied \u226514 mm",k:"ab"}, {t:"Asymmetric septal hypertrophy",k:"ab"}],
  "joint space": [{t:"Normal joint space",k:"n"}, {t:"Mildly reduced",k:"i"}, {t:"Significantly reduced",k:"ab"}, {t:"Joint space loss",k:"ab"}],
  "large bowel wall thickness": [{t:"Normal <4 mm",k:"n"}, {t:"Mildly thickened",k:"i"}, {t:"Thickened >4 mm \u2014 colitis?",k:"ab"}, {t:"Markedly thickened \u2014 tumour/diverticulitis?",k:"ab"}],
  "lateral ventricle width left (mm)": [{t:"Normal <10 mm",k:"n"}, {t:"Borderline 10\u201312 mm",k:"i"}, {t:"Mild ventriculomegaly 10\u201315 mm",k:"ab"}, {t:"Moderate/severe >15 mm",k:"ab"}],
  "lateral ventricle width right (mm)": [{t:"Normal <10 mm",k:"n"}, {t:"Borderline 10\u201312 mm",k:"i"}, {t:"Mild ventriculomegaly 10\u201315 mm",k:"ab"}, {t:"Moderate/severe >15 mm",k:"ab"}],
  "left": [{t:"Normal size and echogenicity",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 epididymo-orchitis?",k:"ab"}, {t:"Absent",k:"ab"}, {t:"Cystic change",k:"ab"}],
  "left axilla": [{t:"Normal nodes \u2014 hilum present",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious",k:"ab"}, {t:"Rounded node",k:"ab"}],
  "left cca": [{t:"Patent \u2014 no plaque, normal waveform",k:"n"}, {t:"IMT mildly increased",k:"i"}, {t:"Plaque <50% stenosis",k:"ab"}, {t:"Significant stenosis",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "left diaphragm movement": [{t:"Normal excursion >15 mm",k:"n"}, {t:"Reduced excursion",k:"i"}, {t:"Paradoxical movement",k:"ab"}, {t:"Absent movement",k:"ab"}],
  "left groin": [{t:"Normal inguinal nodes",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious",k:"ab"}, {t:"Matted",k:"ab"}],
  "left hip classification": [{t:"Graf Type I \u2014 normal, no treatment required",k:"n"}, {t:"Graf IIa \u2014 physiological, clinical follow-up",k:"i"}, {t:"Graf IIb/IIc \u2014 harness therapy indicated",k:"ab"}, {t:"Graf III/IV \u2014 urgent orthopaedic referral",k:"ab"}],
  "left hv": [{t:"Patent \u2014 normal triphasic",k:"n"}, {t:"Stenosis",k:"ab"}, {t:"Thrombosis",k:"ab"}],
  "left ica/eca": [{t:"Patent \u2014 normal velocities",k:"n"}, {t:"Mild plaque \u2014 <50%",k:"i"}, {t:"Moderate stenosis 50\u201369%",k:"ab"}, {t:"Severe stenosis 70\u201399%",k:"ab"}, {t:"Near occlusion",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "left kidney size": [{t:"Normal 9\u201312 cm",k:"n"}, {t:"Upper limit of normal",k:"i"}, {t:"Enlarged >12 cm",k:"ab"}, {t:"Small <9 cm",k:"ab"}, {t:"Atrophic",k:"ab"}],
  "left lobe size": [{t:"Normal size",k:"n"}, {t:"Upper limit of normal",k:"i"}, {t:"Enlarged",k:"ab"}, {t:"Atrophic",k:"ab"}],
  "left ovary size": [{t:"Normal size",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 complex lesion",k:"ab"}, {t:"Not visualised",k:"ab"}],
  "left parotid duct": [{t:"Normal calibre",k:"n"}, {t:"Dilated \u2014 sialolithiasis",k:"ab"}, {t:"Calculus",k:"ab"}],
  "left parotid echogenicity": [{t:"Normal",k:"n"}, {t:"Heterogeneous",k:"i"}, {t:"Decreased \u2014 parotitis",k:"ab"}, {t:"Focal lesion",k:"ab"}],
  "left parotid focal lesion": [{t:"Not seen",k:"n"}, {t:"Likely benign \u2014 pleomorphic adenoma",k:"i"}, {t:"Malignant features",k:"ab"}, {t:"Suspicious lesion",k:"ab"}],
  "left parotid size": [{t:"Normal size",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 parotitis?",k:"ab"}, {t:"Mass lesion",k:"ab"}],
  "left resistive index": [{t:"Normal RI 0.5\u20130.7",k:"n"}, {t:"Mildly elevated 0.7\u20130.8",k:"i"}, {t:"Raised >0.8 \u2014 obstruction/rejection?",k:"ab"}],
  "left seminal vesicle": [{t:"Normal",k:"n"}, {t:"Dilated",k:"ab"}, {t:"Calculi",k:"ab"}, {t:"Infiltrated",k:"ab"}],
  "left sublingual": [{t:"Normal",k:"n"}, {t:"Enlarged",k:"ab"}, {t:"Cystic lesion",k:"ab"}, {t:"Ranula",k:"ab"}],
  "left submandibular echogenicity": [{t:"Normal",k:"n"}, {t:"Decreased \u2014 sialadenitis",k:"ab"}, {t:"Focal lesion",k:"ab"}],
  "left submandibular size": [{t:"Normal size",k:"n"}, {t:"Enlarged",k:"ab"}, {t:"Mass lesion",k:"ab"}],
  "left testis size": [{t:"Normal size",k:"n"}, {t:"Mildly small",k:"i"}, {t:"Atrophic",k:"ab"}, {t:"Enlarged \u2014 orchitis/tumour?",k:"ab"}],
  "left va flow direction": [{t:"Antegrade \u2014 normal",k:"n"}, {t:"Retrograde \u2014 subclavian steal",k:"ab"}, {t:"To-and-fro \u2014 subclavian steal",k:"ab"}],
  "left wharton duct": [{t:"Normal \u2014 not dilated",k:"n"}, {t:"Dilated \u2014 calculus suspected",k:"ab"}, {t:"Calculus confirmed",k:"ab"}],
  "lens position": [{t:"Normal position",k:"n"}, {t:"Subluxed",k:"ab"}, {t:"Dislocated \u2014 posterior",k:"ab"}, {t:"Dislocated \u2014 anterior",k:"ab"}],
  "level v": [{t:"Not seen / normal",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious \u2014 posterior triangle",k:"ab"}],
  "levels i-ii": [{t:"Not seen / normal",k:"n"}, {t:"Reactive \u2014 oval, echogenic hilum",k:"i"}, {t:"Suspicious \u2014 rounded, loss of hilum",k:"ab"}, {t:"Necrotic centre",k:"ab"}, {t:"Extracapsular spread",k:"ab"}],
  "levels iii-iv": [{t:"Not seen / normal",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious",k:"ab"}, {t:"Conglomerate",k:"ab"}],
  "lie": [{t:"Longitudinal lie",k:"n"}, {t:"Oblique lie",k:"i"}, {t:"Transverse lie",k:"ab"}],
  "location": [{t:"Level I",k:"i"}, {t:"Level IIA/B",k:"i"}, {t:"Level III",k:"i"}, {t:"Level IV",k:"i"}, {t:"Level V",k:"i"}, {t:"Axilla",k:"i"}, {t:"Groin",k:"i"}, {t:"Mediastinum",k:"i"}, {t:"Multiple levels \u2014 lymphoma pattern",k:"ab"}, {t:"Bilateral",k:"ab"}],
  "location (iliac fossa)": [{t:"Normal position in iliac fossa",k:"n"}, {t:"Malrotated",k:"i"}, {t:"Haematoma compressing hilum",k:"ab"}],
  "location (intrauterine/ectopic)": [{t:"Intrauterine pregnancy confirmed",k:"n"}, {t:"Too early to confirm \u2014 PUL",k:"i"}, {t:"Ectopic pregnancy suspected",k:"ab"}, {t:"Heterotopic \u2014 consider",k:"ab"}],
  "loculation": [{t:"Not seen \u2014 free-flowing",k:"n"}, {t:"Partial loculation",k:"i"}, {t:"Fully loculated \u2014 guided drainage required",k:"ab"}],
  "lower pole interlobar ri": [{t:"Normal RI 0.5\u20130.7",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Raised >0.8",k:"ab"}],
  "lung fields": [{t:"Clear lung fields",k:"n"}, {t:"Increased bronchovascular markings",k:"i"}, {t:"Right lower zone opacity",k:"ab"}, {t:"Left lower zone opacity",k:"ab"}, {t:"Bilateral opacities",k:"ab"}, {t:"Hyperinflation",k:"ab"}],
  "lung sliding (l)": [{t:"Present \u2014 pneumothorax excluded left",k:"n"}, {t:"Absent \u2014 pneumothorax suspected left",k:"ab"}],
  "lung sliding (r)": [{t:"Present \u2014 pneumothorax excluded right",k:"n"}, {t:"Absent \u2014 pneumothorax suspected right",k:"ab"}, {t:"Absent \u2014 consolidation/pleurodesis",k:"ab"}],
  "lv dilation": [{t:"Normal LV size",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Moderately dilated",k:"ab"}, {t:"Severely dilated",k:"ab"}],
  "lv hypertrophy": [{t:"Not seen",k:"n"}, {t:"Concentric remodelling",k:"i"}, {t:"Concentric LVH",k:"ab"}, {t:"Eccentric LVH",k:"ab"}],
  "lvef (eyeball)": [{t:"Normal >55%",k:"n"}, {t:"Mildly reduced 45\u201355%",k:"i"}, {t:"Moderately reduced 30\u201345%",k:"ab"}, {t:"Severely reduced <30%",k:"ab"}],
  "lymph nodes": [{t:"Not seen",k:"n"}, {t:"Reactive \u2014 oval, echogenic hilum",k:"i"}, {t:"Rounded \u2014 loss of hilum",k:"ab"}, {t:"Cortical thickening >3 mm",k:"ab"}, {t:"Internal vascularity \u2014 suspicious",k:"ab"}, {t:"Necrotic centre",k:"ab"}, {t:"Conglomerate nodes",k:"ab"}],
  "lymphocoele": [{t:"Not seen",k:"n"}, {t:"Small \u2014 likely resolving",k:"i"}, {t:"Present \u2014 drainage required",k:"ab"}, {t:"Large symptomatic",k:"ab"}],
  "main renal artery ri": [{t:"Normal RI 0.5\u20130.7",k:"n"}, {t:"Borderline 0.7\u20130.8",k:"i"}, {t:"Raised >0.8 \u2014 rejection/obstruction?",k:"ab"}],
  "margins": [{t:"Smooth, well-defined",k:"n"}, {t:"Lobulated",k:"i"}, {t:"Irregular",k:"ab"}, {t:"Ill-defined",k:"ab"}, {t:"Spiculated",k:"ab"}],
  "masses": [{t:"Not seen",k:"n"}, {t:"Simple cyst \u2014 likely benign",k:"i"}, {t:"Dermoid \u2014 typical",k:"i"}, {t:"Complex mass \u2014 evaluation required",k:"ab"}, {t:"Haemorrhagic cyst",k:"ab"}, {t:"Torsion features",k:"ab"}],
  "mediastinal width": [{t:"Normal mediastinal width",k:"n"}, {t:"Mildly widened",k:"i"}, {t:"Wide \u2014 aortic pathology?",k:"ab"}, {t:"Massive \u2014 urgent CTA",k:"ab"}],
  "mesenteric fat echogenicity": [{t:"Normal",k:"n"}, {t:"Mildly increased",k:"i"}, {t:"Markedly increased \u2014 fat stranding",k:"ab"}, {t:"Creeping fat \u2014 Crohn's?",k:"ab"}],
  "mesenteric nodes": [{t:"Not enlarged",k:"n"}, {t:"Mildly enlarged \u2014 reactive",k:"i"}, {t:"Significantly enlarged",k:"ab"}, {t:"Conglomerate mass",k:"ab"}],
  "mid interlobar ri": [{t:"Normal RI 0.5\u20130.7",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Raised >0.8",k:"ab"}],
  "middle hv": [{t:"Patent \u2014 normal triphasic",k:"n"}, {t:"Stenosis",k:"ab"}, {t:"Thrombosis",k:"ab"}],
  "midline shift (mm)": [{t:"No midline shift",k:"n"}, {t:"Minimal shift <5 mm",k:"i"}, {t:"Moderate shift 5\u201310 mm",k:"ab"}, {t:"Significant >10 mm \u2014 neurosurgical review",k:"ab"}],
  "morphology": [{t:"Normal \u2014 oval, echogenic hilum",k:"n"}, {t:"Reactive morphology",k:"i"}, {t:"Rounded \u2014 loss of hilum",k:"ab"}, {t:"Cortical bulge",k:"ab"}, {t:"Suspicious morphology",k:"ab"}],
  "morrison's pouch": [{t:"No free fluid",k:"n"}, {t:"Trace fluid",k:"i"}, {t:"Free fluid \u2014 FAST positive",k:"ab"}],
  "murphy sign": [{t:"Negative",k:"n"}, {t:"Equivocal",k:"i"}, {t:"Positive \u2014 acute cholecystitis suspected",k:"ab"}],
  "mvp (cm)": [{t:"Normal 2\u20138 cm",k:"n"}, {t:"Borderline 1\u20132 cm",k:"i"}, {t:"Reduced <1 cm",k:"ab"}, {t:"Increased >8 cm",k:"ab"}],
  "myometrium": [{t:"Homogeneous myometrium",k:"n"}, {t:"Mildly heterogeneous",k:"i"}, {t:"Heterogeneous \u2014 adenomyosis?",k:"ab"}, {t:"Focal myometrial lesion",k:"ab"}],
  "nasal bone (present/absent)": [{t:"Present \u2014 normal length",k:"n"}, {t:"Short \u2014 borderline",k:"i"}, {t:"Absent \u2014 T21 soft marker",k:"ab"}],
  "needle visualised": [{t:"Clearly visualised throughout",k:"n"}, {t:"Partially visualised",k:"i"}, {t:"Poor visualisation",k:"ab"}],
  "nodules": [{t:"Not seen",k:"n"}, {t:"Likely benign nodule \u2014 TIRADS 2",k:"i"}, {t:"Colloid nodule",k:"i"}, {t:"Probably benign \u2014 TIRADS 3",k:"i"}, {t:"Suspicious nodule \u2014 TIRADS 4",k:"ab"}, {t:"High suspicion \u2014 TIRADS 5 \u2014 FNA required",k:"ab"}],
  "nuchal fold (if 18-22 wks)": [{t:"Normal <6 mm",k:"n"}, {t:"Borderline 5\u20136 mm",k:"i"}, {t:"Increased \u22656 mm \u2014 T21 soft marker",k:"ab"}],
  "oesophageal/gastric varices": [{t:"Not seen on USS",k:"n"}, {t:"Suspected",k:"i"}, {t:"Present \u2014 large varices",k:"ab"}],
  "optic nerve sheath diameter (mm)": [{t:"Normal <5 mm adult / <4.5 mm child",k:"n"}, {t:"Borderline 5.0\u20135.5 mm",k:"i"}, {t:"Raised >5.5 mm \u2014 raised ICP suspected",k:"ab"}, {t:"Markedly raised \u2014 urgent neurology",k:"ab"}],
  "orbital mass": [{t:"Not seen",k:"n"}, {t:"Indeterminate lesion \u2014 CT/MRI required",k:"i"}, {t:"Solid mass",k:"ab"}, {t:"Cystic lesion",k:"ab"}, {t:"Vascular lesion \u2014 varix?",k:"ab"}],
  "orientation": [{t:"Parallel \u2014 wider than tall \u2014 benign",k:"n"}, {t:"Non-parallel \u2014 taller than wide \u2014 suspicious",k:"ab"}],
  "outer diameter (mm)": [{t:"Normal <6 mm",k:"n"}, {t:"Borderline 6\u20137 mm",k:"i"}, {t:"Enlarged >6 mm \u2014 appendicitis suspected",k:"ab"}, {t:"Markedly enlarged >8 mm",k:"ab"}],
  "para-aortic nodes": [{t:"Not enlarged",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Significant adenopathy",k:"ab"}, {t:"Conglomerate \u2014 lymphoma?",k:"ab"}],
  "paraumbilical vein recanalization": [{t:"Not seen",k:"n"}, {t:"Present \u2014 portal hypertension sign",k:"ab"}],
  "passes made": [{t:"1 pass",k:"i"}, {t:"2 passes",k:"i"}, {t:"3 passes",k:"i"}, {t:"Multiple passes required",k:"ab"}],
  "peak systolic velocity": [{t:"Normal",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Elevated \u2014 stenosis suggested",k:"ab"}, {t:"Markedly elevated \u2014 critical stenosis",k:"ab"}],
  "perforation features": [{t:"Not seen",k:"n"}, {t:"Suspected \u2014 localised fat stranding",k:"i"}, {t:"Perforation \u2014 free fluid",k:"ab"}, {t:"Abscess formation",k:"ab"}, {t:"Peritonism features",k:"ab"}],
  "periappendiceal fat echogenicity": [{t:"Normal echogenicity",k:"n"}, {t:"Mildly increased",k:"i"}, {t:"Markedly increased \u2014 periappendicitis",k:"ab"}, {t:"Collection present",k:"ab"}, {t:"Abscess formation",k:"ab"}],
  "pericardial effusion": [{t:"Not seen",k:"n"}, {t:"Trace <5 mm \u2014 physiological",k:"i"}, {t:"Small 5\u201310 mm",k:"i"}, {t:"Moderate 10\u201320 mm",k:"ab"}, {t:"Large >20 mm \u2014 tamponade risk",k:"ab"}],
  "pericholecystic fluid": [{t:"Not seen",k:"n"}, {t:"Present \u2014 small",k:"ab"}, {t:"Present \u2014 moderate",k:"ab"}, {t:"Fat stranding",k:"ab"}],
  "perifacial nodes": [{t:"Not seen / normal",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious",k:"ab"}],
  "perihepatic collection": [{t:"Not seen",k:"n"}, {t:"Small \u2014 post-operative",k:"i"}, {t:"Significant collection",k:"ab"}, {t:"Abscess",k:"ab"}, {t:"Haematoma",k:"ab"}],
  "perinephric collection": [{t:"Not seen",k:"n"}, {t:"Small perinephric fluid \u2014 monitor",k:"i"}, {t:"Haematoma",k:"ab"}, {t:"Urinoma",k:"ab"}, {t:"Lymphocoele",k:"ab"}, {t:"Abscess",k:"ab"}],
  "periparotid nodes": [{t:"Not seen / normal",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious",k:"ab"}, {t:"Rounded",k:"ab"}],
  "periportal fibrosis": [{t:"Not seen",k:"n"}, {t:"Mild periportal echogenicity",k:"i"}, {t:"Periportal fibrosis",k:"ab"}, {t:"Marked \u2014 Symmers pipestem pattern",k:"ab"}],
  "perisplenic": [{t:"No free fluid",k:"n"}, {t:"Trace perisplenic fluid",k:"i"}, {t:"Free fluid \u2014 FAST positive",k:"ab"}],
  "peristalsis": [{t:"Normal peristalsis seen",k:"n"}, {t:"Sluggish peristalsis",k:"i"}, {t:"Absent peristalsis \u2014 obstruction/ileus",k:"ab"}, {t:"Increased \u2014 gastroenteritis",k:"ab"}],
  "periventricular leukomalacia": [{t:"Not seen",k:"n"}, {t:"Periventricular echogenicity \u2014 monitor",k:"i"}, {t:"Cystic PVL \u2014 bilateral",k:"ab"}, {t:"Cystic PVL \u2014 unilateral",k:"ab"}],
  "peroneal artery": [{t:"Patent",k:"n"}, {t:"Reduced flow",k:"i"}, {t:"Not fully visualised",k:"i"}, {t:"Absent \u2014 occlusion",k:"ab"}],
  "peroneal veins": [{t:"Compressible \u2014 no DVT",k:"n"}, {t:"Not visualised",k:"i"}, {t:"Non-compressible \u2014 DVT",k:"ab"}],
  "placenta location": [{t:"Posterior \u2014 normal",k:"n"}, {t:"Fundal \u2014 normal",k:"n"}, {t:"Anterior \u2014 normal",k:"n"}, {t:"Anterior low \u2014 not covering os",k:"i"}, {t:"Posterior low \u2014 not covering os",k:"i"}, {t:"Low-lying \u2014 <20 mm from os",k:"ab"}, {t:"Placenta praevia \u2014 major",k:"ab"}, {t:"Placenta praevia \u2014 minor",k:"ab"}],
  "plaques": [{t:"Not seen",k:"n"}, {t:"Non-significant plaque",k:"i"}, {t:"Calcified plaque",k:"ab"}, {t:"Mixed echogenicity plaque",k:"ab"}, {t:"Soft/lipid-rich plaque",k:"ab"}, {t:"Ulcerated plaque",k:"ab"}],
  "plaques \u2014 location": [{t:"Carotid bifurcation",k:"i"}, {t:"Proximal ICA",k:"i"}, {t:"CCA origin",k:"i"}, {t:"Distal CCA",k:"i"}],
  "plaques \u2014 morphology": [{t:"Not seen",k:"n"}, {t:"Calcified \u2014 stable",k:"i"}, {t:"Fibrous",k:"i"}, {t:"Mixed echogenicity",k:"ab"}, {t:"Soft/lipid-rich",k:"ab"}, {t:"Ulcerated surface",k:"ab"}],
  "pleural effusion": [{t:"Not seen",k:"n"}, {t:"Small \u2014 blunting of costophrenic angle",k:"i"}, {t:"Moderate effusion",k:"ab"}, {t:"Large effusion",k:"ab"}, {t:"Bilateral effusions",k:"ab"}],
  "pneumoperitoneum": [{t:"Not seen",k:"n"}, {t:"Suspected",k:"i"}, {t:"Present \u2014 free gas \u2014 perforation",k:"ab"}],
  "pneumoperitoneum (if any)": [{t:"Not seen",k:"n"}, {t:"Suspected \u2014 artifact vs gas",k:"i"}, {t:"Free gas detected \u2014 perforation \u2014 urgent surgical review",k:"ab"}],
  "pneumothorax": [{t:"Not seen",k:"n"}, {t:"Suspected \u2014 subtle",k:"i"}, {t:"Present \u2014 small",k:"ab"}, {t:"Present \u2014 moderate",k:"ab"}, {t:"Tension \u2014 urgent",k:"ab"}],
  "polyps": [{t:"Not seen",k:"n"}, {t:"<6 mm \u2014 likely cholesterol polyp",k:"i"}, {t:"6\u201310 mm \u2014 follow-up",k:"ab"}, {t:"\u226510 mm \u2014 resection considered",k:"ab"}],
  "popliteal artery": [{t:"Triphasic waveform",k:"n"}, {t:"Biphasic",k:"i"}, {t:"Monophasic",k:"ab"}, {t:"Occlusion",k:"ab"}, {t:"Popliteal aneurysm",k:"ab"}],
  "popliteal vein": [{t:"Compressible \u2014 no DVT",k:"n"}, {t:"Non-compressible \u2014 DVT",k:"ab"}, {t:"Partial thrombosis",k:"ab"}],
  "portal vein": [{t:"Patent, hepatopetal flow, normal calibre",k:"n"}, {t:"Dilated \u2014 hypertension?",k:"i"}, {t:"Thrombosis",k:"ab"}, {t:"Hepatofugal flow",k:"ab"}, {t:"Cavernous transformation",k:"ab"}],
  "portal vein diameter": [{t:"Normal (<13 mm)",k:"n"}, {t:"Mildly dilated 13\u201316 mm",k:"i"}, {t:"Dilated >16 mm \u2014 portal hypertension",k:"ab"}],
  "portal vein flow direction": [{t:"Hepatopetal \u2014 towards liver \u2014 normal",k:"n"}, {t:"Hepatofugal \u2014 away from liver",k:"ab"}, {t:"To-and-fro flow",k:"ab"}],
  "portal vein velocity (cm/s)": [{t:"Normal >15 cm/s",k:"n"}, {t:"Reduced 10\u201315 cm/s",k:"i"}, {t:"Markedly reduced <10 cm/s \u2014 portal hypertension",k:"ab"}],
  "position": [{t:"Anteverted \u2014 normal",k:"n"}, {t:"Mid-position",k:"i"}, {t:"Retroverted \u2014 normal variant",k:"i"}, {t:"Markedly retroflexed",k:"ab"}],
  "post-void residual": [{t:"Normal <50 ml",k:"n"}, {t:"50\u2013100 ml \u2014 mildly elevated",k:"i"}, {t:"100\u2013300 ml \u2014 elevated",k:"ab"}, {t:"Significantly elevated >300 ml",k:"ab"}],
  "post-void residual (ml)": [{t:"Normal <50 ml",k:"n"}, {t:"50\u2013100 ml \u2014 mildly elevated",k:"i"}, {t:"100\u2013300 ml \u2014 elevated",k:"ab"}, {t:"Significantly elevated >300 ml",k:"ab"}],
  "posterior acoustic effect": [{t:"None",k:"n"}, {t:"Posterior enhancement \u2014 cystic lesion",k:"i"}, {t:"Posterior shadowing \u2014 calcification",k:"i"}, {t:"Mixed enhancement \u2014 complex lesion",k:"ab"}],
  "posterior fossa": [{t:"Normal posterior fossa",k:"n"}, {t:"Enlarged cisterna magna >10 mm",k:"ab"}, {t:"Dandy-Walker malformation",k:"ab"}, {t:"Cerebellar hypoplasia",k:"ab"}],
  "posterior tibial artery": [{t:"Patent",k:"n"}, {t:"Reduced flow",k:"i"}, {t:"Absent \u2014 occlusion",k:"ab"}],
  "posterior tibial veins": [{t:"Compressible \u2014 no DVT",k:"n"}, {t:"Not visualised",k:"i"}, {t:"Non-compressible \u2014 DVT",k:"ab"}],
  "posterior vitreous detachment": [{t:"Not seen",k:"n"}, {t:"Partial PVD",k:"i"}, {t:"Complete PVD",k:"ab"}, {t:"PVD with retinal traction",k:"ab"}],
  "posterior wall thickness": [{t:"Normal 7\u201311 mm",k:"n"}, {t:"Borderline",k:"i"}, {t:"Hypertrophied \u226514 mm",k:"ab"}],
  "pouch of douglas": [{t:"No free fluid",k:"n"}, {t:"Trace free fluid \u2014 physiological",k:"i"}, {t:"Free fluid \u2014 moderate",k:"ab"}, {t:"Free fluid \u2014 significant",k:"ab"}],
  "presentation": [{t:"Cephalic",k:"n"}, {t:"Breech \u2014 frank",k:"i"}, {t:"Breech \u2014 complete",k:"i"}, {t:"Breech \u2014 footling",k:"i"}, {t:"Transverse",k:"ab"}, {t:"Compound presentation",k:"ab"}],
  "projection": [{t:"PA erect",k:"i"}, {t:"AP erect",k:"i"}, {t:"AP supine",k:"i"}, {t:"AP portable",k:"i"}, {t:"Lateral",k:"i"}, {t:"Oblique",k:"i"}],
  "proptosis": [{t:"Not seen",k:"n"}, {t:"Mild proptosis",k:"i"}, {t:"Moderate proptosis",k:"ab"}, {t:"Significant \u2014 orbital mass compression?",k:"ab"}],
  "pv diameter": [{t:"Normal calibre",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Dilated \u2014 portal hypertension?",k:"ab"}, {t:"Thrombosis",k:"ab"}],
  "pv velocity (cm/s)": [{t:"Normal >20 cm/s",k:"n"}, {t:"Reduced 10\u201320 cm/s",k:"i"}, {t:"Markedly reduced <10 cm/s \u2014 portal vein thrombosis?",k:"ab"}],
  "qualitative assessment": [{t:"Normal liquor volume",k:"n"}, {t:"Subjectively reduced",k:"i"}, {t:"Subjectively increased",k:"i"}, {t:"Oligohydramnios",k:"ab"}, {t:"Polyhydramnios \u2014 anhydramnios",k:"ab"}],
  "ranula": [{t:"Not seen",k:"n"}, {t:"Simple ranula \u2014 floor of mouth",k:"ab"}, {t:"Plunging ranula \u2014 extending into neck",k:"ab"}],
  "real-time guidance used": [{t:"Real-time ultrasound guidance throughout",k:"n"}, {t:"Pre-procedure marking only",k:"i"}, {t:"Guidance limited by depth/gas",k:"ab"}],
  "regularity": [{t:"Regular, smooth borders",k:"n"}, {t:"Irregular sac borders",k:"ab"}, {t:"Poorly formed sac",k:"ab"}],
  "relationship to fascia/muscle": [{t:"Subcutaneous \u2014 above deep fascia",k:"n"}, {t:"Intramuscular",k:"i"}, {t:"Intermuscular",k:"i"}, {t:"Invading muscle planes",k:"ab"}],
  "renal artery anastomosis patency": [{t:"Patent \u2014 normal waveform",k:"n"}, {t:"Mild spectral broadening",k:"i"}, {t:"Stenosis suspected \u2014 elevated PSV",k:"ab"}, {t:"Thrombosis \u2014 absent flow",k:"ab"}],
  "renal artery peak systolic velocity": [{t:"Normal <180 cm/s",k:"n"}, {t:"Borderline 180\u2013200 cm/s",k:"i"}, {t:"Elevated >200 cm/s \u2014 RAS suspected",k:"ab"}],
  "renal artery stenosis": [{t:"Not seen \u2014 normal waveforms",k:"n"}, {t:"Indirect signs \u2014 parvus-tardus",k:"i"}, {t:"Likely stenosis \u2014 elevated PSV",k:"ab"}, {t:"Critical stenosis suspected",k:"ab"}],
  "renal calculi": [{t:"Not seen",k:"n"}, {t:"Small non-obstructing calculus",k:"i"}, {t:"Obstructing calculus",k:"ab"}, {t:"Multiple calculi",k:"ab"}, {t:"Staghorn calculus",k:"ab"}],
  "renal vein patency": [{t:"Patent \u2014 normal flow",k:"n"}, {t:"Thrombosis suspected \u2014 absent flow",k:"ab"}, {t:"Renal vein thrombosis",k:"ab"}],
  "retinal detachment": [{t:"Not seen",k:"n"}, {t:"Present \u2014 partial",k:"ab"}, {t:"Present \u2014 total",k:"ab"}, {t:"Present \u2014 bullous",k:"ab"}, {t:"Present \u2014 funnel-shaped",k:"ab"}],
  "right": [{t:"Normal size and echogenicity",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 epididymo-orchitis?",k:"ab"}, {t:"Absent",k:"ab"}, {t:"Cystic change",k:"ab"}],
  "right axilla": [{t:"Normal nodes \u2014 hilum present",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious \u2014 cortical thickening",k:"ab"}, {t:"Rounded node",k:"ab"}],
  "right cca": [{t:"Patent \u2014 no plaque, normal waveform",k:"n"}, {t:"IMT mildly increased",k:"i"}, {t:"Plaque <50% stenosis",k:"ab"}, {t:"Significant stenosis",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "right diaphragm movement": [{t:"Normal excursion >15 mm",k:"n"}, {t:"Reduced excursion",k:"i"}, {t:"Paradoxical movement \u2014 phrenic nerve palsy",k:"ab"}, {t:"Absent movement",k:"ab"}],
  "right groin": [{t:"Normal inguinal nodes",k:"n"}, {t:"Reactive",k:"i"}, {t:"Suspicious",k:"ab"}, {t:"Matted",k:"ab"}],
  "right hip classification": [{t:"Graf Type I \u2014 normal, no treatment required",k:"n"}, {t:"Graf IIa \u2014 physiological, clinical follow-up",k:"i"}, {t:"Graf IIb/IIc \u2014 harness therapy indicated",k:"ab"}, {t:"Graf III/IV \u2014 urgent orthopaedic referral",k:"ab"}],
  "right hv": [{t:"Patent \u2014 normal triphasic",k:"n"}, {t:"Stenosis",k:"ab"}, {t:"Thrombosis \u2014 absent flow",k:"ab"}],
  "right ica/eca": [{t:"Patent \u2014 normal velocities",k:"n"}, {t:"Mild plaque \u2014 <50%",k:"i"}, {t:"Moderate stenosis 50\u201369%",k:"ab"}, {t:"Severe stenosis 70\u201399%",k:"ab"}, {t:"Near occlusion",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "right kidney size": [{t:"Normal 9\u201312 cm",k:"n"}, {t:"Upper limit of normal",k:"i"}, {t:"Enlarged >12 cm",k:"ab"}, {t:"Small <9 cm",k:"ab"}, {t:"Atrophic",k:"ab"}],
  "right lobe size": [{t:"Normal size",k:"n"}, {t:"Upper limit of normal",k:"i"}, {t:"Enlarged \u2014 goitre",k:"ab"}, {t:"Atrophic",k:"ab"}],
  "right ovary size": [{t:"Normal size",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 complex lesion",k:"ab"}, {t:"Not visualised",k:"ab"}],
  "right parotid duct": [{t:"Normal calibre",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Dilated \u2014 sialolithiasis",k:"ab"}, {t:"Calculus in Stensen duct",k:"ab"}],
  "right parotid echogenicity": [{t:"Normal echogenicity",k:"n"}, {t:"Heterogeneous",k:"i"}, {t:"Decreased \u2014 parotitis",k:"ab"}, {t:"Focal hypoechoic lesion",k:"ab"}],
  "right parotid focal lesion": [{t:"Not seen",k:"n"}, {t:"Warthin tumour \u2014 typical",k:"i"}, {t:"Pleomorphic adenoma features",k:"i"}, {t:"Malignant features \u2014 irregular margins",k:"ab"}, {t:"Lymph node vs parotid mass",k:"ab"}],
  "right parotid size": [{t:"Normal size",k:"n"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged \u2014 parotitis?",k:"ab"}, {t:"Mass lesion",k:"ab"}],
  "right resistive index": [{t:"Normal RI 0.5\u20130.7",k:"n"}, {t:"Mildly elevated 0.7\u20130.8",k:"i"}, {t:"Raised >0.8 \u2014 obstruction/rejection?",k:"ab"}],
  "right seminal vesicle": [{t:"Normal",k:"n"}, {t:"Dilated",k:"ab"}, {t:"Calculi",k:"ab"}, {t:"Infiltrated",k:"ab"}],
  "right sublingual": [{t:"Normal",k:"n"}, {t:"Enlarged",k:"ab"}, {t:"Cystic lesion",k:"ab"}, {t:"Ranula",k:"ab"}],
  "right submandibular echogenicity": [{t:"Normal",k:"n"}, {t:"Decreased \u2014 sialadenitis",k:"ab"}, {t:"Focal lesion",k:"ab"}],
  "right submandibular size": [{t:"Normal size",k:"n"}, {t:"Enlarged \u2014 sialadenitis?",k:"ab"}, {t:"Mass lesion",k:"ab"}],
  "right testis size": [{t:"Normal size",k:"n"}, {t:"Mildly small",k:"i"}, {t:"Atrophic",k:"ab"}, {t:"Enlarged \u2014 orchitis/tumour?",k:"ab"}],
  "right va flow direction": [{t:"Antegrade \u2014 normal",k:"n"}, {t:"Retrograde \u2014 subclavian steal",k:"ab"}, {t:"To-and-fro \u2014 subclavian steal",k:"ab"}],
  "right wharton duct": [{t:"Normal \u2014 not dilated",k:"n"}, {t:"Dilated \u2014 calculus suspected",k:"ab"}, {t:"Calculus confirmed",k:"ab"}],
  "rotation": [{t:"No rotation",k:"n"}, {t:"Mild rotation",k:"i"}, {t:"Significant rotation \u2014 limiting study",k:"ab"}],
  "rv function": [{t:"Normal",k:"n"}, {t:"Mildly impaired",k:"i"}, {t:"Moderately impaired",k:"ab"}, {t:"Severely impaired",k:"ab"}],
  "rv size relative to lv": [{t:"Normal RV:LV ratio <0.6",k:"n"}, {t:"Mildly enlarged \u2014 ratio 0.6\u20131.0",k:"i"}, {t:"Severely enlarged \u2014 ratio >1.0",k:"ab"}, {t:"RV > LV \u2014 acute cor pulmonale",k:"ab"}],
  "safe aspiration point marked": [{t:"Safe window confirmed \u2014 marked",k:"n"}, {t:"Limited window \u2014 CT guidance preferred",k:"i"}, {t:"No safe window \u2014 CT guidance required",k:"ab"}],
  "seminal vesicles": [{t:"Normal size and echogenicity",k:"n"}, {t:"Mildly prominent",k:"i"}, {t:"Dilated",k:"ab"}, {t:"Calculi",k:"ab"}, {t:"Mass",k:"ab"}],
  "septations": [{t:"Not seen",k:"n"}, {t:"Fine thin septations",k:"i"}, {t:"Thick septations \u2014 exudate/empyema",k:"ab"}, {t:"Complex loculated",k:"ab"}],
  "shape": [{t:"Oval \u2014 benign morphology",k:"n"}, {t:"Round",k:"n"}, {t:"Irregular",k:"i"}, {t:"Irregular \u2014 suspicious",k:"ab"}],
  "short axis (mm)": [{t:"Normal <10 mm",k:"n"}, {t:"Borderline 10\u201315 mm",k:"i"}, {t:"Enlarged >15 mm",k:"ab"}, {t:"Conglomerate nodes",k:"ab"}],
  "significant aortic stenosis/regurgitation": [{t:"Not seen",k:"n"}, {t:"Mild valve disease",k:"i"}, {t:"Significant aortic valve disease",k:"ab"}, {t:"Severe AS features",k:"ab"}],
  "significant mitral regurgitation": [{t:"Not seen",k:"n"}, {t:"Mild MR \u2014 trivial jet",k:"i"}, {t:"Moderate MR",k:"ab"}, {t:"Severe MR \u2014 flail leaflet/rupture",k:"ab"}],
  "sinus tract": [{t:"Not seen",k:"n"}, {t:"Present",k:"ab"}, {t:"Sinus tract to skin surface",k:"ab"}],
  "size": [{t:"Normal size",k:"n"}, {t:"Upper limit of normal",k:"i"}, {t:"Mildly enlarged",k:"i"}, {t:"Enlarged",k:"ab"}, {t:"Reduced",k:"ab"}, {t:"Atrophic",k:"ab"}],
  "size (cm)": [{t:"Normal (<12 cm)",k:"n"}, {t:"Mildly enlarged 12\u201315 cm",k:"i"}, {t:"Splenomegaly >15 cm",k:"ab"}, {t:"Massive splenomegaly",k:"ab"}],
  "skin covering": [{t:"Intact skin covering",k:"n"}, {t:"Defect \u2014 NTD?",k:"ab"}, {t:"Myelomeningocele suspected",k:"ab"}],
  "skin thickness": [{t:"Normal skin thickness",k:"n"}, {t:"Mildly thickened",k:"i"}, {t:"Thickened \u2014 oedema/lymphoedema",k:"ab"}, {t:"Skin involvement",k:"ab"}],
  "skull integrity": [{t:"Intact",k:"n"}, {t:"Defect noted",k:"ab"}, {t:"Absent \u2014 acrania/exencephaly",k:"ab"}],
  "sludge": [{t:"Not seen",k:"n"}, {t:"Trace sludge",k:"i"}, {t:"Layering sludge",k:"i"}, {t:"Thick sludge",k:"ab"}, {t:"Tumefactive sludge \u2014 mass-like",k:"ab"}],
  "small bowel wall thickness (mm)": [{t:"Normal <3 mm",k:"n"}, {t:"Mildly thickened 3\u20134 mm",k:"i"}, {t:"Thickened >4 mm \u2014 IBD/infection?",k:"ab"}, {t:"Markedly thickened \u2014 Crohn's?",k:"ab"}],
  "splenic hilar varices": [{t:"Not seen",k:"n"}, {t:"Suspected",k:"i"}, {t:"Present \u2014 portal hypertension",k:"ab"}],
  "splenic vein diameter": [{t:"Normal <10 mm",k:"n"}, {t:"Mildly dilated 10\u201312 mm",k:"i"}, {t:"Dilated >12 mm \u2014 portal hypertension",k:"ab"}],
  "splenomegaly grade": [{t:"No splenomegaly",k:"n"}, {t:"Mild 12\u201315 cm",k:"i"}, {t:"Moderate 15\u201320 cm",k:"i"}, {t:"Massive >20 cm",k:"ab"}],
  "spontaneous portosystemic shunts": [{t:"Not seen",k:"n"}, {t:"Recanalized paraumbilical vein",k:"i"}, {t:"Splenorenal shunt",k:"ab"}, {t:"Gastrorenal shunt",k:"ab"}, {t:"Large spontaneous shunt",k:"ab"}],
  "stenosis grade (nascet %)": [{t:"No significant stenosis <50%",k:"n"}, {t:"Moderate stenosis 50\u201369%",k:"i"}, {t:"Severe stenosis 70\u201399%",k:"ab"}, {t:"Near occlusion",k:"ab"}, {t:"Complete occlusion",k:"ab"}],
  "stomach bubble": [{t:"Seen \u2014 left upper quadrant \u2014 normal",k:"n"}, {t:"Not seen \u2014 rescan",k:"i"}, {t:"Not seen \u2014 OA?",k:"ab"}, {t:"Double bubble \u2014 duodenal atresia?",k:"ab"}, {t:"Right-sided \u2014 situs inversus?",k:"ab"}],
  "stricture": [{t:"Not seen",k:"n"}, {t:"Suspected",k:"i"}, {t:"Present \u2014 proximal",k:"ab"}, {t:"Present \u2014 mid",k:"ab"}, {t:"Present \u2014 distal CBD",k:"ab"}],
  "subarachnoid space width": [{t:"Normal <5 mm",k:"n"}, {t:"Mildly prominent",k:"i"}, {t:"Widened \u2014 benign extra-axial collections of infancy?",k:"ab"}, {t:"Subdural hygroma",k:"ab"}],
  "subclavian vein": [{t:"Compressible \u2014 patent",k:"n"}, {t:"Non-compressible \u2014 DVT",k:"ab"}, {t:"Thrombus seen",k:"ab"}],
  "subcutaneous oedema": [{t:"Not seen",k:"n"}, {t:"Mild",k:"i"}, {t:"Moderate",k:"ab"}, {t:"Marked \u2014 pitting oedema pattern",k:"ab"}],
  "subdural collection": [{t:"Not seen",k:"n"}, {t:"Subdural collection \u2014 right",k:"ab"}, {t:"Subdural collection \u2014 bilateral",k:"ab"}, {t:"Subdural haematoma",k:"ab"}],
  "sulcal development": [{t:"Appropriate for gestational age",k:"n"}, {t:"Reduced \u2014 pachygyria?",k:"ab"}, {t:"Excessive \u2014 may indicate atrophy",k:"ab"}],
  "superficial femoral artery": [{t:"Triphasic waveform",k:"n"}, {t:"Biphasic",k:"i"}, {t:"Monophasic",k:"ab"}, {t:"Focal stenosis",k:"ab"}, {t:"Occlusion",k:"ab"}],
  "superior mesenteric vein": [{t:"Normal calibre",k:"n"}, {t:"Mildly dilated",k:"i"}, {t:"Dilated \u2014 portal hypertension",k:"ab"}, {t:"Thrombosis",k:"ab"}],
  "surface contour": [{t:"Smooth",k:"n"}, {t:"Nodular \u2014 cirrhosis?",k:"ab"}, {t:"Irregular",k:"ab"}],
  "synovial thickening": [{t:"Not seen",k:"n"}, {t:"Mild synovial thickening",k:"i"}, {t:"Moderate proliferative synovitis",k:"ab"}, {t:"Marked \u2014 rheumatoid?",k:"ab"}],
  "tamponade features (ra/rv collapse)": [{t:"Not seen",k:"n"}, {t:"Equivocal RA compression",k:"i"}, {t:"RA collapse \u2014 early tamponade",k:"ab"}, {t:"RV diastolic collapse \u2014 tamponade \u2014 urgent",k:"ab"}],
  "tapse (mm)": [{t:"Normal \u226517 mm",k:"n"}, {t:"Borderline 15\u201317 mm",k:"i"}, {t:"Reduced <15 mm \u2014 RV dysfunction",k:"ab"}],
  "target sign (intussusception)": [{t:"Not seen",k:"n"}, {t:"Suspected",k:"i"}, {t:"Present \u2014 intussusception confirmed",k:"ab"}, {t:"Lead point identified",k:"ab"}],
  "tendon integrity": [{t:"Intact \u2014 normal fibrillar echotexture",k:"n"}, {t:"Tendinopathy \u2014 no tear",k:"i"}, {t:"Partial thickness tear",k:"ab"}, {t:"Full thickness tear",k:"ab"}, {t:"Complete rupture",k:"ab"}],
  "third ventricle (mm)": [{t:"Normal <3 mm",k:"n"}, {t:"Mildly dilated 3\u20135 mm",k:"i"}, {t:"Dilated >5 mm",k:"ab"}],
  "trabeculation": [{t:"Not seen",k:"n"}, {t:"Mild trabeculation",k:"i"}, {t:"Moderate trabeculation",k:"ab"}, {t:"Marked with diverticula",k:"ab"}],
  "trachea": [{t:"Midline",k:"n"}, {t:"Slightly deviated",k:"i"}, {t:"Deviated right",k:"ab"}, {t:"Deviated left \u2014 mass/effusion?",k:"ab"}],
  "upper lip/palate": [{t:"Intact \u2014 no cleft seen",k:"n"}, {t:"Unilateral cleft lip",k:"ab"}, {t:"Bilateral cleft lip",k:"ab"}, {t:"Cleft lip and palate",k:"ab"}],
  "upper pole interlobar ri": [{t:"Normal RI 0.5\u20130.7",k:"n"}, {t:"Mildly elevated",k:"i"}, {t:"Raised >0.8",k:"ab"}],
  "ureteric jets": [{t:"Bilateral jets present \u2014 normal",k:"n"}, {t:"Right jet only",k:"i"}, {t:"Left jet only",k:"i"}, {t:"No jets \u2014 obstruction?",k:"ab"}],
  "urinoma": [{t:"Not seen",k:"n"}, {t:"Small perinephric fluid",k:"i"}, {t:"Urinoma \u2014 urine leak suspected",k:"ab"}, {t:"Large \u2014 drainage required",k:"ab"}],
  "valve vegetation": [{t:"Not seen",k:"n"}, {t:"Suspected \u2014 irregular leaflet echogenicity",k:"i"}, {t:"Vegetation suspected \u2014 IE protocol",k:"ab"}, {t:"Large mobile vegetation \u2014 urgent cardiology",k:"ab"}],
  "varicocele": [{t:"Not seen",k:"n"}, {t:"Subclinical varicocele",k:"i"}, {t:"Left varicocele \u2014 grade I",k:"ab"}, {t:"Left varicocele \u2014 grade II/III",k:"ab"}, {t:"Bilateral varicocele",k:"ab"}],
  "vasa praevia": [{t:"Not seen",k:"n"}, {t:"Suspected \u2014 Doppler required",k:"i"}, {t:"Present \u2014 urgent referral",k:"ab"}],
  "vascularity": [{t:"No internal vascularity",k:"n"}, {t:"Peripheral vascularity",k:"i"}, {t:"Internal vascularity \u2014 BIRADS 3",k:"i"}, {t:"Marked internal vascularity \u2014 suspicious",k:"ab"}],
  "visible glands": [{t:"Not visualised \u2014 normal",k:"n"}, {t:"Possible parathyroid tissue",k:"i"}, {t:"Enlarged gland \u2014 adenoma suspected",k:"ab"}, {t:"Multiple enlarged glands",k:"ab"}],
  "visualised (yes/no)": [{t:"Visualised \u2014 normal calibre, compressible",k:"n"}, {t:"Not visualised \u2014 indeterminate study",k:"i"}, {t:"Visualised \u2014 abnormal \u2014 appendicitis suspected",k:"ab"}],
  "vitreous echogenicity": [{t:"Anechoic \u2014 normal",k:"n"}, {t:"Asteroid hyalosis \u2014 benign",k:"i"}, {t:"Synchisis scintillans",k:"i"}, {t:"Vitreous haemorrhage",k:"ab"}, {t:"Dense haemorrhage",k:"ab"}],
  "volume (cc) \u2014 length x width x height x 0.523": [{t:"Normal <30 cc",k:"n"}, {t:"BPH \u2014 30\u201380 cc",k:"i"}, {t:"Mildly enlarged",k:"i"}, {t:"Significantly enlarged >80 cc",k:"ab"}, {t:"Massive gland >100 cc",k:"ab"}],
  "volume aspirated (ml)": [{t:"<10 ml",k:"i"}, {t:"10\u201350 ml",k:"i"}, {t:"50\u2013200 ml",k:"i"}, {t:">200 ml",k:"i"}],
  "wall": [{t:"Normal wall thickness <3 mm",k:"n"}, {t:"Mildly thickened",k:"i"}, {t:"Thickened >3 mm",k:"ab"}, {t:"Trabeculated",k:"ab"}, {t:"Focal wall lesion",k:"ab"}],
  "wall motion abnormality": [{t:"Not seen \u2014 normal wall motion",k:"n"}, {t:"Hypokinesia \u2014 regional",k:"i"}, {t:"Akinesia",k:"ab"}, {t:"Dyskinesia \u2014 LV aneurysm?",k:"ab"}, {t:"Global hypokinesia",k:"ab"}],
  "wall thickness": [{t:"Normal (<3 mm)",k:"n"}, {t:"Borderline 3\u20135 mm",k:"i"}, {t:"Thickened >5 mm",k:"ab"}, {t:"Markedly thickened with oedema",k:"ab"}],
  "waveform character": [{t:"Triphasic \u2014 normal peripheral arterial",k:"n"}, {t:"Biphasic \u2014 early peripheral disease",k:"i"}, {t:"Monophasic \u2014 significant disease",k:"ab"}, {t:"Absent flow",k:"ab"}],
  "waveform pattern (triphasic/biphasic/flat)": [{t:"Triphasic \u2014 normal",k:"n"}, {t:"Biphasic",k:"i"}, {t:"Monophasic/flat",k:"ab"}, {t:"Reversed component",k:"ab"}],
  "yolk sac (present/absent/size)": [{t:"Present \u2014 normal 3\u20135 mm",k:"n"}, {t:"Present \u2014 large yolk sac",k:"i"}, {t:"Not seen \u2014 empty sac",k:"ab"}, {t:"Irregular/collapsed yolk sac",k:"ab"}],
  "zone \u2014 peripheral": [{t:"Normal echogenicity",k:"n"}, {t:"Heterogeneous",k:"i"}, {t:"Hypoechoic area \u2014 biopsy consideration",k:"ab"}, {t:"Nodule \u2014 malignancy suspected",k:"ab"}],
  "zone \u2014 transitional": [{t:"Normal echogenicity \u2014 no BPH",k:"n"}, {t:"Heterogeneous \u2014 BPH features",k:"i"}, {t:"Asymmetric enlargement",k:"ab"}, {t:"Calcifications",k:"ab"}, {t:"Cystic change",k:"ab"}],
};

/* ══════════════════════════════════
   TEMPLATES DATA
══════════════════════════════════ */
const T = {
  Ultrasound:{icon:"🔊",color:"#0077B6",accent:"#00B4D8",
    regions:[
      "Abdomen","Pelvis","Obstetric","Thyroid/Neck","Scrotum","Breast",
      "Musculoskeletal","Vascular","Renal","Hepatobiliary",
      "Neonatal Head","Neonatal Hip","Male Pelvis",
      "DVT Study","Carotid Duplex","Peripheral Arterial",
      "Portal Hypertension","Renal Transplant","Liver Transplant",
      "First Trimester","Fetal Anomaly","Fetal Wellbeing",
      "Guided Procedures","Superficial Soft Tissue","Lymph Node Survey",
      "Pleural / Chest","Point-of-Care Cardiac","Orbital",
      "Salivary Glands","Appendix / Bowel"
    ,"OB — Ventriculomegaly","OB — Neural Tube Defect / Spina Bifida","OB — Anencephaly / Exencephaly","OB — Dandy-Walker Malformation","OB — Holoprosencephaly","OB — Corpus Callosum Agenesis","OB — Choroid Plexus Cysts","OB — Fetal Ventriculomegaly & Hydrocephalus","OB — Posterior Fossa Anomaly","OB — Intracranial Tumour / Cyst","OB — Fetal Echocardiography (Detailed)","OB — Ventricular Septal Defect (VSD)","OB — Tetralogy of Fallot","OB — Hypoplastic Left Heart Syndrome (HLHS)","OB — Atrioventricular Septal Defect (AVSD)","OB — Fetal Cardiac Arrhythmia","OB — Coarctation of Aorta (CoA)","OB — Ebstein's Anomaly / Tricuspid Dysplasia","OB — Transposition of Great Arteries (TGA)","OB — Fetal Cardiac Tumour / Rhabdomyoma","OB — Gastroschisis","OB — Exomphalos / Omphalocele","OB — Congenital Diaphragmatic Hernia (CDH)","OB — Duodenal Atresia / Double Bubble","OB — Fetal Renal Anomalies","OB — Fetal Hydrops","OB — Sacrococcygeal Teratoma (SCT)","OB — Meconium Peritonitis / Echogenic Bowel","OB — Skeletal Dysplasia","OB — Talipes / Clubfoot","OB — Radial Ray Defect / Limb Reduction","OB — Cleft Lip and Palate","OB — Micrognathia / Pierre Robin","OB — Fetal Neck Mass / Cystic Hygroma","OB — Fetal Ocular Anomalies","OB — Arthrogryposis Multiplex Congenita","OB — Trisomy 21 (Down Syndrome) Markers","OB — Trisomy 18 (Edwards Syndrome) Markers","OB — Trisomy 13 (Patau Syndrome) Markers","OB — Turner Syndrome (45X) Features","OB — VACTERL / Complex Multi-System Anomaly","OB — Placenta Praevia","OB — Placenta Accreta Spectrum (PAS)","OB — Placental Abruption","OB — Vasa Praevia","OB — Umbilical Cord Abnormalities","OB — Single Umbilical Artery (SUA)","OB — Fetal Growth Restriction (FGR) / IUGR","OB — Placental Insufficiency & Doppler Assessment","OB — Twin Pregnancy (DCDA)","OB — Twin Pregnancy (MCDA)","OB — Twin-to-Twin Transfusion Syndrome (TTTS)","OB — Twin Reversed Arterial Perfusion (TRAP)","OB — Monoamniotic Twin Pregnancy (MCMA)","OB — Higher Order Multiple Pregnancy (Triplets+)","OB — Preterm Labour / Short Cervix","OB — Pre-eclampsia Surveillance","OB — Gestational Diabetes — Macrosomia","OB — PPROM Assessment","OB — Incompetent Cervix / Cerclage","OB — Post-dates / Prolonged Pregnancy Assessment","OB — Uterine Fibroid in Pregnancy","OB — Ovarian Cyst in Pregnancy","OB — Maternal Uterine Anomaly in Pregnancy","OB — Nuchal Translucency Scan (11–13+6 wks)","OB — Fetal MCA Doppler / Fetal Anaemia","OB — First Trimester Screening (11–14 wks)","OB — Fetal Wellbeing (Detailed Doppler)","OB — Ectopic Pregnancy","OB — Second Trimester Anomaly Scan (18–22 wks)"],
    sections:{
      Abdomen:[
        {label:"Liver",fields:["Size","Echogenicity","Margins","Focal lesions","Portal vein","Hepatic veins"]},
        {label:"Gallbladder",fields:["Size","Wall thickness","Calculi","Sludge","Pericholecystic fluid"]},
        {label:"Common Bile Duct",fields:["Diameter (mm)","Calculi"]},
        {label:"Pancreas",fields:["Echotexture","Duct size","Focal lesions"]},
        {label:"Spleen",fields:["Size (cm)","Echotexture","Focal lesions"]},
        {label:"Kidneys",fields:["Right kidney size","Left kidney size","Cortical echogenicity","Corticomedullary differentiation","Calculi","Hydronephrosis","Cysts"]},
        {label:"Aorta & IVC",fields:["Aortic diameter","Calcification","IVC"]},
        {label:"Free Fluid",fields:["Morrison's pouch","Perisplenic","Pelvis"]},
      ],
      Pelvis:[
        {label:"Uterus",fields:["Size","Position","Myometrium","Endometrial thickness (mm)","Fibroids"]},
        {label:"Ovaries",fields:["Right ovary size","Left ovary size","Follicles","Cysts","Masses"]},
        {label:"Pouch of Douglas",fields:["Free fluid","Masses"]},
        {label:"Bladder",fields:["Wall","Contents","Post-void residual"]},
      ],
      Obstetric:[
        {label:"Fetal Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","GA by USS"]},
        {label:"Fetal Anatomy",fields:["Lie","Presentation","Placenta location","AFI/MVP","Fetal heart rate","Cervical length"]},
      ],
      "Thyroid/Neck":[
        {label:"Thyroid",fields:["Right lobe size","Left lobe size","Isthmus thickness","Echotexture","Nodules"]},
        {label:"Lymph Nodes",fields:["Location","Size","Morphology"]},
        {label:"Parathyroid",fields:["Visible glands"]},
      ],
      Scrotum:[
        {label:"Testes",fields:["Right testis size","Left testis size","Echogenicity","Focal lesions"]},
        {label:"Epididymis",fields:["Right","Left","Epididymal cysts"]},
        {label:"Vascularity",fields:["Doppler flow right","Doppler flow left"]},
        {label:"Other",fields:["Hydrocele","Varicocele","Hernia"]},
      ],
      Breast:[
        {label:"Breast Parenchyma",fields:["Composition","Background echotexture"]},
        {label:"Lesions",fields:["Location","Size","Shape","Margins","Orientation","Vascularity","BIRADS"]},
        {label:"Axilla",fields:["Lymph nodes"]},
      ],
      Musculoskeletal:[
        {label:"Soft Tissue",fields:["Location","Collection/Effusion","Tendon integrity","Bursae"]},
        {label:"Joint",fields:["Effusion","Synovial thickening","Cartilage"]},
      ],
      Vascular:[
        {label:"Carotid",fields:["Right CCA","Right ICA/ECA","Left CCA","Left ICA/ECA","Intima-media thickness","Plaques"]},
        {label:"Lower Limb Venous",fields:["DVT right","DVT left","Compressibility"]},
        {label:"Arterial",fields:["ABI right","ABI left","Peak systolic velocity"]},
      ],

      /* ═══════ 20 NEW REGIONS ═══════ */

      Renal:[
        {label:"Right Kidney",fields:["Size (cm)","Cortical thickness","Cortical echogenicity","Corticomedullary differentiation","Calculi","Hydronephrosis (grade)","Cysts (Bosniak)","Masses"]},
        {label:"Left Kidney",fields:["Size (cm)","Cortical thickness","Cortical echogenicity","Corticomedullary differentiation","Calculi","Hydronephrosis (grade)","Cysts (Bosniak)","Masses"]},
        {label:"Bladder",fields:["Wall thickness","Intraluminal lesions","Post-void residual (ml)","Ureteric jets"]},
        {label:"Renal Doppler",fields:["Right resistive index","Left resistive index","Renal artery peak systolic velocity","Renal artery stenosis"]},
        {label:"Adrenals",fields:["Right adrenal","Left adrenal"]},
      ],

      Hepatobiliary:[
        {label:"Liver",fields:["Size","Echogenicity","Surface contour","Focal lesions — number","Focal lesions — size & character","Portal vein diameter","Hepatic vein waveform","Periportal fibrosis"]},
        {label:"Gallbladder",fields:["Size","Wall thickness (mm)","Calculi","Sludge","Polyps","Pericholecystic fluid","Murphy sign"]},
        {label:"Biliary Tree",fields:["CBD diameter (mm)","Intrahepatic biliary dilatation","Calculi","Stricture"]},
        {label:"Pancreas",fields:["Head size","Body size","Tail visualisation","Echotexture","Main duct (mm)","Focal lesions"]},
        {label:"Spleen",fields:["Size (cm)","Echotexture","Focal lesions","Accessory spleen"]},
        {label:"Doppler",fields:["Portal vein flow direction","Portal vein velocity (cm/s)","Hepatic artery RI","Ascites"]},
      ],

      "Neonatal Head":[
        {label:"Technique",fields:["Fontanelle used","Gestational age","Postnatal age"]},
        {label:"Ventricles",fields:["Lateral ventricle width right (mm)","Lateral ventricle width left (mm)","Third ventricle (mm)","Fourth ventricle"]},
        {label:"Periventricular Region",fields:["Germinal matrix haemorrhage (grade)","Periventricular leukomalacia","Echogenicity"]},
        {label:"Brain Parenchyma",fields:["Cortical echogenicity","Sulcal development","Corpus callosum"]},
        {label:"Posterior Fossa",fields:["Cerebellum","Cisterna magna","Dandy-Walker continuum"]},
        {label:"Extra-axial Spaces",fields:["Subdural collection","Subarachnoid space width"]},
        {label:"Doppler",fields:["ACA resistive index","MCA RI","Basilar artery RI"]},
      ],

      "Neonatal Hip":[
        {label:"Technique",fields:["Age at scan","Graf technique used","Infant position"]},
        {label:"Right Hip",fields:["Alpha angle (degrees)","Beta angle (degrees)","Graf type","Femoral head coverage (%)","Femoral head position","Bony roof morphology","Cartilaginous roof"]},
        {label:"Left Hip",fields:["Alpha angle (degrees)","Beta angle (degrees)","Graf type","Femoral head coverage (%)","Femoral head position","Bony roof morphology","Cartilaginous roof"]},
        {label:"Conclusion",fields:["Right hip classification","Left hip classification","Management recommendation"]},
      ],

      "Male Pelvis":[
        {label:"Prostate",fields:["Volume (cc) — length x width x height x 0.523","Zone — transitional","Zone — peripheral","Echogenicity","Calcifications","Asymmetry"]},
        {label:"Seminal Vesicles",fields:["Right seminal vesicle","Left seminal vesicle"]},
        {label:"Bladder",fields:["Wall thickness","Trabeculation","Diverticula","Calculi","Post-void residual (ml)"]},
        {label:"Ejaculatory Ducts",fields:["Dilatation","Calculi"]},
      ],

      "DVT Study":[
        {label:"Technique",fields:["Indication","Compression technique","Colour Doppler used"]},
        {label:"Right Lower Limb",fields:["Common femoral vein","Femoral vein","Popliteal vein","Posterior tibial veins","Peroneal veins","Compressibility","Augmentation"]},
        {label:"Left Lower Limb",fields:["Common femoral vein","Femoral vein","Popliteal vein","Posterior tibial veins","Peroneal veins","Compressibility","Augmentation"]},
        {label:"Upper Limb (if performed)",fields:["Subclavian vein","Axillary vein","Brachial vein","Compressibility"]},
        {label:"Conclusion",fields:["DVT present","Location","Extent (acute vs chronic)","Collaterals"]},
      ],

      "Carotid Duplex":[
        {label:"Technique",fields:["Probe frequency","Angle of insonation"]},
        {label:"Right Side",fields:["CCA IMT (mm)","CCA peak systolic velocity (cm/s)","CCA end diastolic velocity","ICA PSV (cm/s)","ICA EDV","ICA/CCA ratio","ECA PSV","Plaques — location","Plaques — morphology","Stenosis grade (NASCET %)"]},
        {label:"Left Side",fields:["CCA IMT (mm)","CCA peak systolic velocity (cm/s)","CCA end diastolic velocity","ICA PSV (cm/s)","ICA EDV","ICA/CCA ratio","ECA PSV","Plaques — location","Plaques — morphology","Stenosis grade (NASCET %)"]},
        {label:"Vertebral Arteries",fields:["Right VA flow direction","Right VA PSV","Left VA flow direction","Left VA PSV"]},
      ],

      "Peripheral Arterial":[
        {label:"Technique",fields:["ABI performed","Waveform analysis"]},
        {label:"Right Lower Limb",fields:["Common femoral artery","Superficial femoral artery","Popliteal artery","Anterior tibial artery","Posterior tibial artery","Peroneal artery","ABI right","Waveform character"]},
        {label:"Left Lower Limb",fields:["Common femoral artery","Superficial femoral artery","Popliteal artery","Anterior tibial artery","Posterior tibial artery","Peroneal artery","ABI left","Waveform character"]},
        {label:"Stenosis / Occlusion",fields:["Location","Peak systolic velocity ratio","Degree of stenosis","Collateral flow"]},
      ],

      "Portal Hypertension":[
        {label:"Liver",fields:["Size","Contour (nodular/smooth)","Echogenicity","Caudate:right lobe ratio","Focal lesions"]},
        {label:"Portal Venous System",fields:["Portal vein diameter (mm)","Portal vein flow direction","Portal vein velocity (cm/s)","Spontaneous portosystemic shunts","Splenic vein diameter","Superior mesenteric vein"]},
        {label:"Spleen",fields:["Size (cm)","Splenomegaly grade","Splenic hilar varices"]},
        {label:"Hepatic Veins",fields:["Waveform pattern (triphasic/biphasic/flat)","Hepatic vein diameter","Caudate vein prominence"]},
        {label:"Other",fields:["Ascites","Oesophageal/gastric varices","Paraumbilical vein recanalization","Gallbladder wall oedema"]},
      ],

      "Renal Transplant":[
        {label:"Transplant Kidney",fields:["Location (iliac fossa)","Size (cm)","Cortical echogenicity","Corticomedullary differentiation","Hydronephrosis","Perinephric collection","Calculi"]},
        {label:"Transplant Doppler",fields:["Renal artery anastomosis patency","Renal artery PSV (cm/s)","Main renal artery RI","Upper pole interlobar RI","Mid interlobar RI","Lower pole interlobar RI","Acceleration time (ms)","Renal vein patency"]},
        {label:"Surrounding Structures",fields:["Lymphocoele","Haematoma","Urinoma","Iliac vessels"]},
      ],

      "Liver Transplant":[
        {label:"Liver Parenchyma",fields:["Size","Echogenicity","Focal lesions","Biliary dilatation"]},
        {label:"Hepatic Artery",fields:["Anastomosis visualised","HA PSV (cm/s)","HA EDV","HA RI","HA acceleration time (ms)","HA waveform"]},
        {label:"Portal Vein",fields:["Anastomosis patency","PV velocity (cm/s)","PV diameter","Flow direction"]},
        {label:"Hepatic Veins",fields:["Right HV","Middle HV","Left HV","IVC anastomosis","Waveform pattern"]},
        {label:"Biliary",fields:["CBD diameter","Bile duct anastomosis","Biloma","Stricture"]},
        {label:"Perioperative",fields:["Perihepatic collection","Ascites","Pleural effusion"]},
      ],

      "First Trimester":[
        {label:"Gestational Sac",fields:["Location (intrauterine/ectopic)","Mean sac diameter (mm)","Yolk sac (present/absent/size)","Regularity"]},
        {label:"Embryo/Fetus",fields:["Crown-rump length (mm)","Gestational age by CRL","Cardiac activity (rate bpm)","Fetal number","Chorionicity (if multiple)"]},
        {label:"Uterus",fields:["Size","Myometrium","Fibroid","Cervical length (mm)","Internal os"]},
        {label:"Adnexa",fields:["Right ovary","Left ovary","Corpus luteum","Adnexal mass","Free fluid in pouch of Douglas"]},
      ],

      "Fetal Anomaly":[
        {label:"Biometry",fields:["GA by LMP","BPD","HC","AC","FL","EFW (g)","Growth centile","GA by USS"]},
        {label:"Head & Brain",fields:["Head shape","Skull integrity","Cerebral ventricles (mm)","Choroid plexus","Posterior fossa","Cerebellum","Cisterna magna","Nuchal fold (if 18-22 wks)"]},
        {label:"Face",fields:["Profile","Upper lip/palate","Orbits","Nasal bone (present/absent)"]},
        {label:"Spine",fields:["Cervical","Thoracic","Lumbar","Sacral","Skin covering"]},
        {label:"Thorax",fields:["Lung echogenicity","Cardiac situs","4-chamber view","LVOT","RVOT","3VV/3VTV","Heart rate"]},
        {label:"Abdomen",fields:["Anterior wall intact","Stomach bubble","Bowel echogenicity","Kidneys","Bladder","Umbilical cord vessels"]},
        {label:"Limbs",fields:["Femur length","Humerus","Hands (digits)","Feet (talipes)","Limb movements"]},
        {label:"Placenta & Liquor",fields:["Placental site","Placental thickness","Cord insertion","AFI / MVP","Vasa praevia"]},
      ],

      "Fetal Wellbeing":[
        {label:"Biophysical Profile",fields:["Fetal breathing movements (30 min)","Fetal body movements","Fetal tone","Amniotic fluid index (AFI) (cm)","BPP score (out of 8)"]},
        {label:"Liquor",fields:["AFI (cm)","MVP (cm)","Qualitative assessment"]},
        {label:"Growth",fields:["BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Growth centile","Interval growth"]},
        {label:"Umbilical Artery Doppler",fields:["UA S/D ratio","UA PI","UA RI","End-diastolic flow (present/absent/reversed)"]},
        {label:"Middle Cerebral Artery Doppler",fields:["MCA PSV (cm/s)","MCA PI","MCA RI","CPR (cerebro-placental ratio)"]},
        {label:"Uterine Artery Doppler",fields:["Right UtA PI","Right UtA notch","Left UtA PI","Left UtA notch"]},
        {label:"Ductus Venosus",fields:["DV waveform","DV PI","A-wave (positive/absent/reversed)"]},
      ],

      "Guided Procedures":[
        {label:"Procedure Details",fields:["Type of procedure","Target lesion/organ","Approach","Needle gauge","Real-time guidance used"]},
        {label:"Target",fields:["Location","Size (cm)","Depth (cm)","Vascularity pre-procedure","Relevant adjacent structures"]},
        {label:"Procedure",fields:["Needle visualised","Passes made","Sample obtained","Adequacy of sample (if aspirate)","Volume aspirated (ml)","Fluid character"]},
        {label:"Post-Procedure",fields:["Immediate complication","Haematoma","Haemorrhage","Pneumothorax (if thoracic)","Post-procedure advice given"]},
      ],

      "Superficial Soft Tissue":[
        {label:"Lesion",fields:["Location","Size (cm — 3 planes)","Depth","Shape","Margins","Internal echogenicity","Posterior acoustic effect","Vascularity on Doppler","Compressibility","Relationship to fascia/muscle"]},
        {label:"Skin & Subcutaneous Tissue",fields:["Skin thickness","Subcutaneous oedema","Inflammatory change","Sinus tract"]},
        {label:"Differential",fields:["Most likely diagnosis","Lipoma features","Sebaceous cyst features","Ganglion features","Abscess features"]},
      ],

      "Lymph Node Survey":[
        {label:"Cervical Nodes",fields:["Levels I-II","Levels III-IV","Level V","Short axis (mm)","Morphology (oval/rounded)","Hilum (present/absent)","Vascularity pattern","Necrosis","Calcification"]},
        {label:"Axillary Nodes",fields:["Right axilla","Left axilla","Short axis (mm)","Hilum","Cortical thickness","Suspicious features"]},
        {label:"Inguinal Nodes",fields:["Right groin","Left groin","Short axis (mm)","Morphology","Vascularity"]},
        {label:"Abdominal / Retroperitoneal",fields:["Mesenteric nodes","Para-aortic nodes","Size (mm)","Confluence"]},
      ],

      "Pleural / Chest":[
        {label:"Technique",fields:["Patient position","Probe frequency","Lung sliding assessed"]},
        {label:"Right Pleural Space",fields:["Effusion present","Effusion volume (estimate)","Effusion character (anechoic/complex/echogenic)","Septations","Loculation","Safe aspiration point marked"]},
        {label:"Left Pleural Space",fields:["Effusion present","Effusion volume (estimate)","Effusion character","Septations","Loculation","Safe aspiration point marked"]},
        {label:"Lung",fields:["Lung sliding (R)","Lung sliding (L)","B-lines","Consolidation","Air bronchograms","Hepatisation"]},
        {label:"Diaphragm",fields:["Right diaphragm movement","Left diaphragm movement","Paradoxical movement"]},
      ],

      "Point-of-Care Cardiac":[
        {label:"Technique",fields:["Views obtained","Parasternal long","Parasternal short","Apical 4-chamber","Subcostal","Image quality"]},
        {label:"Left Ventricle",fields:["Global LV function (visual estimate)","LVEF (eyeball)","Wall motion abnormality","LV dilation","LV hypertrophy","IVS thickness","Posterior wall thickness"]},
        {label:"Right Ventricle",fields:["RV size relative to LV","RV function","D-sign/septal flattening","TAPSE (mm)"]},
        {label:"Valves",fields:["Significant mitral regurgitation","Significant aortic stenosis/regurgitation","Valve vegetation"]},
        {label:"Pericardium",fields:["Pericardial effusion","Effusion size (small/moderate/large)","Tamponade features (RA/RV collapse)"]},
        {label:"IVC",fields:["IVC diameter (mm)","IVC collapsibility (%)","Estimated RAP (mmHg)"]},
      ],

      Orbital:[
        {label:"Technique",fields:["Linear probe","Closed eyelid technique","Both eyes examined"]},
        {label:"Right Eye",fields:["Globe integrity","Vitreous echogenicity","Posterior vitreous detachment","Retinal detachment","Choroidal detachment","Optic nerve sheath diameter (mm)","Lens position","Intraocular foreign body"]},
        {label:"Left Eye",fields:["Globe integrity","Vitreous echogenicity","Posterior vitreous detachment","Retinal detachment","Choroidal detachment","Optic nerve sheath diameter (mm)","Lens position","Intraocular foreign body"]},
        {label:"Orbital Soft Tissue",fields:["Proptosis","Orbital mass","Extraocular muscle thickness","Lacrimal gland"]},
      ],

      "Salivary Glands":[
        {label:"Parotid Glands",fields:["Right parotid size","Right parotid echogenicity","Right parotid focal lesion","Right parotid duct","Left parotid size","Left parotid echogenicity","Left parotid focal lesion","Left parotid duct"]},
        {label:"Submandibular Glands",fields:["Right submandibular size","Right submandibular echogenicity","Right Wharton duct","Calculi","Left submandibular size","Left submandibular echogenicity","Left Wharton duct"]},
        {label:"Sublingual Glands",fields:["Right sublingual","Left sublingual","Ranula"]},
        {label:"Lymph Nodes",fields:["Periparotid nodes","Perifacial nodes"]},
      ],

      "Appendix / Bowel":[
        {label:"Appendix",fields:["Visualised (yes/no)","Outer diameter (mm)","Compressibility","Periappendiceal fat echogenicity","Appendicolith","Perforation features","Free fluid"]},
        {label:"Bowel",fields:["Small bowel wall thickness (mm)","Large bowel wall thickness","Peristalsis","Target sign (intussusception)","Bowel obstruction features","Free intraperitoneal fluid","Pneumoperitoneum (if any)"]},
        {label:"Mesentery & Nodes",fields:["Mesenteric fat echogenicity","Enlarged mesenteric nodes","Creeping fat sign"]},
      ],

      "OB — Ventriculomegaly":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Growth centile"]},
        {label:"Ventricular Measurement",fields:["Atrial width right (mm)","Atrial width left (mm)","Choroid plexus — filling","Dangling choroid sign","Measurement method (axial posterior horn)"]},
        {label:"Classification",fields:["Mild (10–12 mm)","Moderate (13–15 mm)","Severe (>15 mm)","Unilateral vs bilateral","Progressive vs stable"]},
        {label:"Associated CNS Findings",fields:["Corpus callosum — present/absent","Posterior fossa — normal/abnormal","Cortical mantle thickness","Periventricular heterotopia","Lissencephaly features"]},
        {label:"Cause Assessment",fields:["Obstructive — aqueduct stenosis","Communicating","Neural tube defect association","Infection — CMV/toxoplasma","Haemorrhage"]},
        {label:"Other Systems",fields:["Cardiac anomaly","Renal anomaly","Chromosomal markers","Soft markers"]},
        {label:"Liquor & Placenta",fields:["AFI (cm)","Placenta location","Cervical length (mm)"]},
        {label:"Management",fields:["Tertiary referral recommended","Fetal MRI recommended","Amniocentesis offered","Chromosomal analysis","Serial surveillance interval"]}
      ],
      "OB — Neural Tube Defect / Spina Bifida":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Growth centile"]},
        {label:"Spina Bifida",fields:["Level — cervical/thoracic/lumbar/sacral","Extent (number of vertebral levels)","Open vs closed lesion","Skin covering — intact/absent","Myelomeningocele sac size"]},
        {label:"Cranial Signs",fields:["Lemon sign — head shape","Banana sign — cerebellum","Chiari II malformation","Cisterna magna — obliterated","Ventriculomegaly — degree"]},
        {label:"Cerebellum & Posterior Fossa",fields:["Cerebellar herniation","Cerebellar size","Brainstem displacement","4th ventricle"]},
        {label:"Hydrocephalus",fields:["Degree of ventriculomegaly","Atrial width (mm)","Progressive or stable"]},
        {label:"Lower Limb Assessment",fields:["Foot position — talipes","Limb movement — present/absent","Level of motor defect estimate"]},
        {label:"Associated Anomalies",fields:["Cardiac","Renal","Other"]},
        {label:"Liquor",fields:["AFI (cm)","Polyhydramnios/oligohydramnios"]},
        {label:"Management",fields:["Fetal surgery candidacy assessment","MRF-guided MRI referral","Tertiary centre referral","Karyotyping offered"]}
      ],
      "OB — Anencephaly / Exencephaly":[
        {label:"Biometry",fields:["GA by LMP","AC (mm)","FL (mm)","BPD — not measurable / absent","HC — not measurable"]},
        {label:"Cranial Vault",fields:["Absent calvaria above orbits","Brain tissue — absent/disorganised","Exencephaly — brain tissue present outside skull","Anencephaly — confirmed"]},
        {label:"Facial Structures",fields:["Orbits — present","Nose","Upper lip","Ears — visualised"]},
        {label:"Spine",fields:["Cervical spine","Thoracic spine","Lumbar spine","Associated spinal defect"]},
        {label:"Other Systems",fields:["Cardiac — 4-chamber view","Limbs","Abdominal wall"]},
        {label:"Liquor",fields:["Polyhydramnios — degree","AFI (cm)"]},
        {label:"Uterus & Placenta",fields:["Placenta location","Uterine abnormality"]},
        {label:"Counselling",fields:["Lethal condition — confirmed","Termination of pregnancy discussion","Comfort care plan","Chromosomal analysis offered"]}
      ],
      "OB — Dandy-Walker Malformation":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Posterior Fossa",fields:["Posterior fossa cyst — size (mm)","Communication with 4th ventricle","Tentorial elevation","Occipital bone elevation"]},
        {label:"Vermian Assessment",fields:["Cerebellar vermis — absent/hypoplastic/normal","Degree of vermian rotation (degrees)","Vermian remnant — present/absent"]},
        {label:"Cerebellar Hemispheres",fields:["Size — normal/hypoplastic","Symmetry","Splaying of hemispheres"]},
        {label:"Ventricular System",fields:["Ventriculomegaly — present/absent","Atrial width (mm)","Aqueduct patency","3rd ventricle"]},
        {label:"Corpus Callosum",fields:["Present and complete","Partial agenesis","Complete agenesis","Associated with DWM"]},
        {label:"Other CNS",fields:["Cortical development","Migration disorder","Gyral pattern"]},
        {label:"Differential Diagnosis",fields:["Classic DWM — large cyst + absent vermis","DW variant — partial vermis","Mega cisterna magna — vermis normal","Blake pouch cyst"]},
        {label:"Systemic Anomalies",fields:["Cardiac","Renal","Limb","Facial"]},
        {label:"Management",fields:["Fetal MRI","Karyotype","Neurosurgery counselling","Serial scans"]}
      ],
      "OB — Holoprosencephaly":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Holoprosencephaly Type",fields:["Alobar — monoventricle, fused thalami, absent corpus callosum","Semilobar — partial interhemispheric fissure","Lobar — near-complete separation","Middle interhemispheric (MIH) variant"]},
        {label:"Brain Features",fields:["Monoventricle","Thalamic fusion — complete/partial","Interhemispheric fissure — absent/partial","Corpus callosum — absent"]},
        {label:"Dorsal Cyst",fields:["Present/absent","Size (mm)","Communication with monoventricle"]},
        {label:"Facial Anomalies",fields:["Cyclopia — fused orbits","Proboscis — present/absent","Hypotelorism","Median cleft lip","Ethmocephaly"]},
        {label:"Nose",fields:["Single nostril","Absent nose","Proboscis"]},
        {label:"Other Systemic",fields:["Cardiac","Renal","Limbs"]},
        {label:"Chromosomal",fields:["Trisomy 13 — most common association","Karyotype offered","Microarray offered"]},
        {label:"Management",fields:["Lethal in alobar type","Genetic counselling","Fetal MRI","Karyotype"]}
      ],
      "OB — Corpus Callosum Agenesis":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Corpus Callosum",fields:["Complete agenesis (ACC)","Partial agenesis — which portions missing","Hypoplasia","Dysgenesis — abnormal shape"]},
        {label:"Direct Signs",fields:["Absent cavum septum pellucidum (CSP)","Colpocephaly — enlarged posterior horns","Parallel lateral ventricles","High-riding 3rd ventricle"]},
        {label:"Indirect Signs",fields:["Radial sulcal pattern (sunburst pattern)","Probst bundles","Absent CSP","Widely spaced anterior horns"]},
        {label:"Associated CNS",fields:["Interhemispheric cyst","Ventriculomegaly","Cortical dysplasia","Migration disorder","Dandy-Walker association"]},
        {label:"Other Systems",fields:["Cardiac","Renal","Spine","Limbs"]},
        {label:"Syndromic Associations",fields:["Aicardi syndrome markers","Andermann syndrome","Chromosomal markers"]},
        {label:"Management",fields:["Fetal MRI (confirms diagnosis)","Karyotype + microarray","Neurology counselling","Variable prognosis — severity dependent"]}
      ],
      "OB — Choroid Plexus Cysts":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Growth centile"]},
        {label:"CPC Details",fields:["Right side","Left side","Bilateral","Size — largest (mm)","Number","Morphology — round/complex"]},
        {label:"T18 Risk Markers (Checklist)",fields:["CPC — present (main marker for T18)","Choroid plexus cysts — bilateral/unilateral","Clenched hands / overlapping fingers","VSD / cardiac defect","Neural tube defect","Micrognathia","Omphalocele","Renal anomaly","IUGR","Polyhydramnios"]},
        {label:"Other Soft Markers",fields:["Echogenic bowel","Short femur/humerus","Absent nasal bone","Nuchal fold thickness (mm)"]},
        {label:"Risk Assessment",fields:["Isolated CPC — low risk","CPC + additional markers — karyotype recommended","Adjusted T18 risk","Nuchal translucency result (if known)"]},
        {label:"Management",fields:["Isolated CPC — reassurance + 20-week scan","CPC + marker — amniocentesis offered","Serial scan in 4 weeks","Tertiary referral if multiple markers"]}
      ],
      "OB — Fetal Ventriculomegaly & Hydrocephalus":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Ventricular Measurement",fields:["Atrial width right (mm)","Atrial width left (mm)","3rd ventricle (mm)","4th ventricle","Temporal horn dilatation"]},
        {label:"Cortical Mantle",fields:["Cortical mantle thickness (mm)","Preserved / thinned / markedly thinned"]},
        {label:"Cause",fields:["Aqueductal stenosis","Neural tube defect","Brain malformation","Post-haemorrhagic","Infectious — CMV/toxoplasma","Chromosomal"]},
        {label:"Associated Findings",fields:["Choroid plexus hanging free","Dangling choroid sign","Corpus callosum","Posterior fossa"]},
        {label:"Progression",fields:["Stable vs progressive — interval measurements","Change from prior scan"]},
        {label:"Liquor & Cervix",fields:["AFI (cm)","Cervical length (mm)"]},
        {label:"Management",fields:["Fetal MRI","Karyotype","Neurosurgery consultation","TORCH screen","Delivery planning — mode/timing","Serial surveillance"]}
      ],
      "OB — Posterior Fossa Anomaly":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Posterior Fossa Cyst",fields:["Presence — yes/no","Communication with 4th ventricle","Size (mm)","Tentorial insertion"]},
        {label:"Vermis",fields:["Completely visible — normal","Partially visualised","Absent","Rotation angle (degrees)","Vermian height (mm)"]},
        {label:"Cerebellum",fields:["Transverse cerebellar diameter (TCD) (mm)","TCD appropriate for gestation","Hypoplasia","Splitting of hemispheres"]},
        {label:"Cisterna Magna",fields:["Normal 2–10 mm","Enlarged (mega cisterna magna)","Obliterated (Chiari II)","Measurement (mm)"]},
        {label:"4th Ventricle",fields:["Normal","Compressed — Chiari","Enlarged — DW spectrum","Communication with cyst"]},
        {label:"Differential",fields:["Dandy-Walker malformation","DW variant","Mega cisterna magna — normal variant","Blake pouch cyst","Arachnoid cyst","Cerebellar hypoplasia"]},
        {label:"Management",fields:["Fetal MRI","Serial scans","Karyotype","Neurosurgery counselling"]}
      ],
      "OB — Intracranial Tumour / Cyst":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Lesion",fields:["Location (intracranial)","Size (mm — 3 planes)","Morphology — cystic/solid/mixed","Internal echogenicity","Vascularity on Doppler"]},
        {label:"Effect on Brain",fields:["Mass effect","Ventricular compression","Hydrocephalus degree","Midline shift","Intracranial haemorrhage"]},
        {label:"Macrocrania",fields:["Head circumference above 95th centile","Skull shape distortion"]},
        {label:"Arachnoid Cyst",fields:["Location — sylvian/interhemispheric/suprasellar","Smooth-walled","No internal debris","Mass effect on adjacent brain"]},
        {label:"Vein of Galen Malformation",fields:["High-flow vessel in midline","Torcular dilatation","Dilated venous sinuses","Cardiac failure signs"]},
        {label:"Other Systemic",fields:["Cardiac","Hydrops features"]},
        {label:"Management",fields:["Fetal MRI","Neurosurgery referral","Karyotype","Planned delivery at tertiary centre"]}
      ],
      "OB — Fetal Echocardiography (Detailed)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Technique",fields:["GA at scan","Fetal position","Image quality","Views obtained"]},
        {label:"Cardiac Situs",fields:["Cardiac situs — solitus/inversus/ambiguous","Cardiac apex direction","Stomach — left/right","Liver — right/left"]},
        {label:"4-Chamber View",fields:["Heart size — CTR","Left ventricle — size/function","Right ventricle — size/function","Both AV valves patent","Mitral valve","Tricuspid valve","Interventricular septum","Interatrial septum / foramen ovale"]},
        {label:"Left Heart",fields:["LVOT — clear","Aortic root (mm)","Aortic valve","Aortic arch — normal/abnormal","Transverse arch","Ductal arch"]},
        {label:"Right Heart",fields:["RVOT — clear","Pulmonary valve","Main pulmonary artery (mm)","Pulmonary artery branches","Pulmonary:aortic ratio"]},
        {label:"3-Vessel View / 3VTV",fields:["3VV — normal relationship","Great artery sizes — concordant","Superior vena cava","Trachea relationship","V-sign vs U-sign"]},
        {label:"Systemic Veins",fields:["IVC to RA","SVC to RA","Pulmonary veins — all four draining to LA","Azygos continuation"]},
        {label:"Heart Rate & Rhythm",fields:["Heart rate (bpm)","Rhythm — regular/irregular","AV conduction","M-mode assessment"]},
        {label:"Overall Conclusion",fields:["Normal fetal heart","Anomaly identified — type","Refer to fetal cardiology","Karyotype recommended"]}
      ],
      "OB — Ventricular Septal Defect (VSD)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"VSD Details",fields:["Location — perimembranous/muscular/inlet/outlet/doubly committed","Size (mm)","Number — single/multiple","Flow direction on Doppler"]},
        {label:"4-Chamber View",fields:["Overall heart size","LV size","RV size","Mitral valve","Tricuspid valve","IVS — defect seen"]},
        {label:"Outflow Tracts",fields:["LVOT — clear","RVOT — clear","Aorta and PA in normal relationship","Pulmonary to aortic size ratio"]},
        {label:"Aortic Arch",fields:["Normal left-sided arch","Right-sided arch","Coarctation features — isthmus narrowing"]},
        {label:"3-Vessel View",fields:["Normal / abnormal","PA:Ao ratio"]},
        {label:"Associated Anomalies",fields:["Chromosomal markers (T21/T18)","Extracardiac anomalies","Soft markers"]},
        {label:"Chromosomal Risk",fields:["Down syndrome association","Edward syndrome (T18) association","Karyotype offered"]},
        {label:"Management",fields:["Fetal cardiology referral","Karyotype","Serial surveillance","Delivery at centre with paediatric cardiology"]}
      ],
      "OB — Tetralogy of Fallot":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Classic Features",fields:["VSD — large subarterial","RVOT obstruction — infundibular/valvar","Aorta overriding IVS — degree (%)","RV hypertrophy — late finding in fetus"]},
        {label:"4-Chamber View",fields:["LV:RV ratio","Both ventricles visible","AV valves","IVS defect"]},
        {label:"Outflow Tracts",fields:["Aorta — large, overriding septum","LVOT — aorta override","RVOT — narrow/stenotic","PA — small (mm)","PA:Ao ratio (<0.7 suspicious)"]},
        {label:"3-Vessel View",fields:["Small PA relative to Ao","Right-sided aortic arch — 25% TOF","Absent thymus — DiGeorge?"]},
        {label:"Pulmonary Atresia Variant",fields:["PA — absent/atretic — ToF with PA","MAPCAs suspected","Ductus dependency"]},
        {label:"Chromosomal Associations",fields:["22q11.2 deletion — DiGeorge","Down syndrome","Karyotype + microarray"]},
        {label:"Management",fields:["Fetal cardiology referral","Karyotype + 22q11 FISH","Serial scans","Delivery plan — paediatric cardiac surgery"]}
      ],
      "OB — Hypoplastic Left Heart Syndrome (HLHS)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"4-Chamber View",fields:["Asymmetric chambers — LV hypoplastic","LV size — severely reduced","LV function — absent/reduced contractility","Mitral valve — atretic/hypoplastic/stenotic","Endocardial fibroelastosis — bright LV endocardium"]},
        {label:"Left Heart Structures",fields:["Aortic root (mm) — small","Aortic valve — atretic/stenotic","Ascending aorta (mm) — hypoplastic","Aortic arch — hypoplastic","Retrograde flow in transverse arch and aorta"]},
        {label:"Right Heart",fields:["RV — dominant/dilated","Tricuspid valve — normal/abnormal","RA — enlarged","Foramen ovale — restrictive?"]},
        {label:"Outflow Tracts",fields:["RVOT — dominant","PA — enlarged","Ductus arteriosus — large, supplying aorta retrograde"]},
        {label:"Pulmonary Veins",fields:["Pulmonary venous drainage","Pulmonary vein Doppler — restrictive foramen ovale pattern"]},
        {label:"Chromosomal",fields:["Turner syndrome association","Karyotype offered"]},
        {label:"Management",fields:["Fetal cardiology referral","Palliative surgery plan — Norwood/Sano","Comfort care discussion","Karyotype","Delivery at cardiac surgical centre"]}
      ],
      "OB — Atrioventricular Septal Defect (AVSD)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"4-Chamber View",fields:["Common AV junction — single AV valve","Primum ASD — inlet defect","Inlet VSD — present/absent","Balanced vs unbalanced AVSD","Cross-crux — absent in complete AVSD"]},
        {label:"AV Valve",fields:["Common AV valve — competent/regurgitant","Valve leaflet morphology","Bridging leaflets — A/C","Regurgitation — colour Doppler"]},
        {label:"Ventricular Balance",fields:["LV:RV ratio","Balanced — both ventricles adequate","Unbalanced — dominant RV or LV","Implication for biventricular repair"]},
        {label:"Outflow Tracts",fields:["LVOT — 'goose-neck' deformity","PA and Ao sizes","Outflow relationship"]},
        {label:"Chromosomal Association",fields:["Down syndrome (T21) — ~40% AVSD","Karyotype recommended","Heterotaxy association"]},
        {label:"Cardiac Situs",fields:["Situs solitus","Heterotaxy — right/left isomerism","Abnormal systemic/pulmonary venous connections"]},
        {label:"Management",fields:["Fetal cardiology referral","Karyotype","Down syndrome counselling","Delivery at paediatric cardiac centre"]}
      ],
      "OB — Fetal Cardiac Arrhythmia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Heart Rate Assessment",fields:["Baseline heart rate (bpm)","Rate variability","Rate at time of measurement"]},
        {label:"Rhythm Analysis",fields:["Regular vs irregular","M-mode — AV relationship","Mechanical PR interval (ms)","Pulsed wave Doppler — AV timing"]},
        {label:"Tachyarrhythmia",fields:["SVT — atrial rate (bpm)","Flutter — atrial rate / ventricular rate","Type — 2:1/variable block","Ventricular tachycardia — wide complex"]},
        {label:"Bradyarrhythmia",fields:["Complete heart block — AV dissociation","2nd degree block","Sinus bradycardia","Ectopics — atrial/ventricular"]},
        {label:"Cardiac Structure",fields:["Structural heart disease — present/absent","Hydrops features — skin oedema/ascites/pleural","Cardiomegaly"]},
        {label:"Maternal Anti-Ro/La Antibodies",fields:["Known SSA/SSB antibodies — relevant","Anti-Ro positive — 3rd degree block risk","Mechanical PR interval monitoring"]},
        {label:"Hydrops Assessment",fields:["Skin oedema","Ascites","Pleural effusion","Pericardial effusion","Placenta thickening"]},
        {label:"Management",fields:["Paediatric cardiology referral","Maternal anti-Ro screen","Transplacental treatment — digoxin/flecainide","Delivery timing","Paediatric cardiologist at delivery"]}
      ],
      "OB — Coarctation of Aorta (CoA)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"4-Chamber View",fields:["Ventricular disproportion — RV > LV","RV:LV ratio","Mitral valve area vs tricuspid area"]},
        {label:"Aortic Arch",fields:["Transverse arch (mm)","Isthmus diameter (mm)","Ductal arch (mm)","Isthmus:ductus ratio","Shelf/narrowing at isthmus"]},
        {label:"Outflow Tracts",fields:["Ascending Ao (mm)","Main PA (mm)","PA:Ao ratio (>1.6 suspicious)","LVOT — clear","Bicuspid aortic valve features"]},
        {label:"Ventricular Function",fields:["LV function","RV dominance","Foramen ovale — size"]},
        {label:"3-Vessel View",fields:["Small transverse arch relative to PA","Dominant duct"]},
        {label:"Differential Diagnosis",fields:["True CoA vs normal variation","Tubular hypoplasia","Interrupted aortic arch"]},
        {label:"Chromosomal",fields:["Turner syndrome (45X) — most common association","Karyotype offered"]},
        {label:"Management",fields:["Fetal cardiology referral","Serial measurements q4 weeks","Karyotype","Neonatal prostaglandin plan","Planned delivery at cardiac centre"]}
      ],
      "OB — Ebstein's Anomaly / Tricuspid Dysplasia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"4-Chamber View",fields:["Marked cardiomegaly — CTR","RV — massively dilated atrialized portion","RA — massively dilated","TV apical displacement (mm) from mitral valve","Atrialized RV portion"]},
        {label:"Tricuspid Valve",fields:["Tricuspid displacement (mm) — >8 mm/m² surface area","Septal leaflet displacement","Anterior leaflet size","Regurgitation — colour Doppler severity","Tricuspid valve area"]},
        {label:"Left Heart",fields:["LV — compressed","Mitral valve — normal","LVOT — clear"]},
        {label:"Pulmonary Valve",fields:["Functional pulmonary atresia — present/absent","PA — normal or absent forward flow","Ductus — may provide retrograde PA flow"]},
        {label:"Hydrops",fields:["Skin oedema","Ascites","Pleural effusion","Pericardial effusion"]},
        {label:"Prognosis Factors",fields:["CTR — severe if >0.65","Pulmonary atresia — worse prognosis","GOSE score (1–4)","Hydrops — poor prognosis"]},
        {label:"Management",fields:["Fetal cardiology referral","Serial hydrops surveillance","Delivery timing — avoid preterm if possible","Surgical options counselling"]}
      ],
      "OB — Transposition of Great Arteries (TGA)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"4-Chamber View",fields:["Normal 4-chamber view in simple TGA","LV and RV — normal sizes","Both AV valves normal"]},
        {label:"Outflow Tracts",fields:["LVOT — posterior vessel (PA) arises from LV","RVOT — anterior vessel (Ao) arises from RV","Parallel great arteries — side by side","Normal crossing of great arteries — ABSENT"]},
        {label:"3-Vessel View",fields:["Anterior Ao + posterior PA — abnormal parallel","Ao and PA same size","No X-crossing of great arteries","Right-sided aortic arch"]},
        {label:"Coronary Arteries",fields:["Coronary artery pattern — if visualised"]},
        {label:"Intact vs With VSD",fields:["IVS intact — simple TGA","VSD — type/size","LVOTO — present/absent","PS — present/absent"]},
        {label:"Associated Anomalies",fields:["Extracardiac anomalies","Chromosomal markers"]},
        {label:"Management",fields:["Fetal cardiology referral","Arterial switch operation — planned","Neonatal prostaglandin","Delivery at cardiac surgical centre","Karyotype"]}
      ],
      "OB — Fetal Cardiac Tumour / Rhabdomyoma":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Tumour",fields:["Location — RV/LV/interventricular septum/atria","Number — solitary/multiple","Size — largest (mm)","Echogenicity — hyperechoic","Shape — round/lobulated"]},
        {label:"Haemodynamic Effect",fields:["Outflow obstruction — LVOT/RVOT","AV valve obstruction","Ventricular function","Cardiac output"]},
        {label:"Arrhythmia",fields:["Heart rate and rhythm","Arrhythmia associated — WPW pattern","Ectopics"]},
        {label:"Hydrops",fields:["Skin oedema","Ascites","Pleural effusion","Pericardial effusion"]},
        {label:"Tuberous Sclerosis Screen",fields:["Tuberous sclerosis association — 60–80%","Intracranial tubers — echogenic foci","Renal angiomyolipomas","Parental screen recommended"]},
        {label:"Differential",fields:["Rhabdomyoma — multiple, TS association","Fibroma — solitary, calcified","Teratoma — heterogeneous, pericardial","Haemangioma"]},
        {label:"Management",fields:["Fetal cardiology referral","Neurology review — TS","MRI brain for tubers","Serial echos","Antiarrhythmic therapy if needed"]}
      ],
      "OB — Gastroschisis":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm) — reduced","FL (mm)","EFW (g)","Growth centile"]},
        {label:"Defect",fields:["Defect location — right of umbilical cord insertion (typical)","Defect size (mm)","Cord insertion — intact"]},
        {label:"Herniated Contents",fields:["Free-floating bowel loops in amniotic fluid","Stomach herniated — yes/no","Bowel dilation — present/absent","Bowel wall thickening — degree"]},
        {label:"Bowel Condition",fields:["Normal calibre","Dilated loops (>7 mm) — concern for atresia/volvulus","Wall thickening","Matting of loops — complex gastroschisis"]},
        {label:"Liver",fields:["Liver — intra-abdominal (typical)","Liver herniation — uncommon in gastroschisis"]},
        {label:"Liquor",fields:["AFI (cm) — often normal or reduced","Polyhydramnios"]},
        {label:"Complications",fields:["IUGR","Bowel atresia features","Volvulus","Cord compression"]},
        {label:"Surveillance",fields:["Serial growth scans","Bowel dilation monitoring interval","MCA Doppler","UA Doppler"]},
        {label:"Management",fields:["Tertiary obstetric centre delivery","Surgical team at birth","Vaginal delivery acceptable","Preterm delivery plan"]}
      ],
      "OB — Exomphalos / Omphalocele":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Defect",fields:["Defect size (mm)","Contents of sac","Membrane covering — intact peritoneum/amnion (differentiates from gastroschisis)","Cord insertion — at apex of sac"]},
        {label:"Contents",fields:["Liver herniated — yes/no (liver-containing: worse prognosis, higher aneuploidy)","Bowel only","Stomach","Spleen"]},
        {label:"Sac",fields:["Intact sac membrane","Ruptured sac — emergency","Calcification"]},
        {label:"Associated Anomalies",fields:["Cardiac defect — present/absent","Beckwith-Wiedemann features — macroglossia/macrosomia","Pentalogy of Cantrell features — cardiac/diaphragm","Other structural"]},
        {label:"Chromosomal Risk",fields:["T18 — high risk with bowel-only omphalocele","T13","Karyotype essential"]},
        {label:"Liquor",fields:["AFI (cm)","Polyhydramnios"]},
        {label:"Management",fields:["Karyotype + microarray","Fetal echocardiography","Tertiary centre delivery","Surgical repair planning","Liver-containing — worse prognosis"]}
      ],
      "OB — Congenital Diaphragmatic Hernia (CDH)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Hernia",fields:["Side — left (80%)/right (20%)/bilateral","Herniated contents","Stomach position — intrathoracic (left CDH)","Bowel — intrathoracic","Liver — herniated (up or down)"]},
        {label:"Cardiac Displacement",fields:["Heart deviated to right (left CDH)","Cardiac axis","Pericardial effusion"]},
        {label:"Lung Assessment",fields:["Lung-to-head ratio (LHR) — observed/expected ratio","O/E LHR (%) — <25%: severe, 25–35%: moderate, >45%: mild","Total fetal lung volume (if MRI)","Right lung visible","Left lung visible"]},
        {label:"Liver Position",fields:["Liver up — into chest (worse prognosis)","Liver down — abdominal","Liver up + LHR <1.0 — poor prognosis"]},
        {label:"Pulmonary Hypertension Predictors",fields:["O/E LHR","Liver herniation","Side"]},
        {label:"Stomach",fields:["Stomach in chest — left CDH","Absent stomach bubble in abdomen","Stomach in abdomen — liver-down CDH"]},
        {label:"Associated Anomalies",fields:["Cardiac","CNS","Chromosomal markers"]},
        {label:"Management",fields:["Fetal MRI for lung volumetry","Fetal tracheal occlusion (FETO) criteria assessment","Delivery at CDH centre","Neonatal ECMO centre referral"]}
      ],
      "OB — Duodenal Atresia / Double Bubble":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Double Bubble Sign",fields:["Present — diagnostic","Fluid-filled stomach — distended","Fluid-filled duodenum — dilated proximal","Communication confirmed on real-time scan"]},
        {label:"Diagnosis Confirmation",fields:["Communication between stomach and duodenal bubble","Persistence on rescan","Differential — proximal intestinal atresia"]},
        {label:"Liquor",fields:["Polyhydramnios — present/absent/degree","AFI (cm) — often elevated"]},
        {label:"Associated Anomalies",fields:["Down syndrome (T21) — 30% association","Cardiac defect — atrioventricular septal defect","Annular pancreas","Malrotation","Other GI atresias"]},
        {label:"Chromosomal Risk",fields:["T21 — high association","Karyotype recommended"]},
        {label:"Other Systemic",fields:["Head and brain","Spine","Limbs","Renal"]},
        {label:"Management",fields:["Karyotype — Down syndrome","Fetal echocardiography","Tertiary obstetric centre","Neonatal surgical repair — duodenoduodenostomy","Polyhydramnios management"]}
      ],
      "OB — Fetal Renal Anomalies":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Right Kidney",fields:["Present/absent","Position — normal/ectopic","Size (mm)","Echogenicity — normal/increased","Pelvic dilatation (mm) — AP diameter","Cysts"]},
        {label:"Left Kidney",fields:["Present/absent","Position","Size (mm)","Echogenicity","Pelvic dilatation (mm)","Cysts"]},
        {label:"Diagnosis",fields:["Bilateral renal agenesis — Potter sequence","Unilateral renal agenesis — compensatory hypertrophy","Multicystic dysplastic kidney (MCDK) — non-communicating cysts","Hydronephrosis — grade","Posterior urethral valves (PUV) — males"]},
        {label:"Bladder",fields:["Visible — yes/no","Size — normal/enlarged","Keyhole sign — PUV","Thick-walled bladder","Absent bladder — bilateral agenesis"]},
        {label:"Liquor",fields:["AFI (cm) — critically important","Oligohydramnios — renal impairment","Anhydramnios — bilateral agenesis/PUV"]},
        {label:"Posterior Urethral Valves (if suspected)",fields:["Male fetus","Dilated posterior urethra — keyhole","Bilateral hydronephrosis","Bladder wall thickening","Oligohydramnios"]},
        {label:"Chromosomal",fields:["Chromosomal markers","Karyotype offered"]},
        {label:"Prognosis Factors",fields:["Liquor volume — crucial","Bilateral vs unilateral","Lung hypoplasia risk","Renal function — difficult antenatally"]},
        {label:"Management",fields:["Fetal MRI","Paediatric nephrology / urology referral","Serial scans q2-4 weeks","Delivery at tertiary centre","Vesicocentesis / shunting criteria for PUV"]}
      ],
      "OB — Fetal Hydrops":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Placenta thickness (mm)"]},
        {label:"Hydrops Criteria (≥2 required)",fields:["Skin oedema >5 mm — site","Ascites — present/absent/degree","Pleural effusion — right/left/bilateral","Pericardial effusion (mm)","Placenta oedema >4 cm thick"]},
        {label:"Ascites",fields:["Degree — trace/mild/moderate/severe","Distribution"]},
        {label:"Pleural Effusion",fields:["Right — size","Left — size","Bilateral","Lung compression"]},
        {label:"Skin Oedema",fields:["Scalp oedema (mm)","Abdominal wall oedema","Limb oedema"]},
        {label:"Aetiology — Immune",fields:["Rh isoimmunisation — anti-D","Other alloantibodies — anti-Kell/anti-c","MCA PSV — elevated (>1.5 MoM)","Maternal antibody screen result"]},
        {label:"Aetiology — Non-Immune (NIHF)",fields:["Cardiac cause — structural/arrhythmia","Chromosomal — T21/T18/Turner","Anaemia — haemoglobinopathy/B19 parvovirus","Twin-twin transfusion","Lymphatic — cystic hygroma","Infection — CMV/toxoplasma/syphilis","Metabolic — storage disorder","Thoracic — CDH/CHAOS/pleural effusion","Tumour — sacrococcygeal teratoma"]},
        {label:"MCA Doppler",fields:["MCA PSV (cm/s)","MoM (multiples of median)",">1.5 MoM — fetal anaemia suspected"]},
        {label:"Cardiac Assessment",fields:["Structural heart disease","Arrhythmia","Ventricular function","CTR"]},
        {label:"Management",fields:["Maternal anti-Kell/anti-D — IUT if anaemia","Thoracocentesis — primary effusion","Parvovirus — IUT if hydrops","Delivery timing","Perinatal team alert","Karyotype"]}
      ],
      "OB — Sacrococcygeal Teratoma (SCT)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Tumour",fields:["Size (cm — 3 planes)","Location — presacral vs external","Altman classification (I–IV)","External component (%)","Intrapelvic component (%)"]},
        {label:"Internal Structure",fields:["Solid component — %","Cystic component — %","Mixed","Calcification","Vascularity — highly vascular on Doppler"]},
        {label:"Altman Classification",fields:["Type I — predominantly external","Type II — external + intrapelvic equal","Type III — predominantly intrapelvic","Type IV — entirely presacral"]},
        {label:"Hydrops Features",fields:["Skin oedema","Ascites","Pleural effusion","Pericardial effusion","Placental enlargement"]},
        {label:"Vascular Steal",fields:["High-output cardiac failure — cardiomegaly","CTR elevated","UV flow — hyperdynamic","UA Doppler"]},
        {label:"Spine",fields:["Sacrum — intact/dysplastic","Spinal cord — tethering"]},
        {label:"Liquor",fields:["Polyhydramnios — common","AFI (cm)"]},
        {label:"Management",fields:["Serial growth + Doppler","Hydrops surveillance — weekly if suspected","Fetal MRI for extent","Delivery at surgical centre — C-section if large","EXIT procedure if airway involved","Neonatal surgical excision"]}
      ],
      "OB — Meconium Peritonitis / Echogenic Bowel":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Echogenic Bowel",fields:["Grade (1–3)","Grade 1 — mildly bright","Grade 2 — as bright as bone","Grade 3 — brighter than bone","Distribution — focal/diffuse"]},
        {label:"Meconium Peritonitis",fields:["Intraperitoneal calcification — hyperechoic foci","Free meconium in peritoneal cavity","Pseudocyst formation","Ascites — meconium"]},
        {label:"Bowel",fields:["Dilated loops — obstruction","Perforation features","Microcolon features"]},
        {label:"Associated Diagnoses",fields:["Cystic fibrosis — CF mutation screen offered","Chromosomal — T21 association","Intrauterine infection — CMV/toxoplasma","IUGR association","Swallowed blood"]},
        {label:"Maternal Screen",fields:["CF carrier screen — both parents","CMV IgM","Toxoplasma IgM","Amniocentesis — karyotype + CF"]},
        {label:"Liquor",fields:["AFI (cm)","Polyhydramnios — associated with bowel atresia"]},
        {label:"Management",fields:["CF gene testing — both parents","TORCH screen","Amniocentesis offered","Paediatric surgery referral","Serial surveillance"]}
      ],
      "OB — Skeletal Dysplasia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","FL/AC ratio","Estimated fetal weight"]},
        {label:"Long Bone Measurements",fields:["Femur length (mm) — centile","Humerus length (mm) — centile","Tibia (mm)","Fibula (mm)","Radius (mm)","Ulna (mm)","Femur/foot length ratio"]},
        {label:"Bone Appearance",fields:["Density — normal/increased/decreased","Fractures — present/absent","Bowing — femur/tibia","Callus formation","Curvature"]},
        {label:"Skull",fields:["Shape — normal/cloverleaf/dolicho","Mineralisation — poor in OI type II","Frontal bossing","Compressible skull"]},
        {label:"Chest",fields:["Chest circumference (mm)","Chest/AC ratio (<0.8 — pulmonary hypoplasia risk)","Rib length — short/normal","Rib fractures","Bell-shaped chest"]},
        {label:"Spine",fields:["Platyspondyly","Vertebral shape","Scoliosis"]},
        {label:"Differential Diagnosis",fields:["Thanatophoric dysplasia — most common lethal","Achondroplasia — heterozygous (non-lethal)","Achondrogenesis — severe","Osteogenesis imperfecta — fractures","Short rib polydactyly","Campomelic dysplasia"]},
        {label:"Lethal Indicators",fields:["Chest/AC ratio <0.6 — lethal pulmonary hypoplasia","Cloverleaf skull","Trident acetabulum","Spine involvement"]},
        {label:"Liquor",fields:["Polyhydramnios — thoracic restriction"]},
        {label:"Management",fields:["Skeletal radiograph postnatally","Molecular genetics","Lethal vs non-lethal counselling","Fetal MRI chest","Perinatal palliative care if lethal"]}
      ],
      "OB — Talipes / Clubfoot":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Foot Assessment",fields:["Right foot — talipes equinovarus/calcaneovalgus/equinus","Left foot — talipes equinovarus/calcaneovalgus","Persistence — fixed vs postural","Foot/tibia angle — perpendicular in talipes"]},
        {label:"Classification",fields:["Bilateral talipes","Unilateral — right/left","Equinovarus — medial rotation + plantarflexion","Calcaneovalgus — dorsiflexion","Metatarsus adductus"]},
        {label:"Rocker-Bottom Foot",fields:["Vertical talus — flat/convex sole","Associated with T18"]},
        {label:"Neuromuscular Cause",fields:["Spina bifida association — check spine","Arthrogryposis features","Oligohydramnios — positional cause","CNS anomaly"]},
        {label:"Associated Anomalies",fields:["Spina bifida — check neural arch","Chromosomal markers — T18/T13","CNS anomaly","Limb posture"]},
        {label:"Liquor",fields:["AFI (cm) — oligohydramnios can cause positional"]},
        {label:"Management",fields:["Isolated talipes — Ponseti method counselling","Spine detailed scan","Karyotype if bilateral + other anomalies","Physiotherapy / orthopaedic referral postnatally"]}
      ],
      "OB — Radial Ray Defect / Limb Reduction":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Upper Limb",fields:["Radius — present/absent/hypoplastic","Ulna — present/absent","Radial deviation of hand","Thumb — present/absent","Digits — number","Forearm shortening"]},
        {label:"Lower Limb",fields:["Femur — present/absent","Tibia","Fibula","Foot digits"]},
        {label:"Associated Syndromes",fields:["VACTERL association — vertebral/cardiac/TE/renal/limb","TAR syndrome — thrombocytopenia-absent radius","Holt-Oram syndrome — ASD + radial defect","Fanconi anaemia","Roberts syndrome"]},
        {label:"Cardiac",fields:["VSD","ASD","Cardiac structural defect"]},
        {label:"Spine",fields:["Vertebral anomalies — VACTERL"]},
        {label:"Renal",fields:["Renal anomaly — VACTERL"]},
        {label:"Chromosomal",fields:["Fanconi anaemia markers","Karyotype + FISH"]},
        {label:"Management",fields:["Karyotype + microarray","Fetal echocardiography","Detailed spine/renal scan","Limb prosthesis counselling","Haematology referral — Fanconi"]}
      ],
      "OB — Cleft Lip and Palate":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Upper Lip",fields:["Right side — cleft present/absent","Left side — cleft present/absent","Bilateral","Median cleft — holoprosencephaly association","Philtrum assessment"]},
        {label:"Palate",fields:["Hard palate — intact/cleft","Soft palate — difficult to assess","Secondary palate — 3D assessment","Bilateral cleft palate"]},
        {label:"Classification",fields:["Cleft lip only","Cleft lip + alveolus","Unilateral CL + CP","Bilateral CL + CP","Isolated cleft palate — difficult to diagnose"]},
        {label:"Nose",fields:["Nasal bridge — normal/flattened","Nasal ala — distorted","Proboscis — holoprosencephaly"]},
        {label:"Facial Profile",fields:["Profile — normal/abnormal","Micrognathia","Hypertelorism/hypotelorism"]},
        {label:"Associated Anomalies",fields:["Intracranial — holoprosencephaly with median cleft","Cardiac","Amniotic band sequence","Van der Woude syndrome"]},
        {label:"Chromosomal",fields:["Isolated — low risk","Bilateral with anomalies — higher risk","Karyotype offered"]},
        {label:"Management",fields:["Feeding counselling","Cleft palate team referral","SALT assessment postnatally","Surgical repair planning","Pierre Robin sequence if micrognathia + CP"]}
      ],
      "OB — Micrognathia / Pierre Robin":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Facial Profile",fields:["Profile — retrognathic/severely retrognathic","Jaw index (JI) — normal >23","Inferior facial angle (IFA) — <50° abnormal","Prenasal thickness / nasal bone ratio"]},
        {label:"Mandible",fields:["Mandibular length (mm)","Mandibular width (mm)","Mandibular retrognathia"]},
        {label:"Tongue",fields:["Macroglossia — Beckwith-Wiedemann","Normal tongue position"]},
        {label:"Palate",fields:["Cleft palate — associated with Pierre Robin","Hard palate — U-shaped defect"]},
        {label:"Airway",fields:["Glossoptosis — tongue falls back","Airway obstruction anticipated at birth"]},
        {label:"Polyhydramnios",fields:["AFI (cm) — often elevated in swallowing difficulty","Degree"]},
        {label:"Associated Syndromes",fields:["Pierre Robin sequence — micrognathia + cleft palate + glossoptosis","Treacher Collins","Stickler syndrome","Nager syndrome","Chromosomal"]},
        {label:"Management",fields:["Ex utero intrapartum treatment (EXIT) if severe","Neonatal airway team at delivery","Tracheostomy preparation","NICU level 3","Karyotype + microarray"]}
      ],
      "OB — Fetal Neck Mass / Cystic Hygroma":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Nuchal translucency (if <14 wks)"]},
        {label:"Mass Characteristics",fields:["Location — posterior/lateral/anterior neck","Size (mm — 3 planes)","Morphology — cystic/solid/mixed","Septa — present/absent","Septa thickness"]},
        {label:"Cystic Hygroma",fields:["Posterior nuchal cystic hygroma","Divided by midline septum","Large bilateral cystic hygroma","Axillary/chest extension"]},
        {label:"Hydrops Features",fields:["Skin oedema — scalp/body","Ascites","Pleural effusion","Pericardial effusion","Placenta thickening"]},
        {label:"Cervical Teratoma",fields:["Solid/mixed lesion","Calcification","Vascularity","Airway deviation/compression"]},
        {label:"Airway Assessment",fields:["Tracheal deviation","Airway compression degree","EXIT procedure anticipated"]},
        {label:"Chromosomal Association",fields:["Turner syndrome (45X) — cystic hygroma","T21/T18/T13 association","Noonan syndrome","Karyotype essential"]},
        {label:"Liquor",fields:["Polyhydramnios — if large mass"]},
        {label:"Management",fields:["Karyotype + microarray — essential","Cardiac echo","EXIT procedure planning if large","Delivery at ENT/airway-equipped centre","Sclerotherapy in utero — selected cases"]}
      ],
      "OB — Fetal Ocular Anomalies":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Orbits",fields:["Binocular distance (BOD) (mm)","Interorbital distance (IOD) (mm)","Ocular diameter (OD) (mm)","BOD/BPD ratio"]},
        {label:"Hypertelorism / Hypotelorism",fields:["Hypertelorism — wide spacing","Hypotelorism — close spacing","IOD centile"]},
        {label:"Anophthalmia / Microphthalmia",fields:["Unilateral — right/left","Bilateral","Absent globe","Small globe"]},
        {label:"Cyclopia",fields:["Fused orbits — single orbit","Holoprosencephaly association","Proboscis"]},
        {label:"Lens",fields:["Lens — visible/absent","Cataract — hyperechoic lens"]},
        {label:"Associated CNS",fields:["Holoprosencephaly — hypotelorism","Agenesis corpus callosum","Frontal lobe","Encephalocele"]},
        {label:"Associated Syndromes",fields:["Fraser syndrome — cryptophthalmos","Goldenhar syndrome","CHARGE syndrome","Chromosomal"]},
        {label:"Management",fields:["Karyotype + microarray","Fetal MRI brain","Ophthalmology referral","Genetic counselling"]}
      ],
      "OB — Arthrogryposis Multiplex Congenita":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Limb Posture",fields:["Fixed joint contractures — which joints","Upper limbs — extended/flexed","Lower limbs — extended/flexed","Hands — clenched fists","Feet — talipes"]},
        {label:"Limb Movement",fields:["Absent/markedly reduced limb movements","Generalised hypokinesia","Restricted range of movement"]},
        {label:"Skin",fields:["Pterygia (skin webbing) — location","Nuchal/axillary/popliteal/antecubital pterygia"]},
        {label:"CNS",fields:["Brain morphology — normal/abnormal","Ventriculomegaly","Spinal cord — myelomeningocele"]},
        {label:"Thorax",fields:["Chest size — pulmonary hypoplasia risk","Rib appearance"]},
        {label:"Liquor",fields:["Polyhydramnios — reduced swallowing","AFI (cm)"]},
        {label:"Face",fields:["Micrognathia","Facial features"]},
        {label:"Aetiology",fields:["Neurological — CNS anomaly","Neuromuscular — congenital myopathy","Mechanical — amniotic bands/oligohydramnios","Maternal — myasthenia gravis/myotonic dystrophy","Chromosomal"]},
        {label:"Management",fields:["Karyotype + microarray","Maternal myasthenia/myotonic dystrophy screen","Fetal MRI","Orthopaedic counselling","Neonatal respiratory support anticipated"]}
      ],
      "OB — Trisomy 21 (Down Syndrome) Markers":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Nuchal fold thickness (mm)"]},
        {label:"First Trimester Markers (if applicable)",fields:["NT (mm)","NB (present/absent)","DV PI","TV regurgitation"]},
        {label:"Second Trimester Soft Markers",fields:["Nuchal fold ≥6 mm (18–22 wks)","Absent/hypoplastic nasal bone","Echogenic intracardiac focus (EIF)","Short femur (<5th centile)","Short humerus (<5th centile)","Echogenic bowel","Renal pelvis dilatation >4 mm","Sandal gap toe","Wide iliac angle","Clinodactyly (5th finger)"]},
        {label:"Structural Anomalies",fields:["AVSD / VSD — cardiac","Duodenal atresia","Hydrops"]},
        {label:"Markers Count",fields:["Number of soft markers present","Isolated marker vs multiple markers","Adjusted risk calculation"]},
        {label:"Integrated / Cell-free DNA",fields:["cfDNA result — if known","Combined test result","Adjusted risk"]},
        {label:"Management",fields:["Isolated marker — monitor","Multiple markers — amniocentesis offered","cfDNA — if screening","Genetic counselling","Down syndrome support resources"]}
      ],
      "OB — Trisomy 18 (Edwards Syndrome) Markers":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","IUGR — common"]},
        {label:"CNS Markers",fields:["Choroid plexus cysts — bilateral","Neural tube defect","Strawberry-shaped skull","Agenesis corpus callosum","Ventriculomegaly"]},
        {label:"Cardiac",fields:["VSD — most common","AVSD","Complex congenital heart disease"]},
        {label:"Hands",fields:["Clenched fists — overlapping fingers","2nd and 5th fingers overlapping 3rd/4th"]},
        {label:"Feet",fields:["Rocker-bottom feet — vertical talus","Talipes"]},
        {label:"Face",fields:["Micrognathia","Prominent occiput","Low-set ears","Microophthalmia"]},
        {label:"Abdominal",fields:["Omphalocele (not gastroschisis)","Bowel atresia"]},
        {label:"IUGR",fields:["Severe IUGR","Growth restriction pattern","Oligohydramnios"]},
        {label:"Other Markers",fields:["Single umbilical artery","Polyhydramnios","Umbilical cord cyst"]},
        {label:"Management",fields:["cfDNA / amniocentesis","Lethal condition — majority","Perinatal palliative care counselling","Genetic counselling"]}
      ],
      "OB — Trisomy 13 (Patau Syndrome) Markers":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"CNS Markers",fields:["Holoprosencephaly — alobar/semilobar","Agenesis corpus callosum","Ventriculomegaly","Dandy-Walker"]},
        {label:"Facial",fields:["Cyclopia / fused orbits","Proboscis","Hypotelorism","Median cleft lip","Microophthalmia"]},
        {label:"Cardiac",fields:["Complex CHD — majority have cardiac defects","VSD","AVSD"]},
        {label:"Polydactyly",fields:["Post-axial polydactyly — extra digit at ulnar/fibular side","Bilateral polydactyly"]},
        {label:"Renal",fields:["Polycystic / hyperechoic kidneys","Renal enlargement"]},
        {label:"Abdominal",fields:["Omphalocele"]},
        {label:"Scalp",fields:["Cutis aplasia — scalp defect"]},
        {label:"Management",fields:["Karyotype — essential","Lethal condition — majority","Perinatal palliative counselling","Genetic counselling"]}
      ],
      "OB — Turner Syndrome (45X) Features":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Nuchal",fields:["Large cystic hygroma — posterior nuchal","Septate hygroma","NT greatly elevated"]},
        {label:"Hydrops",fields:["Generalised hydrops","Skin oedema","Ascites","Pleural effusion"]},
        {label:"Cardiac",fields:["Coarctation of aorta","Left-sided cardiac lesions","Bicuspid aortic valve","HLHS"]},
        {label:"Renal",fields:["Horseshoe kidney","Pelvic kidney","Renal anomaly"]},
        {label:"Growth",fields:["Short stature — if late presentation","Growth restriction","EFW centile"]},
        {label:"Ovaries",fields:["Ovarian dysgenesis — not detectable antenatally"]},
        {label:"Oedema",fields:["Lymphoedema — dorsum of hands/feet (neonatal)","Nuchal oedema"]},
        {label:"Chromosomal",fields:["45X — monosomy X","45X mosaicism — milder","Karyotype essential — FISH"]},
        {label:"Management",fields:["Karyotype","Cardiac echo","Paediatric endocrinology referral","Growth hormone therapy counselling postnatally"]}
      ],
      "OB — VACTERL / Complex Multi-System Anomaly":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Vertebral (V)",fields:["Vertebral segmentation defects","Hemivertebra","Butterfly vertebra","Block vertebra","Scoliosis"]},
        {label:"Anorectal (A)",fields:["Absent perineal structures","Hydrocolpos","Presacral mass"]},
        {label:"Cardiac (C)",fields:["VSD","ASD","Tetralogy of Fallot","Complex CHD"]},
        {label:"Tracheo-Oesophageal (TE)",fields:["Oesophageal atresia — absent stomach bubble","Polyhydramnios"]},
        {label:"Renal (R)",fields:["Renal agenesis","Dysplastic kidney","Horseshoe kidney","Hydronephrosis"]},
        {label:"Limb (L)",fields:["Radial ray defect","Thumb hypoplasia","Polydactyly","Limb reduction"]},
        {label:"Additional Features",fields:["Single umbilical artery","Sirenomelia features","Caudal regression"]},
        {label:"Chromosomal",fields:["VACTERL usually chromosomally normal","Karyotype + microarray to exclude","CHARGE syndrome — CHD7 mutation"]},
        {label:"Management",fields:["Full systematic anomaly scan","Fetal echocardiography","Karyotype + microarray","Renal/urological team","Surgical team at birth","Neonatal intensive care"]}
      ],
      "OB — Placenta Praevia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Placental Location",fields:["Anterior / posterior / lateral / fundal","Lower uterine segment involvement","Internal os — distance from placental edge (mm)"]},
        {label:"Classification",fields:["Grade I — low lying: lower segment, not at os","Grade II — marginal: reaches os","Grade III — partial: partially covers os","Grade IV — complete: completely covers os","Distance from os (mm)"]},
        {label:"Placental Thickness",fields:["Thickness (mm)","Abnormally thick (>4 cm) — placenta accreta risk"]},
        {label:"Accreta Features Screen",fields:["Lacunae — irregular vascular spaces","Loss of retroplacental clear space","Bladder wall irregularity","Myometrial thinning <1 mm","Increased vascularity in lower segment on Doppler"]},
        {label:"Cervix",fields:["Cervical length (mm)","Funnelling","Cervical dilatation"]},
        {label:"Haemorrhage",fields:["Active bleeding — present/absent","Retroplacental haematoma","Subchorionic haematoma"]},
        {label:"Management",fields:["Transvaginal ultrasound — confirmed if transabdominal equivocal","Repeat scan at 32 weeks","Caesarean section planning","Accreta assessment — MRI considered"]}
      ],
      "OB — Placenta Accreta Spectrum (PAS)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Risk Factors Present",fields:["Prior caesarean section — number","Placenta praevia — present","Uterine surgery history","Prior uterine curettage"]},
        {label:"Ultrasound Features",fields:["Loss of retroplacental hypoechoic zone","Myometrial thinning <1 mm","Placental lacunae — irregular anechoic vascular spaces — number (≥3 = suspicious)","Posterior placenta — bladder assessment"]},
        {label:"Bladder Wall",fields:["Bladder wall irregularity","Loss of bladder-uterine wall interface","Invasion into bladder — percreta","Bridging vessels to bladder wall — Doppler"]},
        {label:"Vascularity (Colour Doppler)",fields:["Increased placental vascularity in lower segment","Turbulent intraplacental flow","Bridging vessels to bladder","Uterine serosa vascularity"]},
        {label:"Accreta Spectrum",fields:["Placenta accreta — superficial myometrial invasion","Placenta increta — deep myometrial invasion","Placenta percreta — through serosa/bladder"]},
        {label:"Placental Location",fields:["Anterior low — highest risk","Posterior — bladder less involved","Previa — complete or partial"]},
        {label:"Management",fields:["MRI for depth of invasion","Interventional radiology — iliac balloon catheter planning","Multidisciplinary team meeting","Caesarean-hysterectomy planning","Blood bank alert","ICU post-op plan"]}
      ],
      "OB — Placental Abruption":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Haematoma",fields:["Retroplacental — between placenta and uterine wall","Subchorionic — between placenta and chorion","Marginal — at placental edge","Size (cm)","Volume estimate (ml)"]},
        {label:"Haematoma Echogenicity",fields:["Hyperechoic — acute (<48h)","Isoechoic — evolving (1–2 weeks)","Hypoechoic — resolving (>2 weeks)"]},
        {label:"Placental Features",fields:["Placental thickening — raised from uterine wall","Placental edge lifting","Retroplacental space widening"]},
        {label:"Fetal Status",fields:["CTG / Doppler — fetal wellbeing","Fetal heart rate — regular/tachycardic","UA Doppler","MCA Doppler","BPP score"]},
        {label:"Liquor",fields:["AFI (cm)","Oligohydramnios — compromise"]},
        {label:"Uterus",fields:["Uterine contractions","Cervical changes"]},
        {label:"Clinical Correlation",fields:["Bleeding per vaginum","Pain","Uterine tenderness","Shock features — correlate with clinical"]},
        {label:"Management",fields:["Delivery if fetal compromise","Conservative management if minor/stable","Serial Doppler monitoring","Delivery timing based on gestation + severity"]}
      ],
      "OB — Vasa Praevia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Vasa Praevia",fields:["Type I — velamentous cord insertion with vessels over os","Type II — vessels between bilobed/succenturiate lobes over os","Vessels confirmed over or near internal os"]},
        {label:"Cord Insertion",fields:["Velamentous cord insertion — cord inserts into membranes not placenta","Marginal cord insertion","Normal central insertion"]},
        {label:"Vessel over Os",fields:["Free-running vessel over internal os — colour Doppler","Distance of vessel from os (mm)","Pulsatile vessel — arterial","Non-pulsatile — venous"]},
        {label:"Placenta",fields:["Succenturiate lobe — separate lobe with connecting vessels","Bilobed placenta","Placenta praevia association"]},
        {label:"Transvaginal Ultrasound",fields:["Vessels at internal os — confirmed on TVS","Colour Doppler — vessel over os","Pulsed Doppler — fetal heart rate waveform"]},
        {label:"Cervix",fields:["Cervical length (mm)","Short cervix — higher risk of vessel rupture"]},
        {label:"Management",fields:["Emergency C-section if ROM occurs — vasa praevia rupture lethal","Planned C-section at 35–36 weeks","Hospital admission from 30–32 weeks","Steroid course — if early delivery anticipated","Fetal monitoring twice weekly"]}
      ],
      "OB — Umbilical Cord Abnormalities":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Cord Insertion",fields:["Placental insertion — central/marginal/velamentous","Fetal insertion — normal","Furcate insertion"]},
        {label:"Cord Vessels",fields:["3-vessel cord — normal","Single umbilical artery (SUA) — 2 vessels","2 arteries + 1 vein confirmed on colour Doppler"]},
        {label:"Cord Morphology",fields:["Coiling index — hypo-coiled (straight) / hyper-coiled","Cord diameter (mm)","Cord oedema / Wharton jelly excess","Cord thinning — velamentous"]},
        {label:"Nuchal Cord",fields:["Nuchal cord — present/absent","Loops around neck — number","Tight vs loose"]},
        {label:"Cord Cysts",fields:["Allantoic cyst — near fetal end","Omphalomesenteric cyst — near fetal end","True cord cyst","Pseudocyst — Wharton jelly liquefaction"]},
        {label:"Cord Entanglement",fields:["Monoamniotic twins — entanglement","Direction of coiling"]},
        {label:"Cord Prolapse (if applicable)",fields:["Cord visible in cervix/vagina","Fetal parts vs cord"]},
        {label:"Management",fields:["SUA — anomaly scan + fetal echo + renal scan","Velamentous — fetal echo + Doppler surveillance","Vasa praevia exclusion — velamentous insertion","Hypo-coiled — increased fetal surveillance"]}
      ],
      "OB — Single Umbilical Artery (SUA)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Growth centile"]},
        {label:"SUA Confirmation",fields:["Two-vessel cord confirmed","Left or right artery absent","Colour Doppler at iliac vessels — one artery"]},
        {label:"Associated Anomalies Screen",fields:["CNS — head and brain","Cardiac — 4-chamber + outflow tracts","Renal — both kidneys + bladder","Abdominal wall","Chromosomal markers"]},
        {label:"Soft Markers",fields:["Echogenic bowel","Short long bones","Nuchal fold","Other soft markers"]},
        {label:"Cardiac Assessment",fields:["Conotruncal anomaly — right-sided SUA association","VSD","Outflow tract"]},
        {label:"Renal Assessment",fields:["Renal agenesis — more common with SUA","Hydronephrosis","Horseshoe kidney"]},
        {label:"Fetal Growth",fields:["EFW centile — IUGR association with SUA","Growth velocity"]},
        {label:"Doppler",fields:["UA Doppler — one vessel","PI","RI","MCA Doppler"]},
        {label:"Management",fields:["Full anomaly scan if isolated SUA found at 20 weeks","Fetal echocardiography","Renal scan","IUGR surveillance — serial growth","Karyotype if additional anomalies"]}
      ],
      "OB — Fetal Growth Restriction (FGR) / IUGR":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile","HC:AC ratio"]},
        {label:"Growth Velocity",fields:["Interval growth from prior scan","Abdominal circumference interval","EFW interval (g)","Days since last scan"]},
        {label:"FGR Classification",fields:["Early onset FGR (<32 weeks) — severe uteroplacental dysfunction","Late onset FGR (>32 weeks) — subtler","Type I — symmetric (all parameters)","Type II — asymmetric (AC/EFW lagging)"]},
        {label:"Umbilical Artery Doppler",fields:["UA PI","UA RI","UA S/D ratio","End-diastolic flow — present/absent/reversed","AEDF — absent end-diastolic flow","REDF — reversed end-diastolic flow"]},
        {label:"Middle Cerebral Artery",fields:["MCA PI","MCA RI","MCA PSV (cm/s)","Cerebral redistribution — low MCA PI","CPR (cerebro-placental ratio)"]},
        {label:"Ductus Venosus",fields:["DV waveform","DV PI","A-wave — positive/absent/reversed","Pre-terminal pattern — reversed A-wave"]},
        {label:"Uterine Artery",fields:["Right UtA PI","Left UtA PI","Notching — bilateral/unilateral","Resistance"]},
        {label:"Liquor",fields:["AFI (cm)","MVP (cm)","Oligohydramnios — <5 cm AFI"]},
        {label:"BPP Score",fields:["Breathing movements","Body movements","Tone","Liquor","Score (out of 8)"]},
        {label:"Placenta",fields:["Placental grade","Infarction features","Size","Calcification"]},
        {label:"Management",fields:["IUGR staging — PORTO/TRUFFLE criteria","Delivery timing — gestational age + Doppler stage","Antenatal steroids if <34 wks","Magnesium sulphate neuroprotection if <30 wks","NICU counselling"]}
      ],
      "OB — Placental Insufficiency & Doppler Assessment":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile"]},
        {label:"Umbilical Artery Doppler",fields:["PI","RI","S/D ratio","EDF — present/absent/reversed","Side assessed"]},
        {label:"Middle Cerebral Artery",fields:["MCA PI","MCA RI","MCA PSV (cm/s)","Brain sparing — MCA PI < UA PI","CPR"]},
        {label:"CPR (Cerebro-Placental Ratio)",fields:["CPR = MCA PI / UA PI","Normal >1.0","Abnormal <0.8 — fetal compromise"]},
        {label:"Ductus Venosus",fields:["DV waveform","DV PI","A-wave direction","Reversed A-wave — acidaemia risk"]},
        {label:"Uterine Artery",fields:["Bilateral UtA PI — mean","Notching","Elevated resistance"]},
        {label:"Venous Doppler",fields:["Umbilical vein pulsations","Ductus venosus","IVC waveform"]},
        {label:"Liquor",fields:["AFI (cm)","MVP (cm)"]},
        {label:"BPP",fields:["Score (out of 8)"]},
        {label:"IUGR Staging",fields:["Stage I — UA AEDF","Stage II — DV abnormal","Stage III — DV reversed A-wave","Stage IV — abnormal CTG","Action by stage"]}
      ],
      "OB — Twin Pregnancy (DCDA)":[
        {label:"Chorionicity Confirmation",fields:["Dichorionic diamniotic (DCDA)","Lambda sign / twin-peak sign — present","Membrane thickness — thick (≥2 mm)","Number of placental masses"]},
        {label:"Twin A Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile","Presentation"]},
        {label:"Twin B Biometry",fields:["BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile","Presentation"]},
        {label:"Growth Discordance",fields:["EFW discordance (%) — (larger−smaller)/larger × 100","≥20% — significant","≥25% — severe"]},
        {label:"Liquor",fields:["Twin A AFI/MVP (cm)","Twin B AFI/MVP (cm)","Discordant liquor"]},
        {label:"Doppler",fields:["Twin A UA Doppler","Twin B UA Doppler","MCA if growth discordant"]},
        {label:"Anatomy",fields:["Twin A — structural survey","Twin B — structural survey"]},
        {label:"Cervix",fields:["Cervical length (mm)","Short cervix — preterm risk"]},
        {label:"Placenta",fields:["Placental location — A and B","Cord insertions"]},
        {label:"Management",fields:["Scan every 4 weeks from 16 weeks","Growth discordance >20% — fortnightly scans","Delivery at 38 weeks DCDA uncomplicated"]}
      ],
      "OB — Twin Pregnancy (MCDA)":[
        {label:"Chorionicity Confirmation",fields:["Monochorionic diamniotic (MCDA)","T-sign at membrane insertion","Single placental mass","Thin membrane (<2 mm)","Intertwin membrane present"]},
        {label:"Twin A Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile"]},
        {label:"Twin B Biometry",fields:["BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile"]},
        {label:"Growth Discordance",fields:["EFW discordance (%)","≥20% — TAPS/sFGR assessment","≥25% — urgent review"]},
        {label:"Liquor",fields:["Twin A MVP (cm)","Twin B MVP (cm)","TTTS criteria: A (donor) <2 cm + B (recipient) >8 cm"]},
        {label:"Bladder Assessment",fields:["Twin A bladder — visible/absent","Twin B bladder — visible"]},
        {label:"Doppler",fields:["Twin A UA PI","Twin B UA PI","MCA PSV both twins — TAPS screen","DV if abnormal"]},
        {label:"Intertwin Membrane",fields:["Present and intact","Membrane stuck to donor — stuck twin phenomenon"]},
        {label:"TTTS Staging",fields:["Stage I — discordant liquor only","Stage II — absent bladder donor","Stage III — abnormal Doppler","Stage IV — hydrops","Stage V — fetal demise"]},
        {label:"Management",fields:["Scan every 2 weeks from 16 weeks","TTTS — laser referral if Stage II+","Delivery at 36 weeks uncomplicated MCDA","Corticosteroids if early delivery"]}
      ],
      "OB — Twin-to-Twin Transfusion Syndrome (TTTS)":[
        {label:"Chorionicity",fields:["Monochorionic confirmed — T-sign","Shared single placenta"]},
        {label:"Biometry",fields:["Twin A (donor) — BPD/HC/AC/FL/EFW/centile","Twin B (recipient) — BPD/HC/AC/FL/EFW/centile","EFW discordance (%)"]},
        {label:"Quintero Staging",fields:["Stage I — discordant liquor only (donor MVP <2 cm, recipient MVP >8 cm)","Stage II — absent bladder in donor (stuck twin)","Stage III — abnormal Doppler (UA AEDF/REDF, DV reversed A, UV pulsations)","Stage IV — hydrops (recipient)","Stage V — demise of one or both twins"]},
        {label:"Donor (Twin A)",fields:["MVP (cm) — oligohydramnios (<2 cm)","Bladder — absent (Stage II+)","UA Doppler","Stuck twin appearance"]},
        {label:"Recipient (Twin B)",fields:["MVP (cm) — polyhydramnios (>8 cm)","Bladder — distended","Cardiomegaly","RV dysfunction","Tricuspid regurgitation"]},
        {label:"Doppler",fields:["Donor UA — AEDF/REDF","Recipient UA — normal/abnormal","DV — both twins","MCA PSV — TAPS component"]},
        {label:"Recipient Cardiac",fields:["CTR","RV function","Tricuspid regurgitation severity","Pulmonary stenosis features"]},
        {label:"Hydrops (Stage IV)",fields:["Skin oedema recipient","Ascites","Pleural effusion","Pericardial effusion"]},
        {label:"Management",fields:["Referral to fetal therapy centre — laser coagulation","Serial laser if Stage II–IV","Selective reduction if discordant anomaly","Delivery at specialist centre","TOPS counselling"]}
      ],
      "OB — Twin Reversed Arterial Perfusion (TRAP)":[
        {label:"Chorionicity",fields:["Monochorionic twin pregnancy","Single placenta"]},
        {label:"Pump Twin (Normal)",fields:["Biometry — BPD/HC/AC/FL/EFW","Cardiac function — normal/hyperdynamic","CTR","UA Doppler","Hydrops features"]},
        {label:"Acardiac Mass (Perfused Twin)",fields:["Size of acardiac mass (cm)","Ratio — acardiac/pump twin EFW","Absent cardiac pulsation","Amorphous tissue mass","Limb buds — present/absent","Head — absent/rudimentary"]},
        {label:"Vascular Connection",fields:["Artery-to-artery anastomosis — retrograde","Vein-to-vein anastomosis","Superficial cord insertion to acardiac mass"]},
        {label:"Pump Twin Cardiac",fields:["High-output cardiac failure","Cardiomegaly — CTR elevated","Hydrops — skin oedema/ascites/pleural","UA Doppler"]},
        {label:"Liquor",fields:["Polyhydramnios — common","AFI (cm)"]},
        {label:"Acardiac Mass Ratio",fields:["<50% — lower risk","50–70% — moderate risk",">70% — high risk of pump failure"]},
        {label:"Management",fields:["Fetal therapy centre referral","RFA — radiofrequency ablation of acardiac mass","Laser cord coagulation","Serial pump twin cardiac surveillance","Delivery timing based on pump twin status"]}
      ],
      "OB — Monoamniotic Twin Pregnancy (MCMA)":[
        {label:"Chorionicity / Amnionicity",fields:["Monochorionic monoamniotic (MCMA)","Single placenta","Absent intertwin membrane — confirmed"]},
        {label:"Cord Entanglement",fields:["Cord entanglement — present/absent","Site of entanglement","Number of twists","Doppler at entanglement site — patent/compromised"]},
        {label:"Twin A Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Twin B Biometry",fields:["BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Doppler Both Twins",fields:["Twin A UA PI/RI/EDF","Twin B UA PI/RI/EDF","DV both twins","MCA both twins"]},
        {label:"Fetal Hearts",fields:["Both hearts — structural assessment","Cardiac function","CTR","Arrhythmia"]},
        {label:"Liquor",fields:["Single amniotic sac","AFI (cm)","Adequate for both fetuses"]},
        {label:"TTTS Screen",fields:["Growth discordance (%)","Doppler discordance"]},
        {label:"Management",fields:["High-risk pregnancy — specialist centre","Daily CTG from 26–28 weeks","Delivery at 32–34 weeks","Inpatient admission from 26 weeks","C-section delivery"]}
      ],
      "OB — Higher Order Multiple Pregnancy (Triplets+)":[
        {label:"Chorionicity / Amnionicity",fields:["Trichorionic triamniotic (TCTA)","Dichorionic triamniotic (DCTA)","Monochorionic + singleton configuration","Amnionicity — each sac confirmed"]},
        {label:"Fetus A Biometry",fields:["BPD/HC/AC/FL/EFW/centile"]},
        {label:"Fetus B Biometry",fields:["BPD/HC/AC/FL/EFW/centile"]},
        {label:"Fetus C Biometry",fields:["BPD/HC/AC/FL/EFW/centile"]},
        {label:"Growth Discordance",fields:["Maximum discordance between largest and smallest (%)","Which fetuses most discordant"]},
        {label:"Liquor Each Sac",fields:["Fetus A MVP (cm)","Fetus B MVP (cm)","Fetus C MVP (cm)"]},
        {label:"Doppler",fields:["UA Doppler each fetus","MCA if discordant","Intertwin TTTS criteria if MC component"]},
        {label:"TTTS Screen (if MC component)",fields:["MC pair staging — Quintero"]},
        {label:"Cervix",fields:["Cervical length (mm)","Short cervix — extreme preterm risk"]},
        {label:"Management",fields:["Specialist multiple pregnancy unit","Fetal reduction counselling if requested","Scan every 2 weeks","Delivery at 34–35 weeks TCTA","Corticosteroids early","NICU level 3 counselling"]}
      ],
      "OB — Preterm Labour / Short Cervix":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Cervical Assessment (TVS)",fields:["Cervical length (mm) — transvaginal","Normal >25 mm","Short — <25 mm","Very short — <15 mm","Technique — empty bladder, transvaginal, no pressure"]},
        {label:"Cervical Morphology",fields:["Funnelling — Y/V/U shape","Funnel length (mm)","Residual cervical length (mm)","Internal os — closed/open","Sludge — amniotic fluid debris near os"]},
        {label:"Cervical Changes",fields:["Cervical dilatation","Membranes prolapsing","Membranes visible at os"]},
        {label:"Cerclage Assessment",fields:["Cerclage in situ — suture visible","Position of suture","Cervical length above suture (mm)"]},
        {label:"Progesterone / Pessary",fields:["Arabin pessary in situ — position","Progesterone treatment noted"]},
        {label:"Uterus",fields:["Contractions — present/absent","Uterine activity","Lower uterine segment thinning"]},
        {label:"Fetal Wellbeing",fields:["Fetal heart rate","Liquor AFI (cm)","UA Doppler"]},
        {label:"Management",fields:["Progesterone if 16–24 wks + short cervix","Cerclage criteria — history/USS-indicated","Arabin pessary","Steroids if <34 wks preterm threatened","Magnesium sulphate neuroprotection if <30 wks","Tocolysis"]}
      ],
      "OB — Pre-eclampsia Surveillance":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile"]},
        {label:"Uterine Artery Doppler",fields:["Right UtA PI","Right UtA notch — present/absent","Left UtA PI","Left UtA notch — present/absent","Mean UtA PI","Bilateral notching"]},
        {label:"Fetal Growth",fields:["EFW centile","AC centile","Interval growth","SGA (<10th centile)","IUGR features"]},
        {label:"Umbilical Artery Doppler",fields:["UA PI","UA RI","UA EDF — present/absent/reversed","Normalised for gestation"]},
        {label:"Middle Cerebral Artery",fields:["MCA PI","CPR","Brain sparing"]},
        {label:"Ductus Venosus",fields:["DV PI","A-wave"]},
        {label:"Liquor",fields:["AFI (cm)","Oligohydramnios"]},
        {label:"Placenta",fields:["Placental grade","Infarction features","Retroplacental haematoma","Thickness"]},
        {label:"Umbilical Vein",fields:["Pulsations — pre-terminal sign"]},
        {label:"Management",fields:["Delivery timing by severity","Antihypertensives","MgSO4 seizure prophylaxis","Steroids if preterm","Fetal surveillance frequency"]}
      ],
      "OB — Gestational Diabetes — Macrosomia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile","HC:AC ratio"]},
        {label:"Macrosomia Assessment",fields:["EFW >90th centile","EFW >4 kg at term","AC > 95th centile — primary macrosomia feature","Accelerated growth velocity from prior scan"]},
        {label:"Abdominal Subcutaneous Fat",fields:["Cheek-to-cheek distance","Abdominal subcutaneous fat thickness (mm) — >10 mm at 37 wks abnormal","Fetal fat deposition"]},
        {label:"Shoulder Assessment",fields:["Shoulder width (mm) — if available","Shoulder dystocia risk indicators","Chest/BPD ratio"]},
        {label:"Liquor",fields:["AFI (cm)","Polyhydramnios — GDM common association"]},
        {label:"Fetal Wellbeing",fields:["Fetal movements","UA Doppler","BPP if needed"]},
        {label:"Placenta",fields:["Placental thickening","Placental grade"]},
        {label:"Cervix",fields:["Cervical length","Bishop score correlation"]},
        {label:"Management",fields:["GDM team coordination","IOL at 38 weeks if EFW >4.5 kg","C-section threshold counselling","Shoulder dystocia drill team alert","Neonatal hypoglycaemia monitoring"]}
      ],
      "OB — PPROM Assessment":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Amniotic Fluid",fields:["AFI (cm) — reduced in PPROM","MVP (cm)","Severe oligohydramnios","Anhydramnios","Liquor change from prior"]},
        {label:"Cervix",fields:["Cervical length (mm)","Dilated cervix","Membranes prolapsing","Sludge"]},
        {label:"Placenta",fields:["Placental location","Retroplacental haematoma","Abruption features"]},
        {label:"Fetal Wellbeing",fields:["Fetal heart rate","Fetal movements","BPP score","UA Doppler"]},
        {label:"Pulmonary Hypoplasia Risk",fields:["Gestation at PPROM","Duration of oligohydramnios","Lung measurements if available"]},
        {label:"Infection Features",fields:["Intra-amniotic infection (chorioamnionitis) — clinical correlation","Uterine tenderness","Fetal tachycardia (>160 bpm)"]},
        {label:"Management",fields:["Latency antibiotics — erythromycin","Steroids if 24–34 wks","Delivery at 34 weeks","Earlier delivery if infection/abruption/fetal compromise","IOL planning"]}
      ],
      "OB — Incompetent Cervix / Cerclage":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Cervical Length (TVS)",fields:["Cervical length (mm)","Technique — transvaginal, empty bladder","Normal ≥25 mm","Short <25 mm","Funnel — present/absent"]},
        {label:"Funnelling",fields:["Funnel shape — Y/V/U/T","Funnel length (mm)","Residual cervical length (mm)","Sludge at os"]},
        {label:"Internal Os",fields:["Closed","Open — width (mm)"]},
        {label:"Cerclage Assessment",fields:["Suture material visible","Level of suture","Cervical length above suture (mm)","Short residual length above suture"]},
        {label:"Cervical History",fields:["History of previous late loss / preterm delivery","History of cervical surgery (LLETZ/cone)"]},
        {label:"Membranes",fields:["Intact membranes","Membranes at os","Prolapsed membranes (balloon in vagina)"]},
        {label:"Uterus",fields:["Contraction activity","Lower segment thinning"]},
        {label:"Management",fields:["History-indicated cerclage criteria","USS-indicated cerclage criteria","Emergency cerclage — membranes at os","Progesterone supplement","Modified activity"]}
      ],
      "OB — Post-dates / Prolonged Pregnancy Assessment":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile","Dates confirmation"]},
        {label:"Biophysical Profile",fields:["Fetal breathing movements (30 min)","Fetal body movements","Fetal tone","Liquor","BPP score (/8)"]},
        {label:"Liquor",fields:["AFI (cm) — oligohydramnios common post-dates","MVP (cm)","Oligohydramnios <5 cm AFI","Subjective liquor assessment"]},
        {label:"Doppler",fields:["UA Doppler — PI/RI/EDF","MCA Doppler","CPR","UA EDF"]},
        {label:"Placenta",fields:["Grade III — mature","Calcification","Infarction","Placental ageing features"]},
        {label:"Fetal Size",fields:["EFW — compare to 40-week standard","Macrosomia assessment","SGA — missed growth failure"]},
        {label:"Cervix",fields:["Cervical length (mm) — TVS","Bishop score correlation","IOL readiness"]},
        {label:"Management",fields:["IOL at 41+0 to 42+0 weeks","Twice-weekly CTG + BPP","Oligohydramnios — expedite delivery","AFI <5 cm — delivery indicated","Counselling on stillbirth risk beyond 42 weeks"]}
      ],
      "OB — Uterine Fibroid in Pregnancy":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Fibroid Characteristics",fields:["Number — solitary/multiple","Location — intramural/submucosal/subserosal/pedunculated/cervical","Size — largest (cm)","Site relative to placenta","Lower uterine segment fibroid"]},
        {label:"Fibroid Complications",fields:["Red degeneration — pain","Degeneration type — hyaline/red/cystic","Torsion of pedunculated fibroid"]},
        {label:"Effect on Pregnancy",fields:["Placental location — over fibroid / separate","Placental abruption risk","Malpresentation — obstruction","Lower segment obstruction — C-section likely"]},
        {label:"Cervical Fibroid",fields:["Position relative to internal os","Cervical canal compression","Obstruction to delivery"]},
        {label:"Fetal Growth",fields:["EFW centile","Uterine distortion effect"]},
        {label:"Liquor",fields:["AFI (cm)"]},
        {label:"Management",fields:["Conservative — analgesia for red degeneration","Serial fibroid size monitoring","Delivery mode planning — obstruction","Intrapartum fibroid risk counselling"]}
      ],
      "OB — Ovarian Cyst in Pregnancy":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Cyst Characteristics",fields:["Side — right/left","Size (cm — 3 planes)","Morphology — simple/complex","Unilocular vs multilocular","Septa — thin/thick","Solid component — present/absent","Vascularity on Doppler"]},
        {label:"Location",fields:["Adnexal","Ovarian","Pedunculated","Fundal — non-ovarian"]},
        {label:"Simple Cyst",fields:["Anechoic — thin wall","No septa","Size <5 cm — likely physiological (corpus luteum)","Size >5 cm — monitoring required"]},
        {label:"Complex Cyst",fields:["Dermoid — echogenic fat","Endometrioma — ground glass","Mucinous — septated","Serous — thin septae"]},
        {label:"Complications",fields:["Torsion features — absent flow + pain","Haemorrhage into cyst","Rupture — free fluid"]},
        {label:"Risk Assessment",fields:["RMI (Risk of Malignancy Index) calculation","IOTA criteria","Simple Rule — benign vs malignant features"]},
        {label:"Management",fields:["<5 cm simple — observe","5–8 cm — serial scan 4-weekly",">8 cm or complex — surgical referral","Torsion — emergency surgery","Gynaecology-oncology referral if malignant features"]}
      ],
      "OB — Maternal Uterine Anomaly in Pregnancy":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"Uterine Morphology",fields:["Uterine shape — normal/bicornuate/subseptate/unicornuate/didelphic/arcuate","Uterine septum — present/length","Fundal contour — convex/flat/concave"]},
        {label:"Uterine Cavity",fields:["Fetus in main cavity","Fetus in rudimentary horn — unicornuate","Gestational sac position"]},
        {label:"Cervix",fields:["Single cervix","Cervical duplication — didelphys","Cervical length (mm)"]},
        {label:"Previous Scar",fields:["Caesarean scar location","Scar thickness (mm) — lower segment","Scar defect (niche) — depth (mm)"]},
        {label:"Fetal Position",fields:["Lie — longitudinal/oblique/transverse","Presentation","Malpresentation rate elevated with septum"]},
        {label:"Liquor & Placenta",fields:["AFI (cm)","Placental location"]},
        {label:"Complications",fields:["Preterm delivery risk","Malpresentation — C-section planning","Scar rupture risk","Cornual ectopic — unicornuate"]},
        {label:"Management",fields:["Serial surveillance","C-section planning if unicornuate/rudimentary horn","RCOG anomaly scan","Fertility preservation counselling for future"]}
      ],
      "OB — Nuchal Translucency Scan (11–13+6 wks)":[
        {label:"Technique",fields:["GA at scan","CRL (mm)","NT measurement technique — sagittal, neutral position, correct magnification","Operator certifications"]},
        {label:"NT Measurement",fields:["NT (mm)","NT MoM","95th centile for CRL","NT ≥3.5 mm — high risk threshold"]},
        {label:"Nasal Bone",fields:["Present — normal","Absent — T21 soft marker","Poorly ossified"]},
        {label:"Ductus Venosus",fields:["Normal — positive A-wave","Reversed A-wave — high risk","PI"]},
        {label:"Tricuspid Valve",fields:["Normal — no regurgitation","TR — 3+ cm/s — high risk"]},
        {label:"Fetal Anatomy",fields:["Stomach bubble","Bladder","Limbs","Spine — NT scan"]},
        {label:"Combined Test",fields:["Free β-hCG MoM","PAPP-A MoM","Background risk","Adjusted T21 risk","Adjusted T18/T13 risk"]},
        {label:"cfDNA Offered",fields:["cfDNA (NIPT) offered — yes/no","cfDNA result if available"]},
        {label:"Management",fields:["Risk-based counselling","cfDNA if high risk intermediate","CVS / amniocentesis if high risk","Repeat NT scan if suboptimal"]}
      ],
      "OB — Fetal MCA Doppler / Fetal Anaemia":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)"]},
        {label:"MCA PSV Measurement",fields:["MCA PSV technique — angle of insonation <30°","Insonation point — proximal third near Circle of Willis","MCA PSV (cm/s)","MoM (multiples of median)","Gestation-specific reference"]},
        {label:"MCA PSV Interpretation",fields:["<1.5 MoM — anaemia unlikely","1.5–1.8 MoM — moderate anaemia",">1.5 MoM — significant anaemia — IUT consideration",">1.8 MoM — severe anaemia"]},
        {label:"MCA PI & RI",fields:["MCA PI","MCA RI","CPR"]},
        {label:"Hydrops Features",fields:["Ascites","Skin oedema","Pleural effusion","Pericardial effusion","Placenta thickening"]},
        {label:"Cardiac",fields:["CTR","Ventricular function","Cardiomegaly"]},
        {label:"Aetiology of Anaemia",fields:["Red cell alloimmunisation — anti-D/anti-Kell","Parvovirus B19","Fetomaternal haemorrhage","Haemoglobinopathy — alpha-thalassaemia","Haemolysis"]},
        {label:"Management",fields:["IUT criteria — MCA PSV >1.5 MoM + hydrops","Fetal blood sampling (FBS) — cordocentesis","Intrauterine transfusion (IUT) — planning","Serial MCA PSV interval","Maternal antibody titres"]}
      ],
      "OB — First Trimester Screening (11–14 wks)":[
        {label:"Technique",fields:["GA at scan — CRL 45–84 mm range","Transabdominal / transvaginal","Image quality adequate"]},
        {label:"CRL & Biometry",fields:["CRL (mm)","GA by CRL","BPD (mm)","Head shape"]},
        {label:"Cardiac Activity",fields:["Heart rate (bpm)","Regular rhythm"]},
        {label:"NT Measurement",fields:["NT (mm)","NT MoM","Method — magnified sagittal, neutral position"]},
        {label:"Soft Markers",fields:["Nasal bone — present/absent","Ductus venosus PI / waveform","Tricuspid regurgitation","Frontonasal angle"]},
        {label:"Pre-eclampsia Screening",fields:["Uterine artery PI — mean","PAPP-A MoM","MAP (mean arterial pressure) — clinical","PlGF — if available","Combined PE risk (1st trimester)"]},
        {label:"Structural Survey (Early)",fields:["Head shape and brain","Heart — situs and chambers","Stomach","Abdominal wall","Limb buds","Spine"]},
        {label:"Combined Test Risk",fields:["T21 combined risk","T18 risk","T13 risk","Action threshold"]},
        {label:"Management",fields:["Combined first trimester screen results","cfDNA offered","Low-dose aspirin — if PE risk >1:100","Repeat nuchal if NT >3.5 mm","Invasive testing if high risk"]}
      ],
      "OB — Fetal Wellbeing (Detailed Doppler)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","EFW centile"]},
        {label:"Umbilical Artery",fields:["UA PI","UA RI","UA S/D ratio","EDF — present/absent/reversed","Waveform assessment"]},
        {label:"Middle Cerebral Artery",fields:["MCA PSV (cm/s) — if anaemia screen","MCA PI","MCA RI","Pulsatility vs resistance"]},
        {label:"Cerebro-Placental Ratio",fields:["CPR = MCA PI / UA PI","Normal >1.0","Abnormal — brain sparing"]},
        {label:"Ductus Venosus",fields:["DV waveform — normal/abnormal","DV PI for veins","A-wave — positive/absent/reversed","Atrial reversal"]},
        {label:"Uterine Artery Doppler",fields:["Right UtA PI","Left UtA PI","Mean UtA PI","Bilateral notching"]},
        {label:"Umbilical Vein",fields:["UV — pulsations absent/present","UV pulsations — pre-terminal sign"]},
        {label:"Biophysical Profile",fields:["Breathing movements","Tone","Movement","Liquor","BPP score (/8)"]},
        {label:"Liquor",fields:["AFI (cm)","MVP (cm)","Oligohydramnios / normal / polyhydramnios"]},
        {label:"PORTO / Staging",fields:["Doppler stage","Action threshold","Delivery timing decision"]}
      ],
      "OB — Ectopic Pregnancy":[
        {label:"Technique",fields:["Transvaginal ultrasound","Transabdominal — backup","Serum β-hCG (IU/L) — clinical correlation"]},
        {label:"Uterus",fields:["Endometrial thickness (mm)","Endometrial pattern","Gestational sac in uterus — absent","Pseudogestational sac — intrauterine fluid without yolk sac"]},
        {label:"Right Adnexa",fields:["Adnexal mass — present/absent","Size (mm)","Ring of fire sign on Doppler — ectopic","Yolk sac seen in adnexal ring","Fetal pole","Cardiac activity in adnexa"]},
        {label:"Left Adnexa",fields:["Adnexal mass — present/absent","Size (mm)","Ring of fire sign","Yolk sac","Cardiac activity"]},
        {label:"Ectopic Location",fields:["Tubal — ampullary (most common)","Isthmic — higher rupture risk","Cornual / interstitial — high risk","Cervical","Ovarian","Caesarean scar ectopic","Heterotopic (very rare)"]},
        {label:"Haemoperitoneum",fields:["Free fluid in pouch of Douglas","Free fluid in Morison's pouch","Volume estimate — trace/mild/moderate/large","Echogenicity — haemorrhagic"]},
        {label:"Rupture Features",fields:["Large haemoperitoneum","Active bleeding on Doppler","Pain correlation"]},
        {label:"β-hCG Correlation",fields:["β-hCG level","Discriminatory zone — gestational sac expected if >1500–2000 IU/L","PUL — pregnancy of unknown location"]},
        {label:"Management",fields:["Medical — methotrexate criteria (unruptured, β-hCG <5000, stable)","Surgical — laparoscopy","Expectant — declining β-hCG","Emergency surgery if ruptured","Haemodynamic status"]}
      ],
      "OB — Second Trimester Anomaly Scan (18–22 wks)":[
        {label:"Biometry",fields:["GA by LMP","BPD (mm)","HC (mm)","AC (mm)","FL (mm)","EFW (g)","Growth centile","Dates concordance"]},
        {label:"Head & Brain",fields:["Head shape — oval","BPD centile","HC centile","Cavum septum pellucidum (CSP)","Cerebral ventricles — atrial width (mm)","Choroid plexus","Posterior fossa — cerebellum","Cisterna magna (mm)","Nuchal fold (mm)"]},
        {label:"Face",fields:["Upper lip — intact","Nasal bone — present/absent","Profile","Orbits"]},
        {label:"Spine",fields:["Cervical spine","Thoracic spine","Lumbar spine","Sacrum","Skin covering"]},
        {label:"Thorax",fields:["Chest shape","Diaphragm — intact","Heart situs — left","4-chamber view","LVOT","RVOT","3-vessel view"]},
        {label:"Abdomen",fields:["Anterior wall — intact","Stomach bubble — seen in LUQ","Bowel echogenicity","Liver","Kidneys bilateral","Renal pelvis AP diameter (mm)","Bladder — visible"]},
        {label:"Umbilical Cord",fields:["Cord vessels — 3 vessel","Insertion — abdominal wall","Placental insertion"]},
        {label:"Limbs",fields:["Femur centile","Humerus","Bilateral long bones","Hands — visualised","Feet — plantar view","Digits"]},
        {label:"Placenta & Liquor",fields:["Placenta — site / anterior / posterior / fundal","Lower edge distance from os (mm)","AFI (cm) / MVP (cm)","Cord insertion to placenta"]},
        {label:"Uterus & Cervix",fields:["Cervical length (mm) — if indicated","Uterine anomaly","Fibroids"]},
        {label:"Soft Markers",fields:["Echogenic intracardiac focus","Short long bones","Echogenic bowel","Renal pelvis dilatation","Nuchal fold ≥6 mm","Number of soft markers"]}
      ]
    },
  },
  "X-Ray":{icon:"📡",color:"#1B4332",accent:"#40916C",
    regions:["Chest","Abdomen","Spine","Extremity","Skull/Sinuses"],
    sections:{
      Chest:[
        {label:"Technical Adequacy",fields:["Projection","Rotation","Inspiration","Exposure"]},
        {label:"Lungs",fields:["Lung fields","Airspace opacity","Air bronchogram","Pleural effusion","Pneumothorax","Hyperinflation"]},
        {label:"Pleura",fields:["Right pleura","Left pleura","Fissures","Pleural thickening"]},
        {label:"Heart & Mediastinum",fields:["CTR (cardiothoracic ratio)","Cardiac contour","Mediastinal width","Trachea","Hilum R","Hilum L"]},
        {label:"Bones",fields:["Ribs","Clavicles","Scapulae","Spine","Sternum"]},
        {label:"Soft Tissues",fields:["Breast shadows","Subcutaneous emphysema"]},
        {label:"Tubes & Lines",fields:["ETT position","CVC tip","NG tube","Pacemaker/ICD"]},
      ],
      Abdomen:[
        {label:"Bowel Gas Pattern",fields:["Small bowel","Large bowel","Air-fluid levels","Pneumoperitoneum"]},
        {label:"Solid Organs",fields:["Liver size","Spleen size","Renal shadows"]},
        {label:"Calcifications",fields:["Renal calculi","Gallstones","Vascular","Other"]},
        {label:"Bones",fields:["Lumbar spine","Pelvis","Hip joints"]},
      ],
      Spine:[
        {label:"Alignment",fields:["Lordosis/kyphosis","Scoliosis","Listhesis"]},
        {label:"Vertebral Bodies",fields:["Height","Endplates","Compression fracture"]},
        {label:"Disc Spaces",fields:["Disc height","Osteophytes"]},
        {label:"Posterior Elements",fields:["Pedicles","Facet joints","Spinous processes"]},
      ],
      Extremity:[
        {label:"Bones",fields:["Fracture","Alignment","Cortex","Trabecular pattern","Bone density"]},
        {label:"Joint",fields:["Joint space","Effusion","Erosions","Calcification"]},
        {label:"Soft Tissues",fields:["Swelling","Calcification","Foreign body"]},
      ],
      "Skull/Sinuses":[
        {label:"Skull",fields:["Vault","Sutures","Sella turcica","Calvaria"]},
        {label:"Paranasal Sinuses",fields:["Frontal","Maxillary","Ethmoid","Sphenoid","Air-fluid levels","Mucosal thickening"]},
      ],
    },
  },
  "CT Scan":{icon:"🌀",color:"#6A0572",accent:"#C77DFF",
    regions:["Head/Brain","CT Brain — Ischaemic Stroke","CT Brain — Haemorrhagic Stroke","CT Brain — Subarachnoid Haemorrhage","CT Brain — Dandy-Walker Malformation","CT Brain — Post Craniotomy (Lesion Excision)","CT Brain — Post Decompressive Craniectomy","CT Brain — Primary Brain Tumour","CT Brain — Cerebral Metastases","CT Brain — Meningitis / Encephalitis","CT Brain — Hydrocephalus","CT Brain — Traumatic Brain Injury","CT Brain — Acute Subdural Haematoma","CT Brain — Chronic Subdural Haematoma","CT Brain — Epidural Haematoma","CT Brain — Brain Abscess","CT Brain — AVM / Vascular Malformation","CT Brain — Chiari Malformation","CT Brain — VP Shunt Check","CT Brain — Cerebral Atrophy / Dementia","CT Brain — Pituitary / Sellar Lesion","CT Brain — Posterior Fossa Tumour","CT Angiography — Brain (CTA)","CT Brain — Craniosynostosis / Suturectomy","CT Brain — Venous Sinus Thrombosis","Chest","CT Pulmonary Embolism (CTPA)","CT Chest — Pneumonia","CT Chest — COVID-19 / Viral Pneumonitis","CT Chest — Lung Nodule / Cancer","CT Chest — Pleural Empyema","CT Chest — Mediastinal Mass","CT Aorta — Dissection","CT Aorta — Thoracic Aneurysm","CT Chest — ILD / Fibrosis (HRCT)","CT Chest — Lymphoma","CT Chest — Blunt Chest Trauma","CT Chest — Post Pneumonectomy / Lobectomy","CT Chest — Bronchiectasis","CT Chest — Sarcoidosis","CT Chest — Pulmonary Hypertension","CT Chest — Pericardial Disease","CT Chest — Diaphragmatic Hernia","CT Chest — Oesophageal Pathology","CT Chest — Rib Fractures","CT Chest — Pleural Mesothelioma","CT Chest — Tracheobronchial Pathology","CT Chest — Spontaneous Pneumothorax","CT Chest — Lung Transplant Follow-up","CT Chest — Empyema Necessitans","Abdomen & Pelvis","CT Abdomen — Acute Appendicitis","CT Abdomen — Bowel Obstruction","CT Abdomen — Acute Pancreatitis","CT Abdomen — Liver Cirrhosis","CT Abdomen — Renal Colic / Urolithiasis","CT Abdomen — Abdominal Trauma","CT Abdomen — Aortic Aneurysm (AAA)","CT Abdomen — Mesenteric Ischaemia","CT Abdomen — Perforated Viscus","CT Abdomen — Acute Diverticulitis","CT Abdomen — Crohn's Disease","CT Abdomen — Colorectal Cancer Staging","CT Abdomen — Liver Lesion Characterisation","CT Abdomen — Renal Mass Characterisation","CT Abdomen — Adrenal Lesion","CT Abdomen — Acute Cholecystitis","CT Abdomen — Post Bowel Surgery","CT Abdomen — Abdominal Wall Hernia","CT Abdomen — Splenic Pathology","CT Abdomen — Retroperitoneal Mass","CT Abdomen — Lymphoma Staging","CT Abdomen — Hepatocellular Carcinoma","CT Abdomen — Ovarian Pathology","CT Abdomen — IBD Follow-up","Neck","CT Neck — Neck Mass / Lymphadenopathy","CT Neck — Deep Space Infection / Abscess","CT Neck — Laryngeal Trauma","CT Neck — Thyroid Cancer","CT Neck — Parotid / Salivary Gland","CT Neck — Post Neck Dissection","CT Neck — Cystic Neck Mass","CT Neck — Nasopharyngeal Carcinoma","CT Neck — Oropharyngeal Cancer","CT Neck — Carotid Body Tumour","CT Neck — Cervical Spine Trauma","CT Pelvis — Female Pelvic Mass","CT Pelvis — Prostate Cancer Staging","CT Pelvis — Cervical Cancer Staging","CT Pelvis — Ovarian Cancer Staging","CT Pelvis — Endometrial Cancer Staging","CT Pelvis — Bladder Cancer Staging","CT Pelvis — Pelvic Fracture","CT Pelvis — Pelvic Inflammatory Disease","CT Pelvis — Hip Joint Pathology","CT Pelvis — Rectal Cancer Staging","CT Pelvis — Sacral Fracture","CT Pelvis — Pelvic Abscess","CT Pelvis — Post Hysterectomy"],
    sections:{
      "Head/Brain":[
        {label:"Technique",fields:["Contrast","Slice thickness","Windows viewed"]},
        {label:"Brain Parenchyma",fields:["Grey-white differentiation","Hypodensity","Hyperdensity","Cerebral oedema","Mass effect"]},
        {label:"Extra-axial Spaces",fields:["Subdural","Epidural","Subarachnoid","Intraventricular haemorrhage"]},
        {label:"Ventricles",fields:["Lateral ventricles","Third ventricle","Fourth ventricle","Hydrocephalus","Midline shift (mm)"]},
        {label:"Posterior Fossa",fields:["Cerebellum","Brainstem","Fourth ventricle","Cisterns"]},
        {label:"Vascular Structures",fields:["Circle of Willis","Hyperdense vessel sign","CTA findings"]},
        {label:"Skull & Soft Tissues",fields:["Calvaria","Skull base","Facial bones","Orbits","Paranasal sinuses","Scalp"]}
      ],
      "CT Brain — Ischaemic Stroke":[
        {label:"Technique",fields:["Contrast","ASPECTS territory assessed","Time from onset to scan"]},
        {label:"Early Ischaemic Changes",fields:["Grey-white differentiation loss","Sulcal effacement","Cortical swelling","ASPECTS score (0–10)"]},
        {label:"Territory Involved",fields:["Vascular territory (MCA/ACA/PCA/vertebrobasilar)","Side (right/left/bilateral)","Extent of ischaemia","Lacunar vs territorial"]},
        {label:"Hyperdense Vessel Sign",fields:["Hyperdense MCA sign","Basilar artery hyperdensity","Dot sign","Other vessel"]},
        {label:"Haemorrhagic Transformation",fields:["Not seen","Haemorrhagic infarction type","Parenchymal haematoma type"]},
        {label:"Prior Infarcts",fields:["Chronic infarcts","Leukoaraiosis","Small vessel disease grade"]},
        {label:"Midline & Herniation",fields:["Midline shift (mm)","Uncal herniation","Subfalcine herniation","Tonsillar herniation"]}
      ],
      "CT Brain — Haemorrhagic Stroke":[
        {label:"Technique",fields:["Non-contrast CT","Haemorrhage windows applied"]},
        {label:"Haematoma",fields:["Location (lobar/basal ganglia/thalamus/brainstem/cerebellar)","Side","Volume (ml) — A×B×C/2","Density (acute/subacute/mixed)","Shape (oval/irregular)"]},
        {label:"Haematoma Expansion Features",fields:["Blend sign","Black hole sign","Island sign","Satellite haematoma"]},
        {label:"IVH (Intraventricular Haemorrhage)",fields:["Present/absent","Lateral ventricles","Third ventricle","Fourth ventricle","Hydrocephalus"]},
        {label:"Mass Effect",fields:["Midline shift (mm)","Sulcal effacement","Herniation type","Basal cisterns"]},
        {label:"Peri-haematoma Oedema",fields:["Width (mm)","Extent","Progression"]},
        {label:"Underlying Cause",fields:["Vascular malformation suspected","Tumour haemorrhage features","Amyloid angiopathy pattern","Hypertensive pattern"]}
      ],
      "CT Brain — Subarachnoid Haemorrhage":[
        {label:"Technique",fields:["Non-contrast CT","Modified Fisher grade"]},
        {label:"SAH Distribution",fields:["Basal cisterns","Sylvian fissures (right/left)","Interhemispheric fissure","Cortical sulci","Perimesencephalic"]},
        {label:"SAH Grading",fields:["Modified Fisher scale (1–4)","Density of blood","Extent"]},
        {label:"Intraventricular Haemorrhage",fields:["Present/absent","Lateral ventricles","Third ventricle","Fourth ventricle"]},
        {label:"Hydrocephalus",fields:["Acute obstructive hydrocephalus","Ventricular dilatation","Temporal horns"]},
        {label:"Parenchymal Haematoma",fields:["Present/absent","Location","Volume (ml)"]},
        {label:"Potential Aneurysm Site",fields:["Location suggestive","CTA recommended","Known aneurysm"]},
        {label:"Brain Parenchyma",fields:["Ischaemic change","Vasospasm evidence","Hypodensity"]}
      ],
      "CT Brain — Dandy-Walker Malformation":[
        {label:"Technique",fields:["Contrast","Neonatal/paediatric protocol"]},
        {label:"Posterior Fossa",fields:["Fourth ventricle — size and morphology","Cystic dilatation of 4th ventricle","Posterior fossa cyst communication","Tentorial elevation","Posterior fossa enlargement"]},
        {label:"Vermian Hypoplasia",fields:["Cerebellar vermis — present/absent/hypoplastic","Degree of vermian rotation","Vermian remnant position"]},
        {label:"Cerebellar Hemispheres",fields:["Size","Hypoplasia","Symmetry"]},
        {label:"Ventricular System",fields:["Hydrocephalus","Lateral ventricle dilatation","Third ventricle","Aqueduct patency"]},
        {label:"Corpus Callosum",fields:["Present and normal","Agenesis","Hypoplasia","Dysgenesis"]},
        {label:"Associated Anomalies",fields:["Neural migration disorder","Cortical dysplasia","Schizencephaly","Other malformations"]},
        {label:"Vascular Structures",fields:["Dural sinuses","Torcular elevation"]}
      ],
      "CT Brain — Post Craniotomy (Lesion Excision)":[
        {label:"Technique",fields:["Contrast","Post-op day","Comparison with pre-op imaging"]},
        {label:"Surgical Site",fields:["Craniotomy location","Bone flap position","Titanium mesh/plate","Subdural drain in-situ"]},
        {label:"Resection Cavity",fields:["Size (cc)","Contents","Air in cavity","Blood products in cavity","Enhancement pattern"]},
        {label:"Residual Lesion",fields:["Not seen — complete resection likely","Residual enhancement","Residual tumour bulk","Enhancement pattern"]},
        {label:"Post-operative Changes",fields:["Pneumocephalus — volume","Subdural haematoma","Epidural haematoma","Cerebral oedema","Haemorrhagic contusion"]},
        {label:"Midline & Herniation",fields:["Midline shift (mm)","Mass effect","Uncal herniation"]},
        {label:"Ventricular System",fields:["Hydrocephalus","VP shunt position","Intraventricular blood"]},
        {label:"Surrounding Brain",fields:["Infarct","Haemorrhage","Oedema extent","Contusion"]}
      ],
      "CT Brain — Post Decompressive Craniectomy":[
        {label:"Technique",fields:["Non-contrast/contrast","Post-op day","Prior imaging comparison"]},
        {label:"Craniectomy",fields:["Location","Size of bone defect","Bone flap storage status","Scalp integrity"]},
        {label:"Brain Herniation Through Defect",fields:["Sunken skin flap","Paradoxical herniation","Transcalvarial herniation — degree"]},
        {label:"Underlying Injury",fields:["Contusion evolution","Haematoma — size and change","Haemorrhagic transformation","Infarct evolution"]},
        {label:"Oedema & Swelling",fields:["Cerebral oedema — degree","Sulcal effacement","Gyral swelling"]},
        {label:"Midline Shift",fields:["Midline shift (mm)","Direction","Change from prior"]},
        {label:"Ventricles",fields:["Size","Hydrocephalus","Midline","IVH"]},
        {label:"Complications",fields:["Haemorrhage at surgical site","Infection features","CSF leak","Extradural fluid"]}
      ],
      "CT Brain — Primary Brain Tumour":[
        {label:"Technique",fields:["Pre-contrast HU","Post-contrast enhancement pattern","Phase"]},
        {label:"Tumour Characteristics",fields:["Location (lobe/region)","Side","Size (3 planes, cm)","Morphology (solid/cystic/mixed)","Margins (well-defined/infiltrative)"]},
        {label:"Enhancement",fields:["Enhancement pattern — none/peripheral/nodular/solid/heterogeneous","Enhancement HU","Breakdown of BBB"]},
        {label:"Internal Features",fields:["Calcification","Haemorrhage","Necrotic centre","Cystic components","Satellite lesions"]},
        {label:"Perilesional Changes",fields:["Oedema — extent (lobar/restricted)","Mass effect","Midline shift (mm)","Herniation"]},
        {label:"Ventricular Involvement",fields:["Ventricular compression","Hydrocephalus","Ependymal spread","IVH"]},
        {label:"Leptomeningeal Spread",fields:["Sulcal enhancement","Basilar cistern involvement","Spinal seeding noted"]},
        {label:"Differential Diagnosis",fields:["Most likely — high grade glioma","Metastasis","Lymphoma","Abscess","Low grade glioma"]}
      ],
      "CT Brain — Cerebral Metastases":[
        {label:"Technique",fields:["Pre and post-contrast","Triple dose protocol if used"]},
        {label:"Metastases",fields:["Number (solitary/multiple/numerous)","Distribution (cortical/subcortical/grey-white junction/cerebellar)","Size — largest lesion","Size — others"]},
        {label:"Lesion Characteristics",fields:["Enhancement — ring/nodular/solid","Haemorrhagic components","Cystic components","Calcification"]},
        {label:"Perilesional Oedema",fields:["Extent","Disproportionate oedema","Mass effect","Midline shift (mm)"]},
        {label:"Posterior Fossa Metastases",fields:["Cerebellar metastases","Brainstem lesions","Fourth ventricle compression","Obstructive hydrocephalus"]},
        {label:"Leptomeningeal Disease",fields:["Sulcal enhancement","Ependymal enhancement","Basilar cisterns"]},
        {label:"Skull & Calvaria",fields:["Calvaria metastases","Skull base involvement","Dural metastases"]},
        {label:"Known Primary",fields:["Primary tumour type","Metastatic pattern consistency","New vs known metastases"]}
      ],
      "CT Brain — Meningitis / Encephalitis":[
        {label:"Technique",fields:["Contrast","Indication (LP safety assessment)"]},
        {label:"Meningeal Enhancement",fields:["Leptomeningeal enhancement","Dural enhancement","Basilar cistern enhancement","Pattern (linear/nodular)"]},
        {label:"Brain Parenchyma",fields:["Encephalitis — focal/diffuse","Cortical swelling","Grey-white loss","Haemorrhagic foci"]},
        {label:"Complications",fields:["Cerebral oedema","Herniation","Infarcts — vasculitis","Venous sinus thrombosis","Subdural empyema","Cerebral abscess"]},
        {label:"Ventricular System",fields:["Ventriculitis","Ependymal enhancement","Hydrocephalus type"]},
        {label:"Cisterns & Sulci",fields:["Basal cisterns — effaced/patent","Sulcal enhancement","Sulcal effacement"]},
        {label:"LP Safety Assessment",fields:["Midline shift","Herniation risk","Basal cisterns — patent/compressed","Opinion on LP safety"]}
      ],
      "CT Brain — Hydrocephalus":[
        {label:"Technique",fields:["Contrast","Comparison with prior if available"]},
        {label:"Ventricular System",fields:["Lateral ventricles — size","Temporal horns (mm)","Third ventricle (mm)","Fourth ventricle","Evans ratio","Ventricular index"]},
        {label:"Type of Hydrocephalus",fields:["Obstructive (non-communicating)","Communicating","Normal pressure hydrocephalus (NPH)","Ex vacuo","Acute vs chronic"]},
        {label:"Cause / Level of Obstruction",fields:["Aqueduct stenosis","4th ventricle outlet obstruction","Mass causing obstruction","Post-haemorrhagic","Post-infectious"]},
        {label:"Transependymal Oedema",fields:["Periventricular low density","CSF ooze","Extent"]},
        {label:"Cortical Sulci",fields:["Effaced","Prominent — atrophy","Appropriate for age"]},
        {label:"NPH Triad Assessment",fields:["Ventriculomegaly","Sulcal effacement despite dilatation","Tight high convexity","Sylvian fissures vs vertex sulci"]},
        {label:"Shunt",fields:["VP shunt in situ","Shunt tip position","Shunt complication features"]}
      ],
      "CT Brain — Traumatic Brain Injury":[
        {label:"Technique",fields:["Non-contrast CT","Bone and brain windows","Marshall CT grade"]},
        {label:"Extradural Haematoma",fields:["Present/absent","Biconvex shape","Location","Volume (ml)","Arterial/venous source"]},
        {label:"Subdural Haematoma",fields:["Present/absent","Crescent shape","Side","Thickness (mm)","Density — acute/mixed/chronic","Midline shift (mm)"]},
        {label:"Subarachnoid Haemorrhage",fields:["Present/absent","Traumatic pattern","Distribution"]},
        {label:"Contusions",fields:["Location (frontal/temporal/other)","Number","Volume","Haemorrhagic/non-haemorrhagic"]},
        {label:"Diffuse Axonal Injury",fields:["Grey-white junction haemorrhages","Corpus callosum","Brainstem","Number of foci"]},
        {label:"Skull Fractures",fields:["Present/absent","Type (linear/depressed/comminuted)","Location","Pneumocephalus"]},
        {label:"Brain Swelling",fields:["Diffuse oedema","Loss of sulci","Basal cisterns — compressed/patent","Midline shift (mm)"]},
        {label:"Marshall Classification",fields:["Marshall CT grade (I–VI)","Rotterdam score"]}
      ],
      "CT Brain — Acute Subdural Haematoma":[
        {label:"Technique",fields:["Non-contrast CT","Windowing — brain and subdural"]},
        {label:"Haematoma",fields:["Side (right/left/bilateral)","Thickness at thickest point (mm)","Length/extent","Crescent morphology","Density (hyperdense — acute)"]},
        {label:"Mixed Density SDH",fields:["Hyperdense component","Hypodense component (active bleeding vs hyperacute)","Mixed/heterogeneous"]},
        {label:"Mass Effect",fields:["Midline shift (mm)","Hemisphere compression","Sulcal effacement","Subfalcine herniation"]},
        {label:"Herniation",fields:["Uncal herniation","Subfalcine herniation","Transtentorial herniation","Foramen magnum"]},
        {label:"Basal Cisterns",fields:["Patent","Partially compressed","Obliterated — poor prognosis"]},
        {label:"Contrecoup Injury",fields:["Contralateral contusions","Opposite hemisphere changes"]},
        {label:"Underlying Brain",fields:["Cortical contusion","DAI features","Pre-existing atrophy"]}
      ],
      "CT Brain — Chronic Subdural Haematoma":[
        {label:"Technique",fields:["Non-contrast CT","Bone windows"]},
        {label:"Haematoma",fields:["Side (right/left/bilateral)","Thickness (mm)","Crescent extent","Density (hypodense — chronic/mixed)","Loculations","Membranes"]},
        {label:"Chronicity Assessment",fields:["Acute — hyperdense","Subacute — isodense","Chronic — hypodense","Mixed — rebleed into chronic"]},
        {label:"Mass Effect",fields:["Midline shift (mm)","Cortical compression","Sulcal effacement"]},
        {label:"Bilateral SDH",fields:["Right thickness (mm)","Left thickness (mm)","Bilateral midline shift"]},
        {label:"Pre-existing Brain",fields:["Underlying atrophy","White matter changes","Prior infarcts"]},
        {label:"Burr Hole Sites",fields:["Post-drainage changes","Residual collection","Drain in situ"]}
      ],
      "CT Brain — Epidural Haematoma":[
        {label:"Technique",fields:["Non-contrast CT","Bone windows"]},
        {label:"Haematoma",fields:["Location","Side","Shape (biconvex/lenticular)","Volume (ml) — A×B×C/2","Max thickness (mm)"]},
        {label:"Density",fields:["Hyperdense — acute arterial","Mixed density — active bleeding (swirl sign)","Hypodense areas — hyperacute/venous"]},
        {label:"Skull Fracture",fields:["Present/absent","Linear/depressed","Crossing dural sinuses","Associated with suture"]},
        {label:"Source of Bleeding",fields:["Temporal — middle meningeal artery","Posterior fossa — transverse sinus","Vertex — SSS","Other"]},
        {label:"Mass Effect",fields:["Midline shift (mm)","Hemisphere compression","Uncal herniation","Basal cisterns"]},
        {label:"Underlying Brain",fields:["Contusion","DAI","Cerebral oedema","Other lesions"]}
      ],
      "CT Brain — Brain Abscess":[
        {label:"Technique",fields:["Pre and post-contrast CT"]},
        {label:"Abscess Characteristics",fields:["Location (lobe/region)","Number (solitary/multiple)","Size (cm)","Rim enhancement — thin/thick/irregular","Central necrosis"]},
        {label:"Capsule",fields:["Well-formed ring enhancement","Thickness (mm)","Medial wall thinning (classic)","Rupture into ventricle"]},
        {label:"Perilesional Changes",fields:["Oedema — extent","Mass effect","Midline shift (mm)"]},
        {label:"Satellite Lesions",fields:["Present/absent","Location","Size"]},
        {label:"Source / Spread",fields:["Direct extension — sinuses/mastoid","Haematogenous seeding","Post-traumatic/surgical","Source unknown"]},
        {label:"Complication",fields:["IVH — ventricular rupture","Ventriculitis","Cerebral herniation","Meningitis"]}
      ],
      "CT Brain — AVM / Vascular Malformation":[
        {label:"Technique",fields:["Pre and post-contrast / CTA"]},
        {label:"Nidus",fields:["Location","Size (cm)","Morphology","Calcification within nidus","Pre-contrast density"]},
        {label:"Enhancement",fields:["Nidus enhancement","Draining veins enhancement","Early venous filling"]},
        {label:"Haemorrhage",fields:["Parenchymal haemorrhage — location/volume","IVH","SAH","Haemorrhagic foci"]},
        {label:"Draining Veins",fields:["Superficial cortical drainage","Deep drainage (vein of Galen)","Dilated veins"]},
        {label:"Feeding Arteries",fields:["Arterial feeders identified","MCA branches","ACA branches","Posterior circulation"]},
        {label:"Associated Aneurysm",fields:["Flow-related aneurysm","Nidal aneurysm"]},
        {label:"Mass Effect",fields:["Midline shift (mm)","Hydrocephalus","Herniation"]}
      ],
      "CT Brain — Chiari Malformation":[
        {label:"Technique",fields:["Contrast","Sagittal reformats"]},
        {label:"Cerebellar Tonsils",fields:["Tonsillar position relative to foramen magnum","Degree of herniation (mm below FM)","Tonsillar morphology (peglike vs rounded)","Chiari type (I/II/III)"]},
        {label:"Posterior Fossa",fields:["Small posterior fossa volume","Brainstem position","Medullary kinking","Obex position"]},
        {label:"Foramen Magnum",fields:["Overcrowding","CSF flow obstruction","Bone anomaly"]},
        {label:"Syrinx",fields:["Present/absent","Level","Length (vertebral segments)","Width (mm)","Septate/non-septate"]},
        {label:"Hydrocephalus",fields:["Communicating hydrocephalus","Obstructive","Ventricular size"]},
        {label:"Chiari II Features",fields:["Luckenschadel skull","Corpus callosum dysgenesis","Tectal beaking","Myelomeningocele in history"]},
        {label:"Associated Anomalies",fields:["Skull base anomaly","Atlantoaxial instability","Basilar invagination"]}
      ],
      "CT Brain — VP Shunt Check":[
        {label:"Technique",fields:["Non-contrast CT","Comparison with prior baseline"]},
        {label:"Shunt Hardware",fields:["Shunt type (VP/VA/LP)","Ventricular catheter tip position","Valve location","Sub-scalp reservoir"]},
        {label:"Ventricular Size",fields:["Lateral ventricles — current vs prior","Third ventricle","Temporal horns","Change from baseline"]},
        {label:"Shunt Function Assessment",fields:["Ventricles unchanged — shunt functioning","Ventricles enlarged vs prior — malfunction?","Ventricles smaller — over-drainage?"]},
        {label:"Complications",fields:["Catheter disconnection","Tip in choroid plexus","Catheter migration","Slit ventricle syndrome","Over-drainage / subdural hygroma"]},
        {label:"Periventricular Changes",fields:["Transependymal oedema — acute malfunction","Periventricular low density"]},
        {label:"Shunt Infection Features",fields:["Adjacent scalp changes","Wound breakdown","Contrast enhancement around hardware"]},
        {label:"Other Brain Parenchyma",fields:["Baseline changes","New lesion","Haemorrhage"]}
      ],
      "CT Brain — Cerebral Atrophy / Dementia":[
        {label:"Technique",fields:["Non-contrast CT"]},
        {label:"Cortical Atrophy",fields:["Global atrophy — grade (mild/moderate/severe)","Parietal atrophy","Temporal atrophy (medial — MTA scale 0–4)","Frontal atrophy","Posterior cortical atrophy"]},
        {label:"Medial Temporal Lobe",fields:["Hippocampal volume — visual MTA grade","Entorhinal cortex","Parahippocampal gyrus"]},
        {label:"White Matter Changes",fields:["Periventricular leukoaraiosis","Subcortical white matter changes","Fazekas grade (0–3)","Posterior predominance"]},
        {label:"Ventricular Enlargement",fields:["Disproportionate to sulcal enlargement","Evans ratio","NPH pattern"]},
        {label:"Vascular Pathology",fields:["Chronic infarcts","Lacunar infarcts","Microangiopathic changes","Strategic infarct"]},
        {label:"Basal Ganglia",fields:["Calcification","Lacunar change","Symmetry"]},
        {label:"Differential Pattern",fields:["Alzheimer pattern — temporal/parietal","Frontotemporal dementia pattern","Vascular dementia pattern","Parkinson/Lewy body pattern"]}
      ],
      "CT Brain — Pituitary / Sellar Lesion":[
        {label:"Technique",fields:["Thin sections through sella","Dynamic contrast"]},
        {label:"Pituitary Gland",fields:["Height (mm)","Symmetry","Enhancement homogeneity","Upward convexity","Stalk deviation"]},
        {label:"Lesion",fields:["Size (cm — 3 planes)","Location (sellar/suprasellar/both)","Macroadenoma (>10 mm) vs microadenoma","Morphology"]},
        {label:"Enhancement Pattern",fields:["Avid uniform enhancement","Delayed enhancement","Non-enhancing focus (microadenoma)","Haemorrhage — pituitary apoplexy"]},
        {label:"Suprasellar Extension",fields:["Degree of suprasellar extension","Optic chiasm compression","Third ventricle compression","Hypothalamus involvement"]},
        {label:"Cavernous Sinus Invasion",fields:["Right cavernous sinus","Left cavernous sinus","Carotid artery encasement","Knosp grade"]},
        {label:"Sphenoid Sinus",fields:["Sphenoid sinus invasion","Bone destruction","Floor of sella"]},
        {label:"Differential",fields:["Pituitary adenoma","Craniopharyngioma","Rathke cleft cyst","Meningioma","Metastasis"]}
      ],
      "CT Brain — Posterior Fossa Tumour":[
        {label:"Technique",fields:["Pre and post-contrast","Posterior fossa windows"]},
        {label:"Tumour Location",fields:["Cerebellar hemisphere","Cerebellar vermis","Fourth ventricle","Brainstem","CPA angle","Foramen magnum"]},
        {label:"Tumour Characteristics",fields:["Size (cm)","Morphology — solid/cystic/mixed","Density — pre-contrast","Calcification","Haemorrhage"]},
        {label:"Enhancement",fields:["Enhancement pattern — solid/ring/nodular/heterogeneous","Mural nodule","Wall enhancement"]},
        {label:"Fourth Ventricle",fields:["Displaced by tumour","Compressed","Engulfed","Communication preserved"]},
        {label:"Hydrocephalus",fields:["Obstructive hydrocephalus","Lateral ventricular dilatation","Temporal horn dilatation","Aqueduct"]},
        {label:"Mass Effect",fields:["Brainstem compression","Foramen magnum herniation","Cerebellar herniation"]},
        {label:"Differential Diagnosis",fields:["Medulloblastoma (midline child)","Pilocytic astrocytoma (cystic + mural)","Ependymoma (4th ventricle)","Haemangioblastoma (adult)","Metastasis (adult)","Meningioma (CPA)"]}
      ],
      "CT Angiography — Brain (CTA)":[
        {label:"Technique",fields:["Contrast bolus timing","Coverage (CoW to vertex)","3D reconstruction performed"]},
        {label:"Circle of Willis",fields:["ICA right","ICA left","MCA right M1/M2","MCA left M1/M2","ACA A1/A2 right","ACA A1/A2 left","AComm","PComm right","PComm left"]},
        {label:"Posterior Circulation",fields:["Basilar artery","PICA right","PICA left","AICA right","AICA left","Vertebral artery right","Vertebral artery left"]},
        {label:"Aneurysm",fields:["Present/absent","Location","Size (mm)","Morphology (saccular/fusiform/blister)","Neck width","Daughter sac","Ruptured vs unruptured"]},
        {label:"Arterial Occlusion / Stenosis",fields:["Occlusion site","Filling defect","Clot burden","Thrombus extent","Collateral filling"]},
        {label:"Vasospasm",fields:["Arterial calibre reduction","Segments involved","Severity"]},
        {label:"AVM / Vascular Malformation",fields:["Nidus size","Feeding arteries","Draining veins","Venous aneurysm"]},
        {label:"Dural Venous Sinuses",fields:["SSS","Transverse sinuses","Sigmoid sinuses","Vein of Galen","Thrombosis"]}
      ],
      "CT Brain — Craniosynostosis / Suturectomy":[
        {label:"Technique",fields:["Volume CT / thin slices","3D skull reconstruction","Post-op day if follow-up"]},
        {label:"Sutures Assessment",fields:["Metopic suture — patent/fused","Coronal suture right — patent/fused","Coronal suture left — patent/fused","Sagittal suture — patent/fused","Lambdoid suture right","Lambdoid suture left","Anterior fontanelle"]},
        {label:"Skull Morphology",fields:["Overall skull shape","Scaphocephaly (sagittal)","Trigonocephaly (metopic)","Plagiocephaly (unilateral coronal/lambdoid)","Brachycephaly (bicoronal)","Turricephaly"]},
        {label:"Post-Suturectomy Changes",fields:["Operative site","Residual bone gap","Bone remodelling","Spring-assisted distraction device position"]},
        {label:"Intracranial Pressure Features",fields:["Copper-beaten skull","Deepened digital markings","Suture diastasis","Fontanelle bulging"]},
        {label:"Brain",fields:["Cerebral herniation","Crowding","Hydrocephalus","Tonsillar descent","Chiari association"]},
        {label:"Orbits",fields:["Orbital dystopia","Hypertelorism","Exorbitism","Harlequin orbit (unilateral coronal)"]},
        {label:"Syndromic Features",fields:["Crouzon features","Apert features","Pfeiffer features","Isolated vs syndromic"]}
      ],
      "CT Brain — Venous Sinus Thrombosis":[
        {label:"Technique",fields:["Non-contrast and post-contrast CT","CTV performed"]},
        {label:"Direct Thrombus Signs",fields:["Dense sinus sign (non-contrast)","Cord sign","Empty delta sign (post-contrast)"]},
        {label:"Sinuses Involved",fields:["Superior sagittal sinus","Right transverse sinus","Left transverse sinus","Right sigmoid sinus","Left sigmoid sinus","Straight sinus","Vein of Galen","Cortical veins","Cavernous sinus"]},
        {label:"Venous Infarction",fields:["Haemorrhagic venous infarct","Non-haemorrhagic oedema","Location (parasagittal/temporal/bilateral)","Bilateral involvement"]},
        {label:"Haemorrhage",fields:["Cortical subarachnoid haemorrhage","Parenchymal haemorrhage","IVH"]},
        {label:"Brain Oedema",fields:["Diffuse cerebral oedema","Localised oedema","Herniation","Basal cisterns"]},
        {label:"Predisposing Features",fields:["Skull base infection","Mastoiditis","Sinusitis","Post-partum","Hypercoagulability clue"]}
      ],
      "Chest":[
        {label:"Technique",fields:["Contrast","Phase","Lung windows","Mediastinal windows","Dose"]},
        {label:"Lungs",fields:["Ground glass opacity","Consolidation","Nodules — size/location/number","Emphysema","Bronchiectasis","Interstitial changes"]},
        {label:"Pleura",fields:["Pleural effusion right","Pleural effusion left","Pneumothorax","Pleural thickening","Calcification"]},
        {label:"Mediastinum",fields:["Lymph nodes — size/station","Great vessels","Trachea/carina","Oesophagus","Anterior mediastinum"]},
        {label:"Heart & Pericardium",fields:["Heart size","Coronary calcification","Pericardial effusion","Chamber dilatation"]},
        {label:"Chest Wall & Bones",fields:["Ribs","Sternum","Thoracic spine","Soft tissues","Axillary nodes"]}
      ],
      "CT Pulmonary Embolism (CTPA)":[
        {label:"Technique",fields:["Bolus timing","Attenuation in PA (target >200 HU)","Image quality","Diagnostic vs non-diagnostic"]},
        {label:"Pulmonary Arteries — Main",fields:["Main pulmonary artery diameter (mm)","Saddle embolus"]},
        {label:"Right Pulmonary Artery",fields:["Main RPA","Right upper lobe","Right middle lobe","Right lower lobe","Segmental branches","Subsegmental branches"]},
        {label:"Left Pulmonary Artery",fields:["Main LPA","Left upper lobe","Lingula","Left lower lobe","Segmental branches","Subsegmental branches"]},
        {label:"PE Burden",fields:["Clot burden — massive/submassive/low-risk","Bilateral/unilateral","CTPA obstruction index","Westrmark sign / Hampton hump"]},
        {label:"Right Heart Strain",fields:["RV:LV ratio","RV dilatation","IV septal flattening / D-sign","Reflux of contrast into IVC","Pulmonary artery dilatation"]},
        {label:"Lung Parenchyma",fields:["Pulmonary infarction (peripheral wedge opacity)","Haemorrhage","Consolidation","Atelectasis"]},
        {label:"Other Findings",fields:["DVT evidence","Pleural effusion","Aortic incidental finding"]}
      ],
      "CT Chest — Pneumonia":[
        {label:"Technique",fields:["Contrast","Phase","Lung windows"]},
        {label:"Pattern of Infection",fields:["Lobar consolidation","Bronchopneumonia","Interstitial","Mixed pattern"]},
        {label:"Distribution",fields:["Right upper lobe","Right middle lobe","Right lower lobe","Left upper lobe","Lingula","Left lower lobe","Bilateral","Dependent distribution"]},
        {label:"Consolidation Features",fields:["Air bronchograms","Volume loss","Lobar expansion — Klebsiella","Cavitation"]},
        {label:"Pleural Disease",fields:["Parapneumonic effusion","Empyema features","Loculation","Pleural enhancement"]},
        {label:"Complications",fields:["Necrotising pneumonia","Lung abscess","Pneumatocele","Bronchopleural fistula","Pneumothorax"]},
        {label:"Lymph Nodes",fields:["Hilar lymphadenopathy","Mediastinal nodes","Size"]},
        {label:"Other",fields:["Pre-existing lung disease","Predisposing lesion","Endobronchial lesion"]}
      ],
      "CT Chest — COVID-19 / Viral Pneumonitis":[
        {label:"Technique",fields:["Non-contrast HRCT","Coverage"]},
        {label:"COVID-19 CT Severity",fields:["CORADS category (1–6)","CT Severity Score (0–25)","Total lung involvement (%)"]},
        {label:"Ground Glass Opacity (GGO)",fields:["Distribution — bilateral/unilateral","Lobes involved","GGO % per lobe","Peripheral/subpleural predominance","Posterior predominance"]},
        {label:"Consolidation",fields:["Distribution","Consolidation % per lobe","Crazy paving pattern","Reverse halo sign"]},
        {label:"Fibrotic Features",fields:["Reticulation","Traction bronchiectasis","Subpleural lines","Honeycombing"]},
        {label:"Other CT Features",fields:["Vascular thickening","Pleural effusion","Perilobular pattern","Air trapping"]},
        {label:"Complications",fields:["PE — thrombus","Superimposed bacterial infection","Pneumothorax","Pneumomediastinum"]},
        {label:"Comparison",fields:["Interval change from prior CT","Improvement/worsening/stable"]}
      ],
      "CT Chest — Lung Nodule / Cancer":[
        {label:"Technique",fields:["Low dose CT / diagnostic CT","Contrast","Slice thickness for nodule"]},
        {label:"Index Nodule",fields:["Location (lobe/segment)","Size — long axis (mm)","Size — short axis (mm)","Volume (mm³)","Morphology — solid/subsolid/GGO","Density (HU)"]},
        {label:"Nodule Characteristics",fields:["Margins — smooth/lobulated/spiculated","Pleural tethering","Cavitation","Calcification pattern","Satellite nodules","Air bronchogram"]},
        {label:"Primary Tumour — if confirmed",fields:["Size (T-stage)","Location relative to carina","Pleural invasion","Chest wall invasion","Vascular invasion","Mediastinal invasion"]},
        {label:"Lymph Nodes — Mediastinal",fields:["Station 2R/2L","Station 4R/4L","Station 7","Station 10R/10L","Size criteria (>10 mm SAX)","Morphology"]},
        {label:"Distant Thoracic Disease",fields:["Pleural effusion","Pleural nodules/metastases","Pericardial effusion","Bone metastases"]},
        {label:"Lung-RADS / Fleischner",fields:["Lung-RADS category","Fleischner recommendation","Follow-up interval"]},
        {label:"Other Nodules",fields:["Additional nodules — number","Largest additional nodule — size","Distribution pattern"]}
      ],
      "CT Chest — Pleural Empyema":[
        {label:"Technique",fields:["Contrast — portal venous phase"]},
        {label:"Pleural Collection",fields:["Side (right/left/bilateral)","Size / volume estimate","Density (HU — simple/complex)","Loculation — present/absent","Septations"]},
        {label:"Pleural Enhancement",fields:["Parietal pleural thickening/enhancement","Visceral pleural enhancement","Split pleura sign","Pleural rind"]},
        {label:"Air in Collection",fields:["Gas locules — pyopneumothorax","Gas-fluid levels","Bronchopleural fistula"]},
        {label:"Underlying Lung",fields:["Compressive atelectasis","Consolidation — underlying pneumonia","Lung abscess","Necrotising pneumonia"]},
        {label:"Mediastinal Shift",fields:["Direction","Degree","Inversion of diaphragm"]},
        {label:"Chest Wall",fields:["Empyema necessitans — chest wall extension","Rib destruction","Subcutaneous emphysema"]},
        {label:"Drain Position (if in-situ)",fields:["Intercostal drain position","Drain tip within collection","Residual collection"]}
      ],
      "CT Chest — Mediastinal Mass":[
        {label:"Technique",fields:["Contrast — pre and post"]},
        {label:"Location",fields:["Anterior mediastinum","Middle mediastinum","Posterior mediastinum","Superior mediastinum","Compartment (visceral/paravertebral)"]},
        {label:"Mass Characteristics",fields:["Size (cm — 3 planes)","Morphology — solid/cystic/mixed","Margins — well/ill-defined","Density HU pre-contrast","Enhancement HU post-contrast"]},
        {label:"Internal Features",fields:["Fat content","Calcification","Necrosis","Haemorrhage","Cystic change"]},
        {label:"Local Invasion",fields:["Pleural involvement","Pericardial involvement","Great vessel encasement","Chest wall invasion","Diaphragm"]},
        {label:"Lymph Nodes",fields:["Size","Stations involved","Enhancement","Necrosis"]},
        {label:"Vascular",fields:["SVC compression/thrombosis","Pulmonary arterial involvement","Azygos vein"]},
        {label:"Differential Diagnosis",fields:["Thymoma","Teratoma/GCT","Lymphoma","Thyroid goitre","Neurogenic tumour","Foregut cyst","Aortic aneurysm"]}
      ],
      "CT Aorta — Dissection":[
        {label:"Technique",fields:["ECG-gated if available","Arterial phase","Delayed phase"]},
        {label:"Dissection Type",fields:["Stanford type A (ascending)","Stanford type B (descending only)","DeBakey classification","Intramural haematoma","Penetrating aortic ulcer"]},
        {label:"Entry Tear",fields:["Location of primary entry tear","Size"]},
        {label:"True Lumen",fields:["True lumen — compressed/normal","True lumen HU (higher in arterial phase)"]},
        {label:"False Lumen",fields:["False lumen extent","False lumen — thrombosed/patent/partially thrombosed","False lumen HU"]},
        {label:"Extent of Dissection",fields:["Aortic root","Ascending aorta","Arch — branching vessels","Descending thoracic aorta","Abdominal aorta to iliac bifurcation"]},
        {label:"Branch Vessel Involvement",fields:["Coronary ostia","Innominate","Left common carotid","Left subclavian","Coeliac axis","SMA","Renal arteries","Iliac arteries"]},
        {label:"Complications",fields:["Aortic regurgitation","Pericardial haemorrhage","Pleural haemorrhage","End-organ ischaemia","Rupture features"]}
      ],
      "CT Aorta — Thoracic Aneurysm":[
        {label:"Technique",fields:["ECG-gated","Arterial phase","3D reconstruction"]},
        {label:"Aortic Root",fields:["Aortic root diameter (mm)","Sinuses of Valsalva","Sinotubular junction"]},
        {label:"Ascending Aorta",fields:["Max diameter (mm)","Length","Calcification","Thrombus"]},
        {label:"Aortic Arch",fields:["Arch diameter (mm)","Branching pattern","Arch anomaly — bovine/right-sided"]},
        {label:"Descending Thoracic Aorta",fields:["Max diameter (mm)","Location of max diameter","Length of aneurysm","Saccular vs fusiform","Intraluminal thrombus"]},
        {label:"Aortic Wall",fields:["Calcification pattern","Ulcer-like projection","Intramural haematoma","Penetrating ulcer"]},
        {label:"Relationship to Vessels",fields:["Brachiocephalic vessels","Intercostal vessels — critical","Left subclavian"]},
        {label:"Aneurysm Complications",fields:["Rupture — haemothorax/haemopericardium","Aorto-oesophageal fistula","Vertebral erosion"]}
      ],
      "CT Chest — ILD / Fibrosis (HRCT)":[
        {label:"Technique",fields:["HRCT protocol","Supine + prone if needed","Non-contrast"]},
        {label:"Predominant Pattern",fields:["Usual interstitial pneumonia (UIP)","Non-specific interstitial pneumonia (NSIP)","Organising pneumonia (OP)","Hypersensitivity pneumonitis (HP)","Sarcoidosis pattern","DIP/RBILD"]},
        {label:"Reticulation",fields:["Distribution — basal/upper/diffuse","Subpleural predominance","Intralobular lines"]},
        {label:"Ground Glass Opacity",fields:["Distribution","Extent","Predominance — temporal/spatial"]},
        {label:"Honeycombing",fields:["Present/absent","Distribution — subpleural basal","Extent (%)","Layers"]},
        {label:"Traction Bronchiectasis",fields:["Distribution","Severity — mild/moderate/severe"]},
        {label:"Other Features",fields:["Mosaic attenuation","Air trapping","Consolidation","Nodules — distribution"]},
        {label:"UIP Probability",fields:["Typical UIP pattern","Probable UIP","Indeterminate for UIP","Alternative diagnosis"]}
      ],
      "CT Chest — Lymphoma":[
        {label:"Technique",fields:["Contrast — portal venous phase"]},
        {label:"Mediastinal Nodes",fields:["Anterior mediastinum","Superior mediastinum — stations 1/2","Prevascular — station 3a","Precarinal — station 3p","Paratracheal — 2R/2L/4R/4L","Subcarinal — station 7","Hilar — 10R/10L"]},
        {label:"Nodal Bulk",fields:["Bulky disease (>10 cm)","Mass-like nodal conglomerate","Cross-sectional diameter"]},
        {label:"Nodal Characteristics",fields:["Size (SAX)","Enhancement pattern","Necrosis","Calcification (post-treatment)"]},
        {label:"Extranodal Thoracic",fields:["Lung parenchyma involvement","Pleural effusion","Pericardial effusion","Chest wall invasion","SVC obstruction"]},
        {label:"Thymus",fields:["Thymic enlargement","Thymic mass","Homogeneous vs heterogeneous"]},
        {label:"Pulmonary Involvement",fields:["Pulmonary nodules","Consolidation","Perilymphatic distribution","Lymphangitic spread"]},
        {label:"Response Assessment (if follow-up)",fields:["Deauville 5-point scale","Metabolic complete response","Partial response","Progressive disease"]}
      ],
      "CT Chest — Blunt Chest Trauma":[
        {label:"Technique",fields:["Trauma protocol — arterial phase","Venous phase","Scout"]},
        {label:"Ribs & Sternum",fields:["Rib fractures — number","Rib fractures — levels","Flail segment","Sternal fracture","Clavicle","Scapula"]},
        {label:"Pneumothorax",fields:["Right pneumothorax — size","Left pneumothorax","Tension pneumothorax features","Occult pneumothorax"]},
        {label:"Haemothorax",fields:["Right haemothorax — volume","Left haemothorax","Active haemorrhage"]},
        {label:"Pulmonary",fields:["Lung laceration — grade","Pulmonary contusion — distribution","Haematoma","Pneumatocele"]},
        {label:"Mediastinum",fields:["Mediastinal haemorrhage","Tracheobronchial injury","Oesophageal injury","Thymic haemorrhage"]},
        {label:"Aorta & Great Vessels",fields:["Aortic injury — grade (AAST I–IV)","Isthmus injury","Pericardial haemorrhage"]},
        {label:"Diaphragm",fields:["Right diaphragm integrity","Left diaphragm integrity","Diaphragmatic rupture","Herniation through defect"]}
      ],
      "CT Chest — Post Pneumonectomy / Lobectomy":[
        {label:"Technique",fields:["Contrast","Post-op day / interval from surgery"]},
        {label:"Operative Site",fields:["Pneumonectomy space — fluid level","Progressive obliteration expected","Shift of mediastinum","Space infection features"]},
        {label:"Bronchial Stump",fields:["Stump closure","Bronchopleural fistula features","Air in post-pneumonectomy space"]},
        {label:"Remaining Lung",fields:["Hyperinflation — compensatory","New lesion in remaining lung","Infection","Atelectasis"]},
        {label:"Pleural Space",fields:["Post-pneumonectomy collection","Empyema features","Thoracoscopy port sites"]},
        {label:"Mediastinal Shift",fields:["Expected shift post-pneumonectomy","Over/under-shift — complication?"]},
        {label:"Local Recurrence",fields:["Soft tissue at stump","Mediastinal nodal recurrence","New pleural disease"]},
        {label:"Other",fields:["Pericardial effusion","Contralateral lung disease","Bone metastases"]}
      ],
      "CT Chest — Bronchiectasis":[
        {label:"Technique",fields:["Inspiratory HRCT","Expiratory cuts for air trapping","Non-contrast"]},
        {label:"Bronchiectasis Type",fields:["Cylindrical (tubular)","Varicoid","Cystic (saccular)"]},
        {label:"Distribution",fields:["Bilateral / unilateral","Basal predominance","Upper lobe predominance","Central (allergic bronchopulmonary aspergillosis)","Diffuse"]},
        {label:"Lobes Involved",fields:["Right upper lobe","Right middle lobe","Right lower lobe","Left upper lobe","Lingula","Left lower lobe"]},
        {label:"Severity",fields:["Mild — localised","Moderate — lobar","Severe — bilateral widespread"]},
        {label:"Active Infection Features",fields:["Tree-in-bud","Mucus plugging","Consolidation","Endobronchial lesion"]},
        {label:"Air Trapping",fields:["Mosaic attenuation on expiratory cuts","Lobular air trapping"]},
        {label:"Cause Assessment",fields:["Post-infectious scarring","Cystic fibrosis pattern","Primary ciliary dyskinesia","ABPA — central","Traction — ILD"]}
      ],
      "CT Chest — Sarcoidosis":[
        {label:"Technique",fields:["HRCT / contrast for lymph nodes"]},
        {label:"Lymphadenopathy",fields:["Right paratracheal — 2R/4R","Left paratracheal — 2L/4L","Subcarinal — 7","Bilateral hilar — 10R/10L","Bilateral symmetrical hilar adenopathy (BHL)","Calcification — eggshell"]},
        {label:"Pulmonary Parenchyma",fields:["Perilymphatic nodules","Nodule distribution — peribronchovascular","Subpleural nodules","Fissural nodules","Galaxy sign","Conglomerate mass"]},
        {label:"Fibrosis",fields:["Upper lobe fibrosis","Perihilar fibrous bands","Traction bronchiectasis","Honeycombing — end-stage"]},
        {label:"Other Pulmonary",fields:["Ground glass opacity","Air trapping","Consolidation"]},
        {label:"Radiographic Stage",fields:["Stage 0 — normal","Stage I — BHL only","Stage II — BHL + parenchymal","Stage III — parenchymal only","Stage IV — fibrosis"]},
        {label:"Extrathoracic",fields:["Liver/spleen sarcoidosis","Abdominal nodes","Bone lesions"]}
      ],
      "CT Chest — Pulmonary Hypertension":[
        {label:"Technique",fields:["Contrast — CTPA protocol"]},
        {label:"Pulmonary Arteries",fields:["Main pulmonary artery diameter (mm)","Right PA diameter","Left PA diameter","PA to aorta ratio","Pruning of peripheral vessels"]},
        {label:"Right Heart",fields:["RV dilatation","RV:LV ratio","IV septal flattening","RV wall thickening","RA enlargement"]},
        {label:"Pericardium",fields:["Pericardial effusion — degree"]},
        {label:"IVC & Hepatic Veins",fields:["IVC diameter","Hepatic vein dilatation","Reflux of contrast"]},
        {label:"Pulmonary Cause",fields:["CTEPH — chronic thrombus in proximal PA","Web formation","Mosaicism — CTEPH","Parenchymal disease — ILD/COPD","Veno-occlusive disease features"]},
        {label:"Lungs",fields:["Interstitial changes","Centrilobular nodules","Ground glass","Airway disease"]},
        {label:"Other",fields:["Pleural effusion","Mediastinal disease","Lymph nodes"]}
      ],
      "CT Chest — Pericardial Disease":[
        {label:"Technique",fields:["ECG-gated if available","Contrast — pre and post"]},
        {label:"Pericardial Effusion",fields:["Size — small/moderate/large","Circumferential vs loculated","Density (HU — transudative/exudative/haemorrhagic)","Haemopericardium"]},
        {label:"Tamponade Features",fields:["RV compression","RA compression","IVC dilatation","SVC dilatation"]},
        {label:"Pericardial Thickening",fields:["Thickness (mm)","Distribution","Calcification"]},
        {label:"Constrictive Pericarditis",fields:["Pericardial thickening >4 mm","Calcification","Diastolic dysfunction features","Tubular RV shape","Conical LV","IVC dilatation","Hepatic vein dilatation"]},
        {label:"Pericardial Mass",fields:["Location","Size","Enhancement","Cystic vs solid"]},
        {label:"Underlying Cause",fields:["Post-cardiac surgery","Malignant — pericardial metastases","Inflammatory/infective","Post-radiation","Dressler syndrome"]}
      ],
      "CT Chest — Diaphragmatic Hernia":[
        {label:"Technique",fields:["Contrast — portal venous phase","Coronal reformats"]},
        {label:"Hernia Type",fields:["Hiatus hernia","Bochdalek hernia (posterior)","Morgagni hernia (anterior right)","Traumatic diaphragmatic rupture"]},
        {label:"Hiatus Hernia",fields:["Type I — sliding","Type II — paraesophageal","Type III — mixed","Type IV — intrathoracic stomach","Size of defect"]},
        {label:"Contents",fields:["Stomach","Small bowel","Large bowel","Omentum","Liver (rare)","Spleen (rare)"]},
        {label:"Diaphragm Integrity",fields:["Right hemidiaphragm","Left hemidiaphragm","Defect size (cm)","Collar sign"]},
        {label:"Complications",fields:["Obstruction","Strangulation features","Ischaemia","Perforation"]},
        {label:"Mediastinal Shift",fields:["Degree","Direction"]}
      ],
      "CT Chest — Oesophageal Pathology":[
        {label:"Technique",fields:["Oral contrast if possible","Arterial and venous phase"]},
        {label:"Oesophageal Wall",fields:["Wall thickness (mm)","Length of abnormality","Circumferential vs eccentric","Enhancement"]},
        {label:"Tumour (if present)",fields:["Location — upper/mid/lower third","Size","T-stage (T1–T4)","Adventitia invasion","Surrounding fat"]},
        {label:"Peritumoral Invasion",fields:["Tracheal/bronchial invasion","Aortic invasion","Pericardial invasion","Spinal invasion"]},
        {label:"Lymph Nodes",fields:["Peritumoural","Mediastinal stations","Coeliac nodes","Abdominal nodes"]},
        {label:"Oesophageal Perforation",fields:["Mediastinitis features","Air in mediastinum","Pleural effusion","Abscess"]},
        {label:"Achalasia Features",fields:["Dilated oesophagus","Air-fluid level","No passage of contrast"]},
        {label:"Other",fields:["Hiatus hernia","Varices","Diverticulum"]}
      ],
      "CT Chest — Rib Fractures":[
        {label:"Technique",fields:["Bone windows","3D rib reconstruction","Trauma protocol"]},
        {label:"Rib Fractures",fields:["Total number of fractured ribs","Right-sided ribs — levels","Left-sided ribs — levels","Bilateral ribs"]},
        {label:"Flail Segment",fields:["Present/absent","Location","Number of segments (anterior + posterior fracture same rib)"]},
        {label:"Fracture Characteristics",fields:["Displaced vs non-displaced","Comminuted","Inward displacement"]},
        {label:"Pneumothorax",fields:["Right","Left","Tension features"]},
        {label:"Haemothorax",fields:["Right — volume estimate","Left — volume estimate"]},
        {label:"Pulmonary Contusion",fields:["Location","Extent"]},
        {label:"Other Bony Injury",fields:["Clavicle","Sternum","Scapula","Thoracic spine"]},
        {label:"Soft Tissues",fields:["Subcutaneous emphysema","Soft tissue haematoma"]}
      ],
      "CT Chest — Pleural Mesothelioma":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Pleural Disease",fields:["Circumferential pleural thickening","Nodular pleural thickening","Pleural rind","Mediastinal pleural involvement","Diaphragmatic pleural involvement"]},
        {label:"Pleural Effusion",fields:["Present/absent","Volume","Encasement effusion"]},
        {label:"Tumour Extent",fields:["TNM T-stage","Parietal pleura","Visceral pleura","Pericardial involvement","Diaphragm","Chest wall invasion","Intercostal space"]},
        {label:"Lymph Nodes",fields:["N-stage","Ipsilateral bronchopulmonary nodes","Mediastinal nodes","Contralateral nodes"]},
        {label:"Distant Metastases",fields:["Abdominal implants","Contralateral chest","Bone"]},
        {label:"Underlying Lung",fields:["Compressive atelectasis","Lung volume loss","Trapped lung"]},
        {label:"Asbestos Exposure Features",fields:["Pleural plaques — bilateral","Calcified plaques","Asbestosis features"]}
      ],
      "CT Chest — Tracheobronchial Pathology":[
        {label:"Technique",fields:["Inspiration + expiration","Multiplanar reformats","Virtual bronchoscopy"]},
        {label:"Trachea",fields:["Lumen diameter","Shape — saber-sheath/coronal widening","Tracheomalacia features","Subglottic narrowing","Tracheal deviation"]},
        {label:"Tracheal Lesion (if present)",fields:["Location (mm from carina)","Size","Morphology","Circumferential vs focal"]},
        {label:"Main Bronchi",fields:["Right main bronchus","Left main bronchus","Carina angle","Endobronchial lesion"]},
        {label:"Lobar Bronchi",fields:["Right upper lobe bronchus","Right middle lobe bronchus","Right lower lobe bronchus","Left upper lobe bronchus","Lingular bronchus","Left lower lobe bronchus"]},
        {label:"Airway Narrowing",fields:["Level","Degree of narrowing (%)","Intrinsic vs extrinsic","Dynamic collapse on expiratory imaging"]},
        {label:"Post-Intubation Changes",fields:["Subglottic tracheal stenosis","Length of narrowing","Tracheomalacia at cuff site"]},
        {label:"Calcification",fields:["Tracheobronchopathia osteochondroplastica","Endobronchial cartilage"]}
      ],
      "CT Chest — Spontaneous Pneumothorax":[
        {label:"Technique",fields:["Non-contrast CT","Supine + decubitus if needed"]},
        {label:"Pneumothorax",fields:["Side (right/left/bilateral)","Size — small (<20%)/moderate/large","Complete collapse","Tension features"]},
        {label:"Underlying Cause",fields:["Subpleural blebs — location/number/size","Bullae","Emphysema","Marfan features","Lymphangioleiomyomatosis","Endometriosis (catamenial)"]},
        {label:"Lung Parenchyma",fields:["Underlying lung disease","Collapsed lung appearance","Re-expansion oedema risk"]},
        {label:"Pleural Space",fields:["Pneumothorax extent (%)","Haemothorax component"]},
        {label:"Mediastinal Shift",fields:["Degree — mild/moderate/significant"]},
        {label:"Drain Position (if in-situ)",fields:["Intercostal drain tip position","Residual pneumothorax"]}
      ],
      "CT Chest — Lung Transplant Follow-up":[
        {label:"Technique",fields:["HRCT / CT with contrast"]},
        {label:"Transplanted Lung",fields:["Side (single/bilateral)","Overall parenchymal appearance","Surgical anastomoses"]},
        {label:"Primary Graft Dysfunction",fields:["GGO pattern","Consolidation","Timing post-transplant"]},
        {label:"Acute Rejection",fields:["New GGO or consolidation","Septal thickening","Pleural effusion"]},
        {label:"Chronic Allograft Dysfunction",fields:["BOS — bronchiolitis obliterans pattern","Air trapping on expiratory CT","Bronchiectasis (new)","Constrictive bronchiolitis features"]},
        {label:"Infection",fields:["Aspergillus — halo sign/cavity","Bacterial consolidation","CMV — GGO/nodules","PCP — diffuse GGO"]},
        {label:"PTLD (Post-Transplant Lymphoproliferative Disease)",fields:["Nodules","Lymphadenopathy","Peri-transplant masses"]},
        {label:"Anastomotic Site",fields:["Bronchial anastomosis","Vascular anastomosis — pulmonary artery/vein","Stenosis"]},
        {label:"Native Lung (Single Transplant)",fields:["Native lung hyperinflation","Native lung disease progression"]}
      ],
      "CT Chest — Empyema Necessitans":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Pleural Collection",fields:["Side","Volume","Density (HU)","Loculation","Gas within collection"]},
        {label:"Chest Wall Extension",fields:["Track through chest wall muscles","Subcutaneous component","Skin involvement","Rib erosion/destruction"]},
        {label:"Pleural Enhancement",fields:["Split pleura sign","Parietal pleural enhancement","Visceral pleural enhancement"]},
        {label:"Underlying Lung",fields:["Pneumonia — causative","Tuberculosis features","Necrotising infection","Lung abscess"]},
        {label:"Bony Involvement",fields:["Rib erosion","Rib periostitis","Vertebral involvement — rare"]},
        {label:"Drainage Assessment",fields:["Drain in-situ position","Residual collection","Post-drainage change"]}
      ],
      "Abdomen & Pelvis":[
        {label:"Technique",fields:["Contrast","Phase","Oral contrast"]},
        {label:"Liver",fields:["Size","Attenuation","Focal lesions","Biliary dilatation","Vascular"]},
        {label:"Gallbladder & Bile Ducts",fields:["Gallstones","Wall","CBD diameter","Pneumobilia"]},
        {label:"Pancreas",fields:["Size","Enhancement","Duct","Peripancreatic fat"]},
        {label:"Spleen",fields:["Size","Attenuation","Focal lesions"]},
        {label:"Adrenals",fields:["Right adrenal","Left adrenal","HU / washout"]},
        {label:"Kidneys & Ureters",fields:["Right kidney","Left kidney","Calculi","Hydronephrosis","Enhancement"]},
        {label:"Bowel",fields:["Small bowel","Large bowel","Wall thickening","Obstruction"]},
        {label:"Mesentery & Omentum",fields:["Mesenteric stranding","Omental cake","Free fluid"]},
        {label:"Vessels",fields:["Aorta diameter","Aneurysm","IVC","Portal vein"]},
        {label:"Lymph Nodes",fields:["Retroperitoneal","Mesenteric","Pelvic"]},
        {label:"Pelvis",fields:["Bladder","Uterus/Prostate","Ovaries/Seminal vesicles","Rectum"]},
        {label:"Bones",fields:["Spine","Pelvis","Lytic/sclerotic lesions"]}
      ],
      "CT Abdomen — Acute Appendicitis":[
        {label:"Technique",fields:["Contrast phase","Coverage — limited to RIF or full abdomen"]},
        {label:"Appendix",fields:["Visualised (yes/no)","Location (retrocaecal/pelvic/pre-ileal)","Max outer diameter (mm)","Length (cm)","Compressibility — not applicable on CT"]},
        {label:"Appendix Characteristics",fields:["Wall thickening","Enhancement — periappendiceal","Target sign","Blind-ending tubular structure"]},
        {label:"Appendicolith",fields:["Present/absent","Location (at lumen or tip)","Size (mm)","Obstruction"]},
        {label:"Periappendiceal Changes",fields:["Fat stranding — severity","Free fluid in RIF","Inflammatory phlegmon"]},
        {label:"Perforation Signs",fields:["Discontinuity of appendiceal wall","Extraluminal air","Extraluminal appendicolith","Abscess formation","Generalised peritonitis"]},
        {label:"Differential Diagnosis",fields:["Normal appendix — alternative cause","Meckel's diverticulitis","Terminal ileitis — Crohn's","Mesenteric adenitis","Ovarian pathology — females"]},
        {label:"Alvarado / Clinical Score",fields:["CT findings support appendicitis","CT equivocal — clinical management","CT negative"]}
      ],
      "CT Abdomen — Bowel Obstruction":[
        {label:"Technique",fields:["Contrast — venous phase","Prone images if needed"]},
        {label:"Level of Obstruction",fields:["Small bowel — high/low","Large bowel","Ileocaecal junction"]},
        {label:"Transition Point",fields:["Location","Cause at transition point"]},
        {label:"Proximal Bowel Dilatation",fields:["Small bowel — max diameter (mm)","Large bowel — max diameter (mm)","Extent of dilatation","Fluid-filled loops"]},
        {label:"Cause",fields:["Adhesion — no visible lead point","Hernia — type/location","Tumour","Volvulus","Intussusception","Gallstone ileus","Bezoar"]},
        {label:"Strangulation / Ischaemia",fields:["Closed loop obstruction","Ischaemic wall features — reduced enhancement/pneumatosis","Mesenteric vascular compromise","Portomesenteric gas"]},
        {label:"Perforation",fields:["Pneumoperitoneum","Free fluid","Peritonitis features"]},
        {label:"Distal Bowel",fields:["Decompressed distal bowel","Contents"]}
      ],
      "CT Abdomen — Acute Pancreatitis":[
        {label:"Technique",fields:["Contrast — pancreatic and portal phase","CT Severity Index (CTSI)"]},
        {label:"Pancreas Inflammation",fields:["Gland enlargement","Parenchymal oedema","Peripancreatic fat stranding","Peripancreatic fluid"]},
        {label:"Pancreatic Necrosis",fields:["Non-enhancing parenchyma","Extent (%) — head/body/tail/total","Necrosis HU","Infected necrosis features (gas)"]},
        {label:"Peri-Pancreatic Collections",fields:["Acute peripancreatic fluid collection (APFC)","Acute necrotic collection (ANC)","Pseudocyst — 4+ weeks","Walled-off necrosis (WON) — 4+ weeks"]},
        {label:"Collections Details",fields:["Location","Size (cm)","Density","Gas — infected?","Communication with duct"]},
        {label:"Pancreatic Duct",fields:["Diameter (mm)","Disruption","Disconnected duct syndrome"]},
        {label:"Vascular Complications",fields:["Splenic vein thrombosis","Portal vein thrombosis","SMV thrombosis","Pseudoaneurysm"]},
        {label:"CTSI Score",fields:["Balthazar grade (A–E)","Necrosis score","CTSI total (0–10)"]},
        {label:"Other",fields:["Gallstones — aetiology","Biliary dilatation","Ascites","Pleural effusion"]}
      ],
      "CT Abdomen — Liver Cirrhosis":[
        {label:"Technique",fields:["Triphasic contrast — arterial / portal venous / equilibrium"]},
        {label:"Liver Morphology",fields:["Size","Surface contour — nodular/smooth","Right lobe atrophy","Left lobe hypertrophy","Caudate lobe hypertrophy"]},
        {label:"Liver Parenchyma",fields:["Heterogeneous enhancement","Regenerative nodules","Dysplastic nodules","HCC features"]},
        {label:"Portal Hypertension",fields:["Portal vein diameter (mm)","Portosystemic collaterals","Recanalized paraumbilical vein","Oesophageal varices","Splenic varices","Gastric varices","Mesenteric varices"]},
        {label:"Splenomegaly",fields:["Splenic size (cm)","Splenic varices","Splenic infarction"]},
        {label:"Ascites",fields:["None/trace/small/moderate/large","Distribution"]},
        {label:"Hepatic Artery",fields:["Hepatic artery — enlarged in cirrhosis","HA to portal vein ratio"]},
        {label:"Biliary",fields:["Intrahepatic biliary dilatation","CBD diameter"]},
        {label:"HCC Surveillance",fields:["No HCC feature","LIRADS 1–5","Treatment response assessment"]}
      ],
      "CT Abdomen — Renal Colic / Urolithiasis":[
        {label:"Technique",fields:["Non-contrast CT KUB","Low dose protocol"]},
        {label:"Right Urinary Tract",fields:["Right renal calculi — location/size (mm)/density (HU)","Right ureteric calculus — level","Right ureterovesical junction","Right hydronephrosis grade","Right perinephric stranding"]},
        {label:"Left Urinary Tract",fields:["Left renal calculi — location/size (mm)/density (HU)","Left ureteric calculus — level","Left ureterovesical junction","Left hydronephrosis grade","Left perinephric stranding"]},
        {label:"Calculus Characterisation",fields:["Size (mm) — largest dimension","HU attenuation","Composition estimate (uric acid vs calcium)","Surface — smooth/spiculated"]},
        {label:"Obstructive Features",fields:["Hydronephrosis grade","Hydroureter","Perinephric fat stranding","Renal enlargement"]},
        {label:"Bladder",fields:["Bladder calculi","Bladder wall","Intravesical stone"]},
        {label:"Incidental Findings",fields:["Abdominal aortic aneurysm","Appendicitis features","Other visceral pathology"]},
        {label:"Treatment Planning",fields:["SWL suitability","URS suitability","PCNL suitability","Stone burden score"]}
      ],
      "CT Abdomen — Abdominal Trauma":[
        {label:"Technique",fields:["Trauma CT — arterial + venous phases","FAST correlation"]},
        {label:"Liver",fields:["Laceration — AAST grade (I–VI)","Laceration depth","Active haemorrhage — blush","Haematoma — subcapsular/parenchymal","Biliary injury"]},
        {label:"Spleen",fields:["Laceration — AAST grade (I–V)","Active haemorrhage","Perisplenic haematoma","Devascularisation","Pseudoaneurysm"]},
        {label:"Pancreas",fields:["Laceration grade","Ductal injury","Peripancreatic haematoma","Retroperitoneal haemorrhage"]},
        {label:"Kidneys",fields:["Right renal injury — AAST grade","Left renal injury — AAST grade","Perinephric haematoma","Urinary extravasation","Vascular injury"]},
        {label:"Mesentery & Bowel",fields:["Mesenteric haematoma","Bowel wall injury","Perforation","Pneumoperitoneum"]},
        {label:"Bladder & Urethra",fields:["Bladder rupture — intraperitoneal/extraperitoneal","Contrast extravasation","Pelvic ring fracture"]},
        {label:"Vessels",fields:["Aortic injury","IVC injury","Mesenteric vessel injury","Active haemorrhage — site"]},
        {label:"Free Fluid",fields:["Location","Volume estimate","Density — haemorrhage vs serous"]}
      ],
      "CT Abdomen — Aortic Aneurysm (AAA)":[
        {label:"Technique",fields:["Arterial phase + venous phase","3D reconstruction"]},
        {label:"Aneurysm",fields:["Maximum diameter (mm) — outer wall to outer wall","Anteroposterior diameter","Transverse diameter","Length (cm)"]},
        {label:"Aortic Wall",fields:["Intraluminal thrombus — thickness","Calcification","Ulcer-like projection","Intramural haematoma"]},
        {label:"Proximal Neck",fields:["Length (mm)","Diameter (mm)","Angulation (degrees)","Calcification/thrombus at neck","Infrarenal vs juxta/pararenal"]},
        {label:"Iliac Arteries",fields:["Right common iliac — diameter","Left common iliac — diameter","Right iliac aneurysm","Left iliac aneurysm","Iliac occlusive disease"]},
        {label:"Rupture Signs",fields:["Retroperitoneal haematoma","Periaortic fat stranding","High-attenuation crescent in thrombus","Hyperattenuating crescent sign","Free intraperitoneal blood"]},
        {label:"Endograft (if present)",fields:["Endograft position","Endoleak type (I–V)","Sac change from prior","Limb patency"]},
        {label:"Visceral Vessels",fields:["Coeliac origin","SMA origin","Renal arteries — involvement"]}
      ],
      "CT Abdomen — Mesenteric Ischaemia":[
        {label:"Technique",fields:["Arterial + venous + delayed phases","CTA mesenteric vessels"]},
        {label:"Mesenteric Vessels",fields:["Superior mesenteric artery — patency","SMA — embolus/thrombus location","Superior mesenteric vein — patency","SMV thrombosis extent","Inferior mesenteric artery"]},
        {label:"Ischaemic Bowel",fields:["Location — small bowel/colon","Length of involvement","Wall thickening vs thin (paper thin)","Enhancement — absent/reduced/normal"]},
        {label:"Bowel Wall Signs",fields:["Pneumatosis intestinalis — location","Portal venous gas","Mesenteric gas"]},
        {label:"Free Fluid & Peritonitis",fields:["Free fluid","Peritoneal enhancement","Omental stranding"]},
        {label:"Aetiology",fields:["Arterial occlusion — embolus vs thrombus","Venous thrombosis","Non-occlusive ischaemia (NOMI) — small calibre vessels","Strangulation"]},
        {label:"Coeliac & IMA",fields:["Coeliac axis — patency","IMA — patency","Collateral vessels"]}
      ],
      "CT Abdomen — Perforated Viscus":[
        {label:"Technique",fields:["Contrast — venous phase","Oral contrast if tolerated"]},
        {label:"Free Gas",fields:["Pneumoperitoneum — amount","Subdiaphragmatic gas","Gas distribution","Retroperitoneal gas"]},
        {label:"Perforation Site",fields:["Gastric perforation","Duodenal perforation","Small bowel perforation","Colonic perforation","Appendix perforation"]},
        {label:"Localising Features",fields:["Adjacent fat stranding","Focal fluid","Wall defect","Extraluminal contrast"]},
        {label:"Peritonitis Extent",fields:["Localised peritonitis","Generalised peritonitis","Free fluid — distribution and volume"]},
        {label:"Underlying Cause",fields:["Peptic ulcer disease — gastric/duodenal","Diverticular perforation","Tumour perforation","Ischaemic perforation","Trauma"]},
        {label:"Abscess",fields:["Present/absent","Location","Size","Organised vs phlegmon"]}
      ],
      "CT Abdomen — Acute Diverticulitis":[
        {label:"Technique",fields:["Contrast — portal venous phase"]},
        {label:"Diverticula",fields:["Location — sigmoid/descending/other","Number of diverticula","Size"]},
        {label:"Inflammation",fields:["Pericolic fat stranding — extent","Colonic wall thickening","Pericolonic fluid"]},
        {label:"Complication",fields:["Pericolic abscess","Mesorectal abscess","Peritonitis (generalised)","Fistula — colovesical/colovaginal/cutaneous","Perforation","Stricture"]},
        {label:"Hinchey Classification",fields:["Stage I — pericolic abscess","Stage II — distant abscess","Stage III — purulent peritonitis","Stage IV — faecal peritonitis"]},
        {label:"Bladder",fields:["Gas in bladder — colovesical fistula","Bladder wall thickening","Bladder deformity"]},
        {label:"Drainable Collection",fields:["Size (cm)","Location","Safe drainage window"]},
        {label:"Differential Diagnosis",fields:["Colorectal carcinoma — cannot exclude","Ischaemic colitis","Crohn's colitis"]}
      ],
      "CT Abdomen — Crohn's Disease":[
        {label:"Technique",fields:["Enterography protocol — CTE","Neutral oral contrast","Arterial + venous phases"]},
        {label:"Active Disease — Bowel",fields:["Location (terminal ileum/colon/other)","Length of involved segment","Wall thickness (mm)","Wall enhancement — mural stratification","Target sign — mucosal hyperenhancement"]},
        {label:"Active Inflammation Features",fields:["Mesenteric fat stranding","Mesenteric hypervascularity — comb sign","Reactive lymph nodes","Mesenteric creeping fat"]},
        {label:"Stricture",fields:["Location","Length","Prestenotic dilatation","Fibrofatty proliferation"]},
        {label:"Fistula",fields:["Enteroenteric fistula","Enterocutaneous fistula","Enterovesical fistula","Fistula tract — sinus tract"]},
        {label:"Abscess",fields:["Location","Size (cm)","Drainable vs not"]},
        {label:"Perianal Disease",fields:["Perianal fistula","Perianal abscess","Fistula classification — simple/complex"]},
        {label:"Inactive Disease",fields:["Fatty submucosal deposition","Bowel wall thickening — non-enhancing","Stricture without upstream dilatation"]},
        {label:"Extraintestinal",fields:["Sacroiliac joint changes","Sclerosing cholangitis features","Gallstones"]}
      ],
      "CT Abdomen — Colorectal Cancer Staging":[
        {label:"Technique",fields:["Portal venous phase — liver","Arterial phase if needed"]},
        {label:"Primary Tumour",fields:["Location (caecum/ascending/transverse/descending/sigmoid/rectum)","Morphology — annular/polypoid/ulcerating","Length of involvement (cm)","T-stage assessment"]},
        {label:"T-Stage",fields:["T1/T2 — intramural","T3 — through muscularis propria into pericolorectal fat","T4a — visceral peritoneum","T4b — adjacent organ invasion"]},
        {label:"Lymph Nodes",fields:["Regional nodes — size","N-stage (N0/N1a/N1b/N2a/N2b)","Extramural vascular invasion (EMVI)","Peritumoural deposits"]},
        {label:"Liver Metastases",fields:["Present/absent","Number","Size — largest","Bilobar/unilobar","Resectability assessment"]},
        {label:"Peritoneal Disease",fields:["Peritoneal implants","Omental cake","Ascites","Peritoneal carcinomatosis index"]},
        {label:"Other Metastases",fields:["Lung metastases","Adrenal","Bone","Para-aortic nodes"]},
        {label:"TNM Stage",fields:["T","N","M","Overall stage (I–IV)"]}
      ],
      "CT Abdomen — Liver Lesion Characterisation":[
        {label:"Technique",fields:["Triphasic — arterial/portal venous/delayed","Pre-contrast"]},
        {label:"Lesion",fields:["Location — segment","Size (cm — 3 planes)","Number","Morphology — round/lobulated/infiltrative","Pre-contrast HU"]},
        {label:"Enhancement Pattern",fields:["Arterial phase HU","Portal venous phase HU","Delayed phase HU","Washout appearance","Capsule enhancement — delayed"]},
        {label:"Internal Features",fields:["Calcification","Fat — India ink on CT","Haemorrhage","Septations","Central scar"]},
        {label:"LI-RADS (if cirrhosis)",fields:["LI-RADS category (LR-1 to LR-5)","Observation size","Major features","Ancillary features"]},
        {label:"Differential Diagnosis",fields:["HCC — arterial enhancement + washout","Haemangioma — peripheral nodular enhancement","FNH — central scar + iso on delayed","Adenoma — fat-containing","Metastasis — rim enhancement","Abscess — rim + satellite"]},
        {label:"Background Liver",fields:["Cirrhosis features","Steatosis — attenuation","Background lesions"]}
      ],
      "CT Abdomen — Renal Mass Characterisation":[
        {label:"Technique",fields:["Nephrographic phase + excretory phase","Pre-contrast essential"]},
        {label:"Mass",fields:["Location — right/left, upper/mid/lower pole","Size (cm — 3 planes)","Endophytic/exophytic/mixed","Pre-contrast HU"]},
        {label:"Enhancement",fields:["Pre-contrast HU","Corticomedullary phase HU","Nephrographic phase HU","Enhancement difference (ΔHU > 20 = enhancing)"]},
        {label:"Bosniak Classification (cysts)",fields:["Bosniak I — simple anechoic","Bosniak II — thin septa","Bosniak IIF — follow-up","Bosniak III — indeterminate","Bosniak IV — enhancing solid"]},
        {label:"Solid Mass Features",fields:["RCC — clear cell (avid enhancement)","RCC — papillary (hypovascular)","RCC — chromophobe","Angiomyolipoma — fat HU (<-10)","Urothelial carcinoma"]},
        {label:"Local Staging",fields:["Perinephric fat invasion","Renal sinus involvement","Renal vein/IVC thrombus","Adrenal involvement","T-stage"]},
        {label:"Lymph Nodes",fields:["Regional nodes","Para-aortic nodes"]},
        {label:"Distant Disease",fields:["Lung","Liver","Bone","Adrenal"]}
      ],
      "CT Abdomen — Adrenal Lesion":[
        {label:"Technique",fields:["Non-contrast + contrast","Delayed washout at 15 min"]},
        {label:"Lesion",fields:["Side — right/left","Size (cm — 3 planes)","Shape — round/oval/irregular","Margins — smooth/irregular"]},
        {label:"Non-contrast HU",fields:["HU value","Lipid-rich adenoma if <10 HU","Lipid-poor if 10–30 HU","Suspicious if >30 HU"]},
        {label:"Washout Calculation",fields:["Absolute percentage washout (APW): (Enhanced – Delayed)/(Enhanced – Unenhanced) × 100","APW ≥60% — adenoma","Relative percentage washout (RPW)","RPW ≥40% — adenoma"]},
        {label:"Other Adrenal Features",fields:["Calcification","Haemorrhage","Cystic change","Fatty component"]},
        {label:"Differential Diagnosis",fields:["Lipid-rich adenoma — benign","Lipid-poor adenoma — washout adenoma","Phaeochromocytoma — hypervascular","Myelolipoma — macroscopic fat","Adrenal cyst","Metastasis — non-washout","Adrenocortical carcinoma — large/irregular"]},
        {label:"Contralateral Adrenal",fields:["Normal","Lesion"]},
        {label:"Recommendation",fields:["No further imaging — adenoma","Follow-up CT in 12 months","MRI chemical shift","Adrenal biopsy (if appropriate primary)"]}
      ],
      "CT Abdomen — Acute Cholecystitis":[
        {label:"Technique",fields:["Portal venous phase"]},
        {label:"Gallbladder",fields:["Distension — size (cm)","Wall thickening (mm)","Wall enhancement (pericholecystic enhancement)","Pericholecystic fat stranding","Pericholecystic fluid"]},
        {label:"Calculi",fields:["Present/absent","Number","Impacted at neck/cystic duct","Gallbladder neck impaction"]},
        {label:"Complications",fields:["Gangrenous cholecystitis — focal wall defect","Perforation — bile leak","Emphysematous cholecystitis — gas in wall/lumen","Pericholecystic abscess","Mirizzi syndrome — external CBD compression"]},
        {label:"Biliary",fields:["CBD diameter","CBD calculi","Biliary dilatation","Pneumobilia"]},
        {label:"Adjacent Structures",fields:["Hepatic parenchymal inflammation","Duodenal involvement","Right colonic wall"]},
        {label:"Acalculous Cholecystitis",fields:["No calculi identified","Risk factors — ICU/post-op/trauma"]}
      ],
      "CT Abdomen — Post Bowel Surgery":[
        {label:"Technique",fields:["Contrast — venous phase","Oral contrast if tolerated"]},
        {label:"Anastomosis",fields:["Location","Integrity — no leak","Anastomotic leak — contrast extravasation","Anastomotic stricture"]},
        {label:"Post-Operative Collections",fields:["Location","Size","Contents — fluid/gas/debris","Abscess features","Communication with bowel"]},
        {label:"Bowel",fields:["Dilated loops — ileus vs obstruction","Anastomotic site patency","Adhesion obstruction","Mesenteric ischaemia"]},
        {label:"Surgical Site",fields:["Wound integrity","Port site hernia","Surgical clips","Drain position"]},
        {label:"Expected Post-Op Changes",fields:["Small volume free fluid","Post-surgical pneumoperitoneum — expected decrease","Mesenteric oedema"]},
        {label:"Complications",fields:["Anastomotic leak","Internal hernia","Bowel obstruction","Haemorrhage","Deep vein thrombosis"]},
        {label:"Stoma (if present)",fields:["Stoma type","Peristomal hernia","Stoma loop configuration"]}
      ],
      "CT Abdomen — Abdominal Wall Hernia":[
        {label:"Technique",fields:["Contrast — venous phase","Valsalva manoeuvre if tolerated"]},
        {label:"Hernia Type",fields:["Inguinal — direct/indirect","Femoral","Umbilical","Paraumbilical","Incisional","Epigastric","Spigelian","Lumbar","Obturator"]},
        {label:"Hernia Details",fields:["Side — right/left/bilateral","Defect size (cm)","Sac size (cm)"]},
        {label:"Contents",fields:["Omentum only","Bowel — small/large","Bladder","Peritoneal fat","Contents list"]},
        {label:"Complication",fields:["Reducible","Irreducible/incarcerated","Strangulated — ischaemic bowel","Obstruction"]},
        {label:"Inguinal Hernia Specific",fields:["Relationship to inferior epigastric vessels","Indirect — lateral to vessels","Direct — medial to vessels","Cord / gonadal vessels"]},
        {label:"Recurrence (if post-repair)",fields:["Mesh position","Mesh hernia","Seroma around mesh"]}
      ],
      "CT Abdomen — Splenic Pathology":[
        {label:"Technique",fields:["Arterial + venous phases"]},
        {label:"Splenic Size",fields:["Measurement (cm — craniocaudal)","Splenomegaly — grade","Accessory spleen"]},
        {label:"Focal Lesion",fields:["Number — solitary/multiple","Size — largest (cm)","Enhancement pattern","Pre-contrast HU","Cystic vs solid"]},
        {label:"Splenic Infarction",fields:["Wedge-shaped hypodensity","Geographic infarction","Splenic artery status"]},
        {label:"Trauma",fields:["Laceration grade — AAST (I–V)","Subcapsular haematoma","Perisplenic haematoma","Active haemorrhage","Splenic pseudoaneurysm"]},
        {label:"Splenic Cyst",fields:["Simple cyst — thin wall","Epidermoid cyst","Hydatid cyst","Post-traumatic cyst"]},
        {label:"Lymphoma",fields:["Homogeneous enlargement","Focal deposits","Associated lymphadenopathy"]},
        {label:"Vascular",fields:["Splenic artery aneurysm","Splenic vein thrombosis","Portal hypertension features"]}
      ],
      "CT Abdomen — Retroperitoneal Mass":[
        {label:"Technique",fields:["Arterial + venous phases"]},
        {label:"Mass Location",fields:["Retroperitoneal space","Para-aortic","Paracaval","Bilateral retroperitoneal","Primary retroperitoneal"]},
        {label:"Mass Characteristics",fields:["Size (cm — 3 planes)","Morphology — lobulated/ill-defined","Pre-contrast HU","Enhancement pattern"]},
        {label:"Internal Features",fields:["Fat component","Calcification","Necrosis","Haemorrhage","Cystic change"]},
        {label:"Vessel Involvement",fields:["Aortic displacement/encasement","IVC involvement/thrombosis","Renal vein","Iliac vessels"]},
        {label:"Organ Involvement",fields:["Kidneys — displacement/invasion","Pancreas","Duodenum","Psoas muscle"]},
        {label:"Lymph Nodes",fields:["Conglomerate retroperitoneal nodes","Para-aortic","Paracaval","Iliac"]},
        {label:"Differential Diagnosis",fields:["Retroperitoneal sarcoma — liposarcoma/leiomyosarcoma","Lymphoma","Metastatic nodes","Retroperitoneal fibrosis","Neurogenic tumour","Germ cell tumour"]}
      ],
      "CT Abdomen — Lymphoma Staging":[
        {label:"Technique",fields:["Portal venous phase"]},
        {label:"Abdominal Lymph Nodes",fields:["Para-aortic nodes — size (SAX mm)","Paracaval nodes","Mesenteric nodes","Hepatic hilar","Splenic hilar","Coeliac axis nodes","Iliac nodes (external/internal/common)"]},
        {label:"Nodal Bulk",fields:["Bulky disease ≥10 cm","Conglomerate mass"]},
        {label:"Nodal Characteristics",fields:["Enhancement","Necrosis — T-cell/follicular lymphoma","Calcification — post treatment"]},
        {label:"Spleen",fields:["Size (cm)","Focal splenic deposits","Diffuse enlargement"]},
        {label:"Liver",fields:["Size","Focal hepatic deposits","Diffuse infiltration"]},
        {label:"GI Tract",fields:["Gastric involvement","Small bowel wall thickening","Ileocaecal involvement"]},
        {label:"Bone Marrow",fields:["Vertebral sclerotic foci","Lytic lesions","Diffuse marrow disease"]},
        {label:"Lugano / Ann Arbor Stage",fields:["Stage I","Stage II","Stage III","Stage IV"]}
      ],
      "CT Abdomen — Hepatocellular Carcinoma":[
        {label:"Technique",fields:["Triphasic CT — pre/arterial/portal/delayed","LI-RADS protocol"]},
        {label:"Index Lesion",fields:["Location — hepatic segment","Size (cm)","Morphology — nodular/infiltrative/multifocal","Arterial hyperenhancement (APHE)"]},
        {label:"LI-RADS Major Features",fields:["APHE — present/absent","Washout appearance","Enhancing capsule","Threshold growth (≥50% in 6 months)"]},
        {label:"LI-RADS Category",fields:["LR-1 — definitely benign","LR-2 — probably benign","LR-3 — intermediate","LR-4 — probably HCC","LR-5 — definitely HCC","LR-M — malignant not HCC specific"]},
        {label:"Vascular Invasion",fields:["Portal vein tumour thrombus (PVTT)","Hepatic vein invasion","IVC tumour thrombus","Bile duct invasion"]},
        {label:"Satellite Lesions",fields:["Present/absent","Number","Distance from main lesion"]},
        {label:"Background Liver",fields:["Cirrhosis grade","Portal hypertension","Regenerative/dysplastic nodules"]},
        {label:"Extrahepatic Disease",fields:["Regional nodes","Lung metastases","Adrenal","Bone","Peritoneum"]},
        {label:"Treatment Assessment (if post-treatment)",fields:["mRECIST response","Viable tumour — APHE","Treated non-enhancing area"]}
      ],
      "CT Abdomen — Ovarian Pathology":[
        {label:"Technique",fields:["Venous phase","Multiplanar reformats"]},
        {label:"Right Ovary/Mass",fields:["Size (cm — 3 planes)","Morphology — cystic/solid/mixed","Density (HU)","Enhancement"]},
        {label:"Left Ovary/Mass",fields:["Size (cm)","Morphology","Density","Enhancement"]},
        {label:"Mass Characteristics",fields:["Walls — thin/thick","Septa — thin/thick","Mural nodules","Solid component","Calcification"]},
        {label:"Fat Content",fields:["Macroscopic fat — dermoid","No fat"]},
        {label:"Peritoneal Disease",fields:["Peritoneal implants","Omental cake","Ascites","Pelvic floor implants"]},
        {label:"Lymph Nodes",fields:["Pelvic nodes","Para-aortic nodes","Inguinal nodes"]},
        {label:"Differential",fields:["Benign cyst — simple/dermoid","Endometrioma","Hydrosalpinx","Ovarian torsion features","Ovarian cancer — FIGO staging","Krukenberg tumour"]}
      ],
      "CT Abdomen — IBD Follow-up":[
        {label:"Technique",fields:["CTE — enterography protocol","Neutral oral contrast","Venous phase"]},
        {label:"Active Inflammation",fields:["Location","Length of bowel","Wall thickness (mm)","Mural enhancement — hyperenhancement","Mucosal hyperenhancement"]},
        {label:"Complications",fields:["Stricture — location/length/upstream dilatation","Abscess — location/size","Fistula — type/tract","Perforation","Haemorrhage"]},
        {label:"Mesenteric Changes",fields:["Fat stranding","Creeping fat","Mesenteric lymph nodes — size","Comb sign — hypervascularity"]},
        {label:"Interval Change",fields:["Improvement vs prior","Worsening vs prior","Stable disease","New areas of involvement"]},
        {label:"UC vs Crohn's Features",fields:["Continuous vs skip lesions","Rectal involvement","Transmural vs superficial","Small bowel involvement"]},
        {label:"Medications Effect",fields:["Response to biologics","Post-surgical change","Pouchitis features"]}
      ],
      "Neck":[
        {label:"Technique",fields:["Contrast","Phase","Coverage"]},
        {label:"Airway",fields:["Supraglottic","Glottis","Subglottis","Trachea","Narrowing"]},
        {label:"Thyroid",fields:["Size","Nodules","Enhancement","Calcification"]},
        {label:"Lymph Nodes",fields:["Level I–VI","Size","Enhancement","Necrosis"]},
        {label:"Vascular",fields:["Carotids","Jugulars","Vertebrals"]},
        {label:"Deep Spaces",fields:["Parapharyngeal","Retropharyngeal","Masticator","Parotid"]},
        {label:"Bones",fields:["Cervical spine","Skull base","Hyoid"]}
      ],
      "CT Neck — Neck Mass / Lymphadenopathy":[
        {label:"Technique",fields:["Contrast — venous phase","Coverage — skull base to clavicle"]},
        {label:"Nodal Levels",fields:["Level IA/IB — submental/submandibular","Level IIA/IIB — upper jugular","Level III — mid jugular","Level IV — lower jugular","Level VA/VB — posterior triangle","Level VI — central compartment"]},
        {label:"Dominant Node / Mass",fields:["Location","Size — long axis/short axis (mm)","Number of nodes","Morphology"]},
        {label:"Nodal Characteristics",fields:["Enhancement — homogeneous/heterogeneous","Necrosis — central","Calcification — papillary carcinoma?","Extracapsular spread","Matted nodes"]},
        {label:"Primary Tumour Search",fields:["Nasopharynx","Oropharynx","Hypopharynx","Larynx","Thyroid","Parotid","Oral cavity"]},
        {label:"Benign Neck Mass",fields:["Lymph node — reactive","Thyroglossal duct cyst","Branchial cleft cyst","Dermoid cyst","Lipoma"]},
        {label:"Vascular Involvement",fields:["Carotid artery displacement","Jugular vein involvement"]}
      ],
      "CT Neck — Deep Space Infection / Abscess":[
        {label:"Technique",fields:["Contrast — venous phase","Bone windows for base"]},
        {label:"Collection",fields:["Location — space involved","Size (cm)","Density — phlegmon vs abscess","Gas within collection","Rim enhancement"]},
        {label:"Deep Spaces Involved",fields:["Submandibular space","Sublingual space","Parapharyngeal space","Retropharyngeal space","Danger space (D4)","Prevertebral space","Masticator space"]},
        {label:"Airway",fields:["Airway calibre","Narrowing — degree","Deviation","Compromise — urgent"]},
        {label:"Extension",fields:["Descending mediastinitis — mediastinal involvement","Spread to carotid space","Vertebral osteomyelitis","Intracranial extension"]},
        {label:"Causative Source",fields:["Dental — mandibular molar","Tonsillar — peritonsillar","Foreign body","Trauma","Lymph node suppuration"]},
        {label:"Vascular Complications",fields:["IJV thrombosis — Lemierre syndrome","Carotid artery involvement","Pseudoaneurysm"]},
        {label:"Bone",fields:["Mandibular osteomyelitis","Cervical vertebral involvement"]}
      ],
      "CT Neck — Laryngeal Trauma":[
        {label:"Technique",fields:["Non-contrast + bone windows","Soft tissue windows"]},
        {label:"Thyroid Cartilage",fields:["Fracture — present/absent","Type — comminuted/vertical/horizontal","Displacement"]},
        {label:"Cricoid Cartilage",fields:["Fracture — present/absent","Posterior plate injury","Anterior arch"]},
        {label:"Arytenoids",fields:["Dislocation — right/left","Fracture"]},
        {label:"Hyoid Bone",fields:["Fracture — body/greater horn","Displacement"]},
        {label:"Airway",fields:["Lumen compromise — degree (%)","Deviation","Subcutaneous emphysema","Pneumomediastinum"]},
        {label:"Soft Tissue",fields:["Haematoma — location/size","Laryngeal oedema","Vocal cord position"]},
        {label:"Vascular Injury",fields:["Carotid injury","Jugular injury","Active haemorrhage"]}
      ],
      "CT Neck — Thyroid Cancer":[
        {label:"Technique",fields:["Contrast — venous phase","Avoid iodine contrast if RAI planned"]},
        {label:"Primary Tumour",fields:["Lobe — right/left/isthmus","Size (cm — 3 planes)","Morphology","Calcification — microcalcification"]},
        {label:"Extrathyroidal Extension",fields:["T-stage — T1/T2/T3a/T3b/T4","Strap muscle invasion","Oesophageal invasion","Tracheal invasion","Recurrent laryngeal nerve — encasement","Carotid artery — encasement"]},
        {label:"Regional Lymph Nodes",fields:["Central compartment — level VI","Bilateral level II–IV","Posterior triangle — level V","Retropharyngeal nodes"]},
        {label:"Nodal Characteristics",fields:["Cystic necrosis — papillary mets","Calcification — papillary mets","Enhancement","Size"]},
        {label:"Contralateral Lobe",fields:["Normal","Lesion"]},
        {label:"Substernal Extension",fields:["Retrosternal extension","Degree — partial/complete","Airway compression"]},
        {label:"Distant Metastases",fields:["Lung","Bone","Mediastinal nodes"]}
      ],
      "CT Neck — Parotid / Salivary Gland":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Right Parotid",fields:["Size","Morphology","Focal lesion — size/HU","Enhancement","Deep vs superficial lobe","Facial nerve plane"]},
        {label:"Left Parotid",fields:["Size","Morphology","Focal lesion — size/HU","Enhancement","Deep vs superficial lobe"]},
        {label:"Lesion Characteristics",fields:["Pre-contrast HU","Enhancement HU","Fat content","Calcification","Cystic component","Margins"]},
        {label:"Duct Assessment",fields:["Stensen duct — right","Stensen duct — left","Duct dilatation","Calculus in duct"]},
        {label:"Submandibular Glands",fields:["Right submandibular — normal/lesion","Left submandibular","Wharton duct calculus"]},
        {label:"Perineural Invasion",fields:["Facial nerve enhancement","Foramen stylomastoid widening","Skull base involvement"]},
        {label:"Differential",fields:["Pleomorphic adenoma — well-defined, heterogeneous","Warthin tumour — bilateral cystic","Mucoepidermoid carcinoma — aggressive","Acinic cell carcinoma","Metastatic node in parotid"]}
      ],
      "CT Neck — Post Neck Dissection":[
        {label:"Technique",fields:["Contrast — venous phase","Comparison with prior imaging"]},
        {label:"Surgical Site",fields:["Type of dissection — selective/modified radical/radical","Levels dissected","Expected post-op change"]},
        {label:"Residual / Recurrent Nodal Disease",fields:["Residual node — present/absent","Recurrent node — location/size/enhancement","Necrosis","Interval change"]},
        {label:"Flap / Reconstruction",fields:["Flap viability","Flap enhancement","Flap complication"]},
        {label:"Carotid Artery",fields:["Carotid integrity","Carotid blowout risk","Pseudoaneurysm"]},
        {label:"Jugular Vein",fields:["Resected / sacrificed","Reconstruction","Thrombosis"]},
        {label:"Post-Operative Changes",fields:["Seroma","Haematoma","Infection","Chyle leak features","Sternocleidomastoid absent"]},
        {label:"Primary Site",fields:["Primary site assessment","Local recurrence at primary"]}
      ],
      "CT Neck — Cystic Neck Mass":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Cyst Characteristics",fields:["Location","Size (cm)","Wall thickness","Internal density (HU)","Enhancement — rim/none","Septations","Solid component"]},
        {label:"Branchial Cleft Cyst",fields:["Type I — periauricular","Type II — anterior SCM at mandible angle — most common","Type III — posterior pharyngeal wall","Type IV — adjacent pharyngeal mucosa","Level II location — typical"]},
        {label:"Thyroglossal Duct Cyst",fields:["Midline location","Level — suprahyoid/hyoid/infrahyoid","Relationship to hyoid bone","Intrathyroid extension"]},
        {label:"Ranula",fields:["Floor of mouth","Plunging ranula — sublingual extension to neck","Deep component through mylohyoid"]},
        {label:"Lymphatic Malformation",fields:["Multiloculated","Transspatial","Fluid-fluid levels"]},
        {label:"Infected Cyst",fields:["Wall thickening","Surrounding fat stranding","Abscess transformation"]},
        {label:"Differential",fields:["Branchial cleft cyst","Thyroglossal cyst","Lymphatic malformation","Necrotic lymph node","Ranula","Dermoid"]}
      ],
      "CT Neck — Nasopharyngeal Carcinoma":[
        {label:"Technique",fields:["Contrast — venous phase","Skull base windows"]},
        {label:"Primary Tumour",fields:["Location — fossa of Rosenmüller/roof/posterior wall","Size (cm)","T-stage (T1–T4)"]},
        {label:"Nasopharyngeal Involvement",fields:["Parapharyngeal space invasion","Masticator space","Carotid space"]},
        {label:"Skull Base Invasion",fields:["Clivus","Pterygoid plates","Skull base foramina","Intracranial extension","Cavernous sinus"]},
        {label:"Cranial Nerve Foramina",fields:["Foramen ovale","Foramen spinosum","Jugular foramen","Hypoglossal canal"]},
        {label:"Regional Lymph Nodes",fields:["Retropharyngeal nodes — Rouviére","Level II–V bilateral","Matted nodes","Extracapsular spread"]},
        {label:"Distant Disease",fields:["Lung","Bone","Liver"]}
      ],
      "CT Neck — Oropharyngeal Cancer":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Primary Tumour",fields:["Location — base of tongue/tonsil/soft palate/posterior pharyngeal wall","Size (cm)","T-stage (T1–T4)"]},
        {label:"Tumour Characteristics",fields:["Enhancement","Necrosis","Bone invasion — mandible/skull base"]},
        {label:"Deep Space Invasion",fields:["Parapharyngeal fat obliteration","Masticator space","Prevertebral muscles"]},
        {label:"Regional Lymph Nodes",fields:["Ipsilateral levels II–IV","Contralateral nodes","Level IB","Retropharyngeal"]},
        {label:"Carotid Artery",fields:["Encasement — 270° rule","Displacement"]},
        {label:"HPV Status Correlation",fields:["Cystic nodal metastases — HPV+","Calcification — unusual for SCC"]},
        {label:"Distant Metastases",fields:["Lung","Liver","Bone"]}
      ],
      "CT Neck — Carotid Body Tumour":[
        {label:"Technique",fields:["CTA — arterial phase","Multiplanar reformation"]},
        {label:"Tumour",fields:["Location — carotid bifurcation","Size (cm)","Splaying of ICA and ECA (lyre sign)","Bilateral"]},
        {label:"Enhancement",fields:["Intense arterial enhancement","Feeding vessels","Flow voids"]},
        {label:"Carotid Artery",fields:["ICA displacement","ECA displacement","ICA encasement","Lumen compromise"]},
        {label:"Jugular Vein",fields:["Displacement","Involvement"]},
        {label:"Skull Base",fields:["Extension to skull base","Jugular foramen"]},
        {label:"Nerves",fields:["Vagus","Hypoglossal","Glossopharyngeal involvement suspected"]},
        {label:"Bilateral Assessment",fields:["Contralateral CBT","Contralateral carotid"]},
        {label:"Differential",fields:["Carotid body tumour — paraganglioma","Vagal paraganglioma","Schwannoma","Metastatic lymph node"]}
      ],
      "CT Neck — Cervical Spine Trauma":[
        {label:"Technique",fields:["Bone windows","Multiplanar reformats — sagittal/coronal","Soft tissue windows"]},
        {label:"Alignment",fields:["Normal lordosis","Kyphosis","Scoliosis","Listhesis — level"]},
        {label:"Fractures",fields:["Present/absent","Level(s)","Type (compression/burst/distraction/rotation/chance)"]},
        {label:"C1 (Atlas)",fields:["Jefferson fracture","Lateral mass fracture","Transverse ligament integrity — ADI"]},
        {label:"C2 (Axis)",fields:["Odontoid fracture — type I/II/III","Hangman fracture — bilateral pars","C2 body fracture"]},
        {label:"Sub-axial Cervical",fields:["Compression fracture","Burst fracture","Facet dislocation — unilateral/bilateral","Teardrop fracture"]},
        {label:"Disc Spaces",fields:["Disc space widening — distraction","Anterior disc herniation"]},
        {label:"Soft Tissues",fields:["Prevertebral soft tissue width (mm)","Haematoma","Airway compromise"]},
        {label:"Vascular",fields:["Vertebral artery — CTA if needed","Dissection suspected"]}
      ],
      "CT Pelvis — Female Pelvic Mass":[
        {label:"Technique",fields:["Venous phase","Full bladder preferred"]},
        {label:"Uterus",fields:["Size (cm)","Position","Myometrium","Endometrial cavity","Fibroid — number/size"]},
        {label:"Ovaries",fields:["Right ovary — size/morphology","Left ovary — size/morphology"]},
        {label:"Pelvic Mass",fields:["Location — right/left/midline","Size (cm — 3 planes)","Origin — ovarian/uterine/non-gynaecological","Morphology — cystic/solid/mixed"]},
        {label:"Mass Characteristics",fields:["Pre-contrast HU","Enhancement","Wall thickness","Septa","Solid component","Fat — dermoid"]},
        {label:"Peritoneal Disease",fields:["Pelvic implants","Omental disease","Ascites"]},
        {label:"Lymph Nodes",fields:["Pelvic nodes","Para-aortic nodes","Inguinal"]},
        {label:"Differential",fields:["Ovarian cancer","Endometrioma","Dermoid","Fibroid — pedunculated","Hydrosalpinx","Peritoneal inclusion cyst","GI origin"]}
      ],
      "CT Pelvis — Prostate Cancer Staging":[
        {label:"Technique",fields:["Venous phase","Full pelvis to L1"]},
        {label:"Prostate",fields:["Size","Morphology","Asymmetry","Extraprostatic extension (EPE) features"]},
        {label:"Seminal Vesicles",fields:["Involvement — right/left","Angulation","Loss of fat plane"]},
        {label:"Local Staging (T-stage)",fields:["T2 — organ confined","T3a — EPE","T3b — seminal vesicle invasion","T4 — adjacent organ invasion"]},
        {label:"Adjacent Structures",fields:["Bladder invasion","Rectal wall invasion","Levator ani","Neurovascular bundle"]},
        {label:"Lymph Nodes",fields:["Obturator fossa","External iliac","Internal iliac","Common iliac","Para-aortic"]},
        {label:"Bone Lesions",fields:["Pelvis","Lumbar spine","Femoral heads","Sclerotic/lytic"]},
        {label:"Bladder",fields:["Wall thickening","Hydronephrosis — ureteric obstruction"]}
      ],
      "CT Pelvis — Cervical Cancer Staging":[
        {label:"Technique",fields:["Contrast — venous phase","Full pelvis including inguinal to renal hila"]},
        {label:"Primary Tumour",fields:["Size (cm)","T-stage (T1–T4)","Morphology — exophytic/endocervical","Enhancement"]},
        {label:"Local Invasion",fields:["Parametrial invasion — right/left","Vaginal invasion — upper/lower","Uterine body invasion","Bladder invasion","Rectal invasion","Pelvic sidewall"]},
        {label:"Hydronephrosis",fields:["Right ureter — hydronephrosis","Left ureter — hydronephrosis","Ureteric obstruction — level"]},
        {label:"Lymph Nodes",fields:["Obturator","External iliac","Internal iliac","Common iliac","Para-aortic","Inguinal"]},
        {label:"Pelvic Fat Planes",fields:["Obliteration of fat planes","Fat stranding"]},
        {label:"Peritoneal Disease",fields:["Implants","Ascites"]},
        {label:"Distant Metastases",fields:["Liver","Lung","Bone"]}
      ],
      "CT Pelvis — Ovarian Cancer Staging":[
        {label:"Technique",fields:["Contrast — venous phase","Coverage — diaphragm to pelvis"]},
        {label:"Primary Ovarian Mass",fields:["Side","Size (cm)","Morphology — solid/cystic/mixed","Enhancement","Bilateral"]},
        {label:"Peritoneal Disease",fields:["Greater omentum — omental cake","Perihepatic","Right hemidiaphragm","Left hemidiaphragm","Paracolic gutters","Pelvic floor","Serosal implants"]},
        {label:"FIGO Stage",fields:["Stage I — confined to ovaries","Stage II — pelvic extension","Stage III — peritoneal/nodes","Stage IV — distant metastases"]},
        {label:"Lymph Nodes",fields:["Pelvic nodes","Para-aortic — level of renal vessels","Inguinal"]},
        {label:"Ascites",fields:["Volume","Haemorrhagic"]},
        {label:"Upper Abdominal Disease",fields:["Liver surface implants","Spleen surface","Splenic hilum","Porta hepatis","Portocaval","Mesenteric implants"]},
        {label:"Surgical Resectability",fields:["R0 resection feasibility","Disease at root of SMA","Hepatic parenchymal involvement"]}
      ],
      "CT Pelvis — Endometrial Cancer Staging":[
        {label:"Technique",fields:["Venous phase — pelvis"]},
        {label:"Uterus",fields:["Size","Endometrial lesion — size","Enhancement"]},
        {label:"Myometrial Invasion",fields:["Deep myometrial invasion (>50%) — T1b","Superficial — T1a","Serosal invasion — T3a"]},
        {label:"Cervical Involvement",fields:["Cervical stromal invasion — T2"]},
        {label:"Extrauterine Spread",fields:["Adnexal involvement","Parametrial invasion","Vaginal involvement","Pelvic sidewall","Bladder — T4","Rectum — T4"]},
        {label:"Lymph Nodes",fields:["Obturator","External iliac","Internal iliac","Common iliac","Para-aortic"]},
        {label:"Peritoneal Disease",fields:["Peritoneal implants","Ascites"]},
        {label:"Distant Metastases",fields:["Lung","Liver","Inguinal nodes"]}
      ],
      "CT Pelvis — Bladder Cancer Staging":[
        {label:"Technique",fields:["Excretory phase — distended bladder","Urographic protocol"]},
        {label:"Primary Tumour",fields:["Location — right/left/posterior/dome/trigone/neck","Size (cm)","Morphology — papillary/sessile/flat","Enhancement"]},
        {label:"T-Stage",fields:["T1 — lamina propria","T2a — inner muscle","T2b — outer muscle","T3a — perivesical fat microscopically","T3b — perivesical fat macroscopically","T4a — prostate/vagina/uterus","T4b — pelvic/abdominal wall"]},
        {label:"Perivesical Fat",fields:["Fat stranding","Distinct mass outside bladder"]},
        {label:"Adjacent Organs",fields:["Prostate/urethra","Vagina/uterus","Rectum","Pelvic sidewall"]},
        {label:"Upper Urinary Tract",fields:["Right hydronephrosis","Left hydronephrosis","Ureteric involvement"]},
        {label:"Lymph Nodes",fields:["Perivesical","Obturator","External/internal iliac","Common iliac","Para-aortic"]},
        {label:"Distant Metastases",fields:["Liver","Lung","Bone"]}
      ],
      "CT Pelvis — Pelvic Fracture":[
        {label:"Technique",fields:["Bone + soft tissue windows","3D reconstruction"]},
        {label:"Pelvic Ring",fields:["Pelvic ring integrity — stable/unstable","Anterior ring fractures","Posterior ring fractures","Ring disruption"]},
        {label:"Specific Fractures",fields:["Pubic symphysis — diastasis (mm)","Superior pubic ramus — right/left","Inferior pubic ramus — right/left","Sacrum — type/zone","Ilium","Acetabulum"]},
        {label:"Young & Burgess Classification",fields:["Lateral compression (LC I/II/III)","Anteroposterior compression (APC I/II/III)","Vertical shear","Combined mechanical"]},
        {label:"Sacrum",fields:["Denis zone (I/II/III)","Sacroiliac joint disruption","Sacral fracture pattern — H/U/Lambda"]},
        {label:"Acetabulum",fields:["Column — anterior/posterior","Roof/dome","Articular surface","Hip joint — dislocation"]},
        {label:"Haemorrhage",fields:["Active haemorrhage — blush","Volume of haematoma","Retroperitoneal","Extraperitoneal"]},
        {label:"Soft Tissues",fields:["Bladder injury","Urethral disruption","Rectal injury","Neurovascular injury"]}
      ],
      "CT Pelvis — Pelvic Inflammatory Disease":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Uterus",fields:["Uterine enlargement","Endometrial fluid","Myometrial enhancement"]},
        {label:"Fallopian Tubes",fields:["Salpingitis — wall thickening/enhancement","Hydrosalpinx","Pyosalpinx — tubular fluid collection","Tubo-ovarian complex"]},
        {label:"Tubo-Ovarian Abscess",fields:["Side — right/left/bilateral","Size (cm)","Thick enhancing wall","Internal debris","Gas"]},
        {label:"Ovaries",fields:["Right ovary — involvement","Left ovary — involvement","Ovarian enhancement"]},
        {label:"Pelvic Fat",fields:["Fat stranding — distribution","Free fluid — amount"]},
        {label:"Peritoneal Involvement",fields:["Pelvic peritonitis","Fitz-Hugh-Curtis syndrome — perihepatic stranding"]},
        {label:"Differential",fields:["Appendicitis","Ectopic pregnancy","Endometriosis"]}
      ],
      "CT Pelvis — Hip Joint Pathology":[
        {label:"Technique",fields:["Bone + soft tissue windows","2D reformats"]},
        {label:"Femoral Head",fields:["Right femoral head — shape/density","Left femoral head","Avascular necrosis — Steinberg stage","Subchondral fracture"]},
        {label:"Acetabulum",fields:["Acetabular coverage","Crossover sign","Pincer deformity","Retroversion"]},
        {label:"Femoroacetabular Impingement",fields:["Cam deformity — alpha angle (degrees)","Pincer deformity","Mixed type"]},
        {label:"Joint Space",fields:["Right hip joint space (mm)","Left hip joint space (mm)","Articular surface","Subchondral cysts"]},
        {label:"Periarticular",fields:["Joint effusion","Calcification — CPPD/hydroxyapatite","Periarticular ossification — HO grade"]},
        {label:"Prosthesis Assessment",fields:["Component position — cup anteversion","Stem alignment","Periprosthetic fracture","Loosening","Osteolysis — polyethylene wear"]},
        {label:"Other",fields:["Labral calcification","Synovial osteochondromatosis","Periarticular mass"]}
      ],
      "CT Pelvis — Rectal Cancer Staging":[
        {label:"Technique",fields:["Venous phase — pelvis and abdomen"]},
        {label:"Primary Tumour",fields:["Location — distance from anal verge (cm)","Upper/mid/lower rectum","Length (cm)","Circumferential vs eccentric","Enhancement"]},
        {label:"T-Stage",fields:["T1/T2 — within muscularis","T3 — through muscularis propria (depth of invasion mm)","T4a — visceral peritoneum","T4b — adjacent organ"]},
        {label:"Mesorectal Fascia (MRF)",fields:["Distance of tumour from MRF (mm)","MRF involvement — threatened/clear","EMVI — extramural vascular invasion"]},
        {label:"Regional Lymph Nodes",fields:["Mesorectal nodes — size/morphology","Superior rectal nodes","Lateral pelvic nodes — obturator/iliac"]},
        {label:"Distal Anal Margin",fields:["Distance from dentate line","Sphincter involvement"]},
        {label:"Adjacent Structures",fields:["Bladder","Prostate/seminal vesicles","Vagina/uterus","Sacrum","Presacral fascia"]},
        {label:"Distant Metastases",fields:["Liver — number/size/bilobar","Lung","Peritoneal","Para-aortic nodes"]}
      ],
      "CT Pelvis — Sacral Fracture":[
        {label:"Technique",fields:["Bone windows — thin slice","Multiplanar reformats"]},
        {label:"Sacral Fracture Pattern",fields:["Transverse fracture","Longitudinal / vertical fracture","Bilateral longitudinal — H-pattern / U-pattern / Lambda","Denis zone I/II/III"]},
        {label:"Denis Zone Classification",fields:["Zone I — lateral ala","Zone II — through neural foramina","Zone III — through central canal"]},
        {label:"Displacement",fields:["Anterior displacement (mm)","Posterior angulation","Kyphosis"]},
        {label:"Neural Foramina",fields:["Foraminal compromise — S1/S2/S3/S4","Degree of narrowing"]},
        {label:"Pelvic Ring Integrity",fields:["Sacroiliac joint disruption","Associated pelvic fractures","Ring stability"]},
        {label:"Sacrococcygeal",fields:["Coccyx fracture","Sacrococcygeal junction"]},
        {label:"Soft Tissue",fields:["Haematoma — presacral","Neural element compression","Nerve root involvement"]}
      ],
      "CT Pelvis — Pelvic Abscess":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Collection",fields:["Location — right/left/central/pouch of Douglas","Size (cm — 3 planes)","Density (HU)","Loculation","Gas within collection"]},
        {label:"Wall",fields:["Rim enhancement","Wall thickness (mm)","Irregular vs smooth"]},
        {label:"Origin / Aetiology",fields:["Post appendicectomy","Post gynaecological surgery","Tubo-ovarian abscess","Diverticular abscess","Post bowel surgery","Crohn's related"]},
        {label:"Surrounding Structures",fields:["Fat stranding","Adjacent organ involvement","Fistula","Free fluid"]},
        {label:"Drainage Assessment",fields:["Drain in-situ — position","Residual collection","Image-guided drainage feasibility","Safe approach — transgluteal/transrectal/transvaginal/anterior"]},
        {label:"Complications",fields:["Fistula formation","Peritonitis","Septic thrombophlebitis"]}
      ],
      "CT Pelvis — Post Hysterectomy":[
        {label:"Technique",fields:["Contrast — venous phase"]},
        {label:"Vaginal Vault",fields:["Vault integrity","Vault haematoma","Vault dehiscence"]},
        {label:"Surgical Bed",fields:["Expected post-op changes","Fluid — physiological vs collection","Haematoma — size/change"]},
        {label:"Pelvic Lymph Nodes",fields:["Residual/recurrent nodes","Obturator","Iliac","Para-aortic"]},
        {label:"Ureters",fields:["Right ureteric course","Left ureteric course","Obstruction — hydronephrosis","Ureteric injury — extravasation"]},
        {label:"Bladder",fields:["Wall integrity","Cystotomy repair site","Fistula features"]},
        {label:"Recurrence Assessment",fields:["Local recurrence — soft tissue at vault","Pelvic sidewall recurrence","Parametrial recurrence"]},
        {label:"Other",fields:["Bowel complications","Adhesion obstruction","Port site hernia","Ovarian remnant syndrome"]}
      ]
    },
  },
  MRI:{icon:"🧲",color:"#7B2D00",accent:"#FF6B35",
    regions:["Brain","Spine","MSK / Joint","Abdomen & Pelvis","Breast","Cardiac","Vascular/MRA"],
    sections:{
      Brain:[
        {label:"Technique",fields:["Field strength","Sequences","Contrast agent"]},
        {label:"Brain Parenchyma",fields:["T1 signal","T2/FLAIR signal","DWI restriction","Enhancement","Cortical thickness"]},
        {label:"White Matter",fields:["WM lesions","Location (periventricular/subcortical)","FLAIR hyperintensities"]},
        {label:"Grey Matter",fields:["Cortical atrophy","Hippocampal volume","Basal ganglia"]},
        {label:"Ventricles & CSF",fields:["Ventricular size","Hydrocephalus","CSF signal"]},
        {label:"Posterior Fossa",fields:["Cerebellum","Brainstem signal","Fourth ventricle"]},
        {label:"Vascular",fields:["MRA/MRV findings","Flow voids","Aneurysm","AVM"]},
        {label:"Extra-axial",fields:["Subdural","Epidural","Enhancement pattern"]},
        {label:"Skull Base & Pituitary",fields:["Sella size","Pituitary height","Stalk","Enhancement"]},
      ],
      Spine:[
        {label:"Technique",fields:["Level","Sequences","Contrast"]},
        {label:"Vertebral Bodies",fields:["Signal intensity T1","Signal intensity T2","Compression","Marrow signal"]},
        {label:"Intervertebral Discs",fields:["Hydration (T2 signal)","Height","Herniation level/type","Migration"]},
        {label:"Spinal Canal",fields:["Central canal diameter","Cord signal","Conus level","Cauda equina"]},
        {label:"Neural Foramina",fields:["Foraminal stenosis grade","Nerve root compression"]},
        {label:"Paraspinal Soft Tissues",fields:["Muscle signal","Ligaments","Epidural fat"]},
      ],
      "MSK / Joint":[
        {label:"Technique",fields:["Joint","Field strength","Sequences"]},
        {label:"Articular Cartilage",fields:["Thickness","Signal","Defects","Grade"]},
        {label:"Menisci (Knee)",fields:["Medial meniscus","Lateral meniscus","Tear grade","Morphology"]},
        {label:"Ligaments",fields:["ACL","PCL","MCL","LCL","Signal","Continuity"]},
        {label:"Tendons",fields:["Integrity","Signal","Tendinopathy","Tear (partial/full)"]},
        {label:"Bone",fields:["Marrow edema","Subchondral cysts","Fracture","Avascular necrosis"]},
        {label:"Joint Space & Fluid",fields:["Effusion volume","Synovitis","Loose bodies"]},
      ],
      "Abdomen & Pelvis":[
        {label:"Technique",fields:["Sequences","Contrast","Phase"]},
        {label:"Liver",fields:["T1 in/opposed phase","T2 signal","DWI","Enhancement kinetics","Focal lesions"]},
        {label:"Biliary",fields:["MRCP findings","CBD diameter","Stones","Strictures"]},
        {label:"Pancreas",fields:["Signal homogeneity","Duct","Enhancement","Masses"]},
        {label:"Kidneys",fields:["Corticomedullary differentiation","Masses (T2/DWI/enhancement)","Cysts (Bosniak)"]},
        {label:"Uterus & Ovaries",fields:["Zonal anatomy","Endometrium","Fibroid signal","Ovarian lesions"]},
        {label:"Prostate",fields:["Peripheral zone","Central zone","Lesions (PI-RADS)","ECE","SVI"]},
        {label:"Bowel & Mesentery",fields:["Wall signal","Fistula","Perianal disease"]},
        {label:"Lymph Nodes & Vessels",fields:["Node signal/size","Vascular invasion"]},
      ],
      Breast:[
        {label:"Technique",fields:["Field strength","DCE sequences","BI-RADS background"]},
        {label:"Background Parenchymal Enhancement",fields:["Amount","Symmetry"]},
        {label:"Lesions",fields:["Location (clock/depth)","Morphology","T2 signal","Kinetics (type I/II/III)","BI-RADS MRI"]},
        {label:"Axilla",fields:["Lymph nodes","Enhancement"]},
        {label:"Implants",fields:["Integrity","Rupture (intracapsular/extracapsular)","Linguine sign"]},
      ],
      Cardiac:[
        {label:"Technique",fields:["ECG gating","Sequences","Contrast"]},
        {label:"Ventricular Function",fields:["LVEF (%)","RVEF (%)","LV volumes","Wall motion","Wall thickness"]},
        {label:"Myocardium",fields:["T1 mapping","T2 signal","LGE pattern","Edema"]},
        {label:"Pericardium",fields:["Thickness","Effusion","Enhancement"]},
        {label:"Valves",fields:["Aortic","Mitral","Tricuspid","Pulmonary"]},
        {label:"Great Vessels",fields:["Aortic root","MPA diameter","Flow"]},
      ],
      "Vascular/MRA":[
        {label:"Technique",fields:["TOF/PC/CE-MRA","Coverage"]},
        {label:"Vessels",fields:["Patency","Stenosis grade","Aneurysm","Dissection","Collaterals"]},
        {label:"Perfusion",fields:["DWI correlation","PWI findings","Mismatch"]},
      ],
    },
  },
};

/* ══════════════════════════════════
   AI CALL — online with Anthropic key,
   offline fallback when key/network fails
══════════════════════════════════ */
function sentenceCase(s) {
  var t = (s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

function tryGetApiKey() {
  var key = "";
  try { key = localStorage.getItem("ANTHROPIC_API_KEY") || ""; } catch(e) {}
  if (!key && typeof window !== "undefined" && window.ANTHROPIC_API_KEY) {
    key = String(window.ANTHROPIC_API_KEY);
  }
  if (!key && typeof window !== "undefined" && !window.__radreportPromptedForKey) {
    window.__radreportPromptedForKey = true;
    var entered = window.prompt("Enter your Anthropic API key to enable online AI (leave blank for offline mode):", "");
    if (entered && entered.trim()) {
      key = entered.trim();
      try { localStorage.setItem("ANTHROPIC_API_KEY", key); } catch(e) {}
    }
  }
  return key;
}

function offlineAiFallback(usr) {
  var m, lines, out, obj;

  if (/Return JSON:/i.test(usr)) {
    lines = usr.split("\n");
    obj = {};
    lines.forEach(function(line) {
      m = line.match(/^- (.+?):\s*(.+)$/);
      if (m) obj[m[1].trim()] = sentenceCase(m[2]);
    });
    if (!Object.keys(obj).length) return "{}";
    return JSON.stringify(obj);
  }

  m = usr.match(/Notes:\s*"([^"]+)"/i);
  if (m && m[1]) {
    return sentenceCase(m[1]);
  }

  if (/Write a professional impression/i.test(usr) || /expanded impression/i.test(usr)) {
    lines = usr.split("\n").filter(function(line){ return /^- /.test(line); }).slice(0, 4);
    out = [];
    if (lines.length) {
      out.push("Findings are summarised from the provided radiology notes.");
      lines.forEach(function(line) {
        out.push(sentenceCase(line.replace(/^- /, "")));
      });
      out.push("Clinical correlation and appropriate follow-up are recommended as indicated.");
      return out.join(" ");
    }
  }

  return "Draft generated in offline mode. Please review and edit clinically before finalising.";
}

async function aiCall(sys, usr, attempt) {
  if (attempt === undefined) attempt = 0;
  var apiKey = tryGetApiKey();
  if (!apiKey) {
    return { ok: true, text: offlineAiFallback(usr), offline: true, error: "Missing Anthropic API key" };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: sys,
        messages: [{ role: "user", content: usr }]
      })
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1500));
      return aiCall(sys, usr, attempt + 1);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body.error && body.error.message) || ("HTTP " + res.status));
    }
    const d = await res.json();
    const text = (d.content || []).map(function(b) { return b.text || ""; }).join("").trim();
    if (!text) throw new Error("Empty response");
    return { ok: true, text: text, offline: false };
  } catch(e) {
    return { ok: true, text: offlineAiFallback(usr), offline: true, error: e.message };
  }
}

/* ══════════════════════════════════
   VOICE HOOK — Web Speech API
   Attempts SpeechRecognition directly.
   If blocked, shows VoiceHelpModal.
══════════════════════════════════ */
function useVoice(onResult, onDictationMode) {
  const rRef = useRef(null);
  const [activeKey, setActiveKey] = useState(null);
  const [dictKey, setDictKey]     = useState(null); // field in OS-dictation mode

  const stop = useCallback(function() {
    try { rRef.current && rRef.current.stop(); } catch(e) {}
    setActiveKey(null);
  }, []);

  // fieldEl: the actual <input> DOM node — we focus it so OS dictation types there
  const start = useCallback(function(key, fieldEl) {
    // If already in dictation mode for this key, cancel
    if (dictKey === key) { setDictKey(null); return; }

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Always focus the field first so OS dictation types into it
    if (fieldEl) {
      fieldEl.focus();
      // Place cursor at end
      var len = (fieldEl.value || "").length;
      try { fieldEl.setSelectionRange(len, len); } catch(e) {}
    }

    if (!SR) {
      // No SR at all — just stay focused for OS dictation
      setDictKey(key);
      onDictationMode(key, fieldEl);
      return;
    }

    try { rRef.current && rRef.current.abort(); } catch(e) {}
    var r = new SR();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    rRef.current = r;

    r.onstart = function() { setActiveKey(key); setDictKey(null); };

    r.onresult = function(e) {
      var t = Array.from(e.results).map(function(x) { return x[0].transcript; }).join(" ").trim();
      if (t) onResult(key, t);
      setActiveKey(null);
      // Re-focus after SR closes so next keystroke goes to right field
      if (fieldEl) { fieldEl.focus(); }
    };

    r.onerror = function(e) {
      setActiveKey(null);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        // SR blocked — fall back to OS dictation mode
        // Field is already focused, so Win+H / keyboard mic will type directly into it
        setDictKey(key);
        onDictationMode(key, fieldEl);
      }
    };

    r.onend = function() {
      setActiveKey(null);
      if (fieldEl) { fieldEl.focus(); }
    };

    try {
      r.start();
      // After SR starts, briefly re-focus the field so any subsequent
      // keypresses or Win+H still targets the right input
      setTimeout(function() {
        if (fieldEl && document.activeElement !== fieldEl) {
          fieldEl.focus();
        }
      }, 100);
    } catch(e) {
      setActiveKey(null);
      setDictKey(key);
      onDictationMode(key, fieldEl);
    }
  }, [onResult, onDictationMode, dictKey]);

  const cancelDictation = useCallback(function() { setDictKey(null); }, []);

  return { activeKey, dictKey, start, stop, cancelDictation };
}

/* ══════════════════════════════════
   SUB-COMPONENTS — all outside main
   so React never remounts them
══════════════════════════════════ */

function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  var colors = { error:"#B91C1C", success:"#2D9E6B", voice:"#0F766E", info:"#4F46E5" };
  var icons  = { error:"⚠️", success:"✅", voice:"🎤", info:"✨" };
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:colors[type]||"#4F46E5",color:"#fff",padding:"13px 18px",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,boxShadow:"0 4px 24px rgba(0,0,0,.35)",display:"flex",alignItems:"flex-start",gap:10,maxWidth:400,animation:"slideUp .3s ease"}}>
      <span style={{flexShrink:0,fontSize:16,marginTop:1}}>{icons[type]||"ℹ️"}</span>
      <span style={{flex:1,lineHeight:1.5}}>{msg}</span>
      <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",cursor:"pointer",fontSize:20,lineHeight:1,padding:0,flexShrink:0}}>×</button>
    </div>
  );
}

function DictationTip({ fieldLabel, onDone, inputRef }) {
  var isWin = navigator.userAgent.indexOf("Win") !== -1;
  var isMac = navigator.userAgent.indexOf("Mac") !== -1;

  // Re-focus the field when this tip renders, in case anything stole focus
  useEffect(function() {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
      var len = (inputRef.current.value || "").length;
      try { inputRef.current.setSelectionRange(len, len); } catch(e) {}
    }
  }, []);

  return (
    <div style={{margin:"6px 0 10px",padding:"12px 16px",background:"#FFF7ED",border:"2px solid #FB923C",borderRadius:10,fontFamily:"'DM Sans',sans-serif",animation:"slideUp .2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:"#C2410C",marginBottom:6}}>
            🎤 "{fieldLabel}" is ready — activate voice now:
          </div>
          {isWin && (
            <div style={{fontSize:13,color:"#7C2D12",lineHeight:1.8}}>
              <div>1. The field is already focused (orange border)</div>
              <div>2. Press <kbd style={{background:"#fff",border:"1px solid #fed7aa",borderRadius:4,padding:"2px 8px",fontWeight:700,fontSize:12}}>Win</kbd> + <kbd style={{background:"#fff",border:"1px solid #fed7aa",borderRadius:4,padding:"2px 8px",fontWeight:700,fontSize:12}}>H</kbd> — the dictation bar appears</div>
              <div>3. <strong>Click back into the orange field</strong>, then speak</div>
              <div style={{marginTop:6,fontSize:12,color:"#C2410C",background:"#FEF3C7",padding:"6px 10px",borderRadius:6}}>
                ⚠️ Win+H may steal focus — click the field again before speaking
              </div>
            </div>
          )}
          {isMac && !isWin && (
            <div style={{fontSize:13,color:"#7C2D12",lineHeight:1.8}}>
              <div>1. The field is already focused (orange border)</div>
              <div>2. Press <kbd style={{background:"#fff",border:"1px solid #fed7aa",borderRadius:4,padding:"2px 8px",fontWeight:700,fontSize:12}}>Fn</kbd> twice quickly</div>
              <div>3. Speak — text types directly into <strong>"{fieldLabel}"</strong></div>
            </div>
          )}
          {!isWin && !isMac && (
            <div style={{fontSize:13,color:"#7C2D12",lineHeight:1.8}}>
              <div>1. The field is focused (orange border)</div>
              <div>2. Tap the <strong>🎤 mic key</strong> on your keyboard and speak</div>
              <div>3. Text types directly into <strong>"{fieldLabel}"</strong></div>
            </div>
          )}
        </div>
        <button
          onMouseDown={function(e){ e.preventDefault(); }}
          onClick={function(){
            onDone();
            if (inputRef && inputRef.current) inputRef.current.focus();
          }}
          style={{flexShrink:0,background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#C2410C",padding:0,lineHeight:1}}>×</button>
      </div>
    </div>
  );
}

function AppHdr({ onBack, backTo, setStep, sub, right }) {
  return (
    <header className="np" style={{background:"linear-gradient(135deg,#0D2137,#1A3A5C)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64,boxShadow:"0 2px 12px rgba(0,0,0,.25)",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {onBack && (
          <button onClick={function(){setStep(backTo);}} style={{padding:"6px 14px",borderRadius:8,border:"2px solid rgba(255,255,255,.4)",background:"transparent",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            ← Back
          </button>
        )}
        <div>
          <span style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#fff"}}>RadReport Pro</span>
          {sub && <span style={{fontSize:11,color:"rgba(255,255,255,.45)",letterSpacing:2,textTransform:"uppercase",display:"block",marginTop:-2}}>{sub}</span>}
        </div>
      </div>
      <div>{right}</div>
    </header>
  );
}

function MicBtn({ fKey, activeKey, dictKey, onStart, onStop }) {
  var isRec  = activeKey === fKey;
  var isDict = dictKey   === fKey;
  var bg = isRec  ? "linear-gradient(135deg,#DC2626,#EF4444)"
         : isDict ? "linear-gradient(135deg,#EA580C,#FB923C)"
         :          "linear-gradient(135deg,#0F766E,#14B8A6)";
  var shadow = isRec  ? "0 0 0 3px rgba(220,38,38,.4)"
             : isDict ? "0 0 0 3px rgba(234,88,12,.4)"
             :          "0 2px 6px rgba(15,118,110,.4)";
  var anim = (isRec || isDict) ? "micPulse 1s ease-in-out infinite" : "none";
  var label = isRec ? "⏹" : isDict ? "✕" : "🎤";
  var title = isRec ? "Stop recording" : isDict ? "Cancel dictation" : "Voice input — click then speak";
  return (
    <button
      onMouseDown={function(e){
        // CRITICAL: prevent default so this button NEVER steals focus from the input field.
        // Without this, clicking the mic button blurs the input, breaking OS dictation.
        e.preventDefault();
      }}
      onClick={function(e){
        e.preventDefault();
        (isRec || isDict) ? onStop() : onStart();
      }}
      title={title}
      style={{width:36,height:36,borderRadius:8,border:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isRec?13:16,cursor:"pointer",transition:"all .2s",
        background:bg, color:"#fff", boxShadow:shadow, animation:anim
      }}
    >{label}</button>
  );
}

function AIBtn({ onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,border:"none",flexShrink:0,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,whiteSpace:"nowrap",transition:"all .2s",
        background: disabled ? "#C4B5FD" : loading ? "#5B21B6" : "linear-gradient(135deg,#4F46E5,#7C3AED)",
        color:"#fff",
        cursor: disabled ? "not-allowed" : loading ? "wait" : "pointer",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(79,70,229,.4)",
        animation: loading ? "aiGlow 1.1s infinite" : "none"
      }}
    >
      <span style={{display:"inline-block",fontSize:13,animation:loading?"spin .8s linear infinite":"none"}}>{loading?"⟳":"✨"}</span>
      <span>{loading ? "Writing…" : "AI"}</span>
    </button>
  );
}

/* FindingField — outside main for stable identity.
   Holds a ref to its <input> so we can focus it for OS dictation. */
function FindingField({ sl, field, val, tag, aiLoading, isRec, isDictating, activeKey, dictKey, voiceStart, voiceStop, cancelDictation, onChange, onTag, onAI }) {
  var inputRef = useRef(null);
  var fKey = sl + "__" + field;
  var border = "#DDE5EF", bg = "#FAFCFF";
  if (isRec)         { border = "#DC2626"; bg = "#FFF5F5"; }
  else if (isDictating){ border = "#FB923C"; bg = "#FFF7ED"; }
  else if (aiLoading){ border = "#7C3AED"; bg = "#F5F3FF"; }
  else if (tag==="ab"){ border = "#C0392B60"; bg = "#FFF5F5"; }
  else if (tag==="n") { border = "#2D9E6B60"; bg = "#F0FFF6"; }
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <label style={{fontSize:11,fontWeight:700,color:"#5A7090",textTransform:"uppercase",letterSpacing:.9}}>{field}</label>
        <div style={{display:"flex",gap:5}}>
          <button onClick={function(){onTag("n");}} style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",background:tag==="n"?"#2D9E6B":"#DDE5EF",color:tag==="n"?"#fff":"#5A7090"}}>NORMAL</button>
          <button onClick={function(){onTag("ab");}} style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",background:tag==="ab"?"#C0392B":"#DDE5EF",color:tag==="ab"?"#fff":"#5A7090"}}>ABNORMAL</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <input
          ref={inputRef}
          className="ri"
          style={{flex:1,padding:"9px 12px",border:"1.5px solid "+border,borderRadius:7,fontSize:14,color:"#1A2B3C",background:bg,outline:"none",fontFamily:"'DM Sans',sans-serif",transition:"border-color .15s,background .15s",boxShadow:isDictating?"0 0 0 3px rgba(251,146,60,.25)":isRec?"0 0 0 3px rgba(220,38,38,.15)":"none"}}
          placeholder={isRec ? "🔴 Listening… speak now" : isDictating ? "✏️ Field focused — activate dictation now" : "Type, or click 🎤…"}
          value={val}
          onChange={function(e){onChange(e.target.value);}}
        />
        <MicBtn
          fKey={fKey}
          activeKey={activeKey}
          dictKey={dictKey}
          onStart={function(){ voiceStart(fKey, inputRef.current); }}
          onStop={function(){ voiceStop(); cancelDictation(); }}
        />
        <AIBtn onClick={onAI} loading={aiLoading} disabled={!val.trim()} />
      </div>
      {isDictating && (
        <DictationTip fieldLabel={field} inputRef={inputRef} onDone={function(){ cancelDictation(); if(inputRef.current) inputRef.current.focus(); }} />
      )}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
        {(FS[field.toLowerCase()] || FS["_default"]).map(function(s,i){
          var isN  = s.k === "n";
          var isAb = s.k === "ab";
          var bg     = isN ? "#EBF9F2" : isAb ? "#FFF0EE" : "#F0F4FF";
          var col    = isN ? "#15803D" : isAb ? "#B91C1C" : "#3B4FA0";
          var border = isN ? "#BBF7D0" : isAb ? "#FECACA" : "#C7D2FE";
          var icon   = isN ? "✓" : isAb ? "⚠" : "·";
          return (
            <span key={i}
              style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:bg,color:col,cursor:"pointer",border:"1px solid "+border,fontWeight:600,transition:"all .15s"}}
              onClick={function(){ onChange(s.t); if(isN) onTag("n"); else if(isAb) onTag("ab"); }}
              title={isN ? "Normal" : isAb ? "Abnormal" : ""}
            >{icon} {s.t}</span>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN APP
══════════════════════════════════ */
function RadReport() {
  var [step, setStep]               = useState("home");
  var [modality, setModality]       = useState(null);
  var [region, setRegion]           = useState(null);
  var [patient, setPatient]         = useState({name:"",age:"",sex:"Male",refBy:"",clinicalInfo:"",studyDate:new Date().toISOString().split("T")[0],reportingDoc:"",institution:""});
  var [findings, setFindings]       = useState({});
  var [tags, setTags]               = useState({});
  var [impression, setImpression]   = useState("");
  var [recommendation, setRec]      = useState("");
  var [urgency, setUrgency]         = useState("Routine");
  var [aiLoad, setAiLoad]           = useState({});
  var [toast, setToast]             = useState(null);
  var printRef = useRef(null);

  /* ── helpers ── */
  var showToast = useCallback(function(msg, type) {
    setToast({ msg: msg, type: type || "info" });
    setTimeout(function(){ setToast(null); }, 5000);
  }, []);

  var handleVoiceResult = useCallback(function(key, text) {
    if (key === "impression") {
      setImpression(function(p){ return p ? p + " " + text : text; });
    } else {
      setFindings(function(p){ var n = Object.assign({}, p); n[key] = p[key] ? p[key] + " " + text : text; return n; });
    }
    showToast("🎤 \"" + text.slice(0, 55) + (text.length > 55 ? "…" : "") + "\"", "voice");
  }, [showToast]);

  var handleDictationMode = useCallback(function(key, fieldEl) {
    // Field is already focused by useVoice — just show the tip
    // (fieldEl focus already done inside useVoice.start)
  }, []);

  var voice = useVoice(handleVoiceResult, handleDictationMode);
  var activeKey     = voice.activeKey;
  var dictKey       = voice.dictKey;
  var voiceStart    = voice.start;
  var voiceStop     = voice.stop;
  var cancelDictation = voice.cancelDictation;

  var tpl      = modality ? T[modality] : null;
  var sections = (tpl && region && tpl.sections[region]) ? tpl.sections[region] : [];

  var getF = function(sl, f){ return findings[sl+"__"+f] || ""; };
  var setF = function(sl, f, v){ setFindings(function(p){ var n = Object.assign({}, p); n[sl+"__"+f] = v; return n; }); };
  var getT = function(sl, f){ return tags[sl+"__"+f]; };
  var togT = function(sl, f, t){ setTags(function(p){ var n = Object.assign({}, p); n[sl+"__"+f] = p[sl+"__"+f] === t ? null : t; return n; }); };
  var setLD = function(k, v){ setAiLoad(function(p){ var n = Object.assign({}, p); n[k] = v; return n; }); };

  var expandField = useCallback(async function(sl, field) {
    var cur = getF(sl, field).trim();
    if (!cur) { showToast("Type or speak in \"" + field + "\" first", "error"); return; }
    var k = sl + "__" + field;
    setLD(k, true);
    var r = await aiCall(
      "You are an expert radiologist. Return ONLY the expanded professional sentence, no preamble.",
      "Modality: " + modality + ". Region: " + region + ". Section: " + sl + ". Field: \"" + field + "\".\nNotes: \"" + cur + "\"\nExpand into 1-2 professional radiology sentences."
    );
    if (r.ok) {
      setF(sl, field, r.text);
      showToast(r.offline ? "⚠️ Online AI unavailable, used offline draft" : "✨ Expanded", r.offline ? "info" : "success");
    } else showToast("AI error: " + r.error, "error");
    setLD(k, false);
  }, [modality, region, findings, showToast]);

  var expandSection = useCallback(async function(sec) {
    var filled = sec.fields.map(function(f){ return [f, getF(sec.label, f).trim()]; }).filter(function(x){ return x[1]; });
    if (!filled.length) { showToast("Add findings to \"" + sec.label + "\" first", "error"); return; }
    var k = "sec__" + sec.label;
    setLD(k, true);
    var r = await aiCall(
      "You are an expert radiologist. Return ONLY valid JSON, no markdown.",
      "Modality: " + modality + ". Region: " + region + ". Section: \"" + sec.label + "\".\nFindings:\n" + filled.map(function(x){ return "- " + x[0] + ": " + x[1]; }).join("\n") + "\nReturn JSON: {\"field name\": \"expanded sentence\"}"
    );
    if (r.ok) {
      try {
        var parsed = JSON.parse(r.text.replace(/```json|```/g, "").trim());
        var count = 0;
        Object.entries(parsed).forEach(function(entry){ if (typeof entry[1] === "string" && entry[1].trim()) { setF(sec.label, entry[0], entry[1].trim()); count++; } });
        showToast(r.offline ? "⚠️ Offline draft for " + sec.label : "✨ Expanded " + count + " fields in " + sec.label, r.offline ? "info" : "success");
      } catch(e) { showToast("AI format error. Try individual fields.", "error"); }
    } else showToast("AI error: " + r.error, "error");
    setLD(k, false);
  }, [modality, region, findings, showToast]);

  var generateImpression = useCallback(async function() {
    var all = sections.flatMap(function(sec){ return sec.fields.map(function(f){ return {sec:sec.label,f:f,v:findings[sec.label+"__"+f]||"",t:tags[sec.label+"__"+f]}; }).filter(function(x){ return x.v; }); });
    if (!all.length) { showToast("Add findings first", "error"); return; }
    setLD("impression", true);
    var r = await aiCall(
      "You are a senior consultant radiologist. Return ONLY the impression text.",
      "Modality: " + modality + ". Region: " + region + ". Patient: " + patient.age + ", " + patient.sex + ". Indication: " + (patient.clinicalInfo || "not provided") + ".\nFindings:\n" + all.map(function(x){ return "- " + x.sec + " > " + x.f + ": " + x.v + (x.t ? " [" + (x.t==="n"?"NORMAL":"ABNORMAL") + "]" : ""); }).join("\n") + "\nWrite a professional impression (3-6 sentences)."
    );
    if (r.ok) {
      setImpression(r.text);
      showToast(r.offline ? "⚠️ Online AI unavailable, generated offline impression draft" : "✨ Impression generated", r.offline ? "info" : "success");
    } else showToast("AI error: " + r.error, "error");
    setLD("impression", false);
  }, [sections, findings, tags, modality, region, patient, showToast]);

  var expandImpression = useCallback(async function() {
    if (!impression.trim()) { showToast("Type a draft first", "error"); return; }
    setLD("impExp", true);
    var r = await aiCall(
      "You are a senior radiologist. Return ONLY the expanded impression text.",
      "Modality: " + modality + ". Region: " + region + ".\nDraft: \"" + impression + "\"\nExpand into 3-5 professional sentences."
    );
    if (r.ok) {
      setImpression(r.text);
      showToast(r.offline ? "⚠️ Offline expansion draft used" : "✨ Expanded", r.offline ? "info" : "success");
    } else showToast("AI error: " + r.error, "error");
    setLD("impExp", false);
  }, [impression, modality, region, showToast]);

  var markAllNormal = useCallback(function() {
    var f = {}, t = {};
    sections.forEach(function(sec){ sec.fields.forEach(function(fl){ f[sec.label+"__"+fl] = "within normal limits"; t[sec.label+"__"+fl] = "n"; }); });
    setFindings(f); setTags(t);
  }, [sections]);

  var reset = useCallback(function() {
    setStep("home"); setModality(null); setRegion(null);
    setPatient({name:"",age:"",sex:"Male",refBy:"",clinicalInfo:"",studyDate:new Date().toISOString().split("T")[0],reportingDoc:"",institution:""});
    setFindings({}); setTags({}); setImpression(""); setRec(""); setUrgency("Routine"); setAiLoad({});
    try { voiceStop(); } catch(e) {}
  }, [voiceStop]);

  /* ── style constants ── */
  var C = {
    bg:"#F4F7FA", sur:"#FFF", navy:"#0D2137", txt:"#1A2B3C", soft:"#5A7090", bdr:"#DDE5EF",
    col: tpl ? tpl.color : "#0077B6",
    ok:"#2D9E6B", warn:"#E07B39", err:"#C0392B", ai:"#4F46E5", aiL:"#EEF2FF", mic:"#0F766E"
  };
  var inp = function(x) { return Object.assign({width:"100%",padding:"9px 12px",border:"1.5px solid "+C.bdr,borderRadius:7,fontSize:14,color:C.txt,background:"#FAFCFF",outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}, x||{}); };
  var ta  = function(x) { return Object.assign(inp(), {resize:"vertical",minHeight:80,lineHeight:1.7}, x||{}); };
  var btn = function(bg, col, x) { return Object.assign({padding:"9px 20px",borderRadius:8,border:"none",background:bg,color:col||"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}, x||{}); };
  var obtn = function(c) { return btn("transparent", c, {border:"2px solid "+c}); };
  var crd = {background:C.sur,borderRadius:12,boxShadow:"0 2px 16px rgba(0,0,0,.07)",overflow:"hidden",marginBottom:20};
  var cHd = function(c) { return {background:"linear-gradient(90deg,"+c+"18,transparent)",borderBottom:"2px solid "+c+"30",padding:"13px 20px",display:"flex",alignItems:"center",gap:10}; };
  var lbl = {fontSize:11,fontWeight:700,color:C.soft,textTransform:"uppercase",letterSpacing:.9,marginBottom:4,display:"block"};
  var pg  = {maxWidth:860,margin:"0 auto",padding:"28px 20px 60px"};

  /* ══ HOME — premium welcome ══ */
  if (step === "home") return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#04090F",minHeight:"100vh",overflow:"hidden",position:"relative",color:"#fff"}}>
      <style>{CSS}</style>
      <Toast msg={toast&&toast.msg} type={toast&&toast.type} onClose={function(){setToast(null);}} />

      {/* ════════ DEEP BACKGROUND LAYERS ════════ */}

      {/* Base gradient */}
      <div style={{position:"fixed",inset:0,zIndex:0,background:"radial-gradient(ellipse 90% 70% at 15% 50%,#0A1F3A 0%,#04090F 60%)"}} />

      {/* Dot grid texture */}
      <div style={{position:"fixed",inset:0,zIndex:1,backgroundImage:"radial-gradient(circle,rgba(56,189,248,.18) 1px,transparent 1px)",backgroundSize:"36px 36px",animation:"dotPulse 5s ease-in-out infinite",pointerEvents:"none"}} />

      {/* Ambient orbs */}
      <div style={{position:"fixed",zIndex:1,width:900,height:900,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,119,182,.12) 0%,transparent 65%)",top:"-30%",left:"-20%",animation:"orbFloat 20s ease-in-out infinite",pointerEvents:"none"}} />
      <div style={{position:"fixed",zIndex:1,width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,.08) 0%,transparent 65%)",bottom:"-10%",right:"5%",animation:"orbFloat 26s ease-in-out infinite reverse",pointerEvents:"none"}} />
      <div style={{position:"fixed",zIndex:1,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,.06) 0%,transparent 65%)",top:"30%",right:"25%",animation:"orbFloat 17s ease-in-out infinite 4s",pointerEvents:"none"}} />

      {/* Scan sweep line */}
      <div style={{position:"fixed",zIndex:2,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent 0%,rgba(56,189,248,.0) 20%,rgba(56,189,248,.5) 50%,rgba(56,189,248,.0) 80%,transparent 100%)",animation:"scanSweep 9s linear infinite",pointerEvents:"none"}} />

      {/* ════════ TOP NAV ════════ */}
      <nav className="np" style={{position:"relative",zIndex:20,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"22px 40px",borderBottom:"1px solid rgba(56,189,248,.08)"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{position:"relative"}}>
            <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#0077B6 0%,#00B4D8 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 0 0 1px rgba(0,180,216,.3), 0 8px 24px rgba(0,119,182,.45)",animation:"borderGlow 3s ease-in-out infinite","--gc":"rgba(0,180,216,.4)"}}>🩻</div>
            <div style={{position:"absolute",top:-2,right:-2,width:10,height:10,borderRadius:"50%",background:"#22D3EE",border:"2px solid #04090F",animation:"breathe 2s ease-in-out infinite"}} />
          </div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#fff",lineHeight:1.1,letterSpacing:"-.3px"}}>RadReport Pro</div>
            <div style={{fontSize:10,color:"rgba(56,189,248,.5)",letterSpacing:"3px",textTransform:"uppercase",marginTop:1}}>Clinical Intelligence Platform</div>
          </div>
        </div>

        {/* Status pills */}
        <div style={{display:"flex",gap:8}}>
          {[["#6366F1","#A5B4FC","AI ENGINE","ONLINE"],["#0F766E","#2DD4BF","VOICE","READY"]].map(function(p,i){return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:24,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",backdropFilter:"blur(8px)"}}>
              <div style={{display:"flex",gap:3,alignItems:"center"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:p[1],animation:"breathe 2s ease-in-out infinite",animationDelay:i*0.4+"s"}} />
                <div style={{width:5,height:5,borderRadius:"50%",background:p[1],opacity:.4,animation:"breathe 2s ease-in-out infinite",animationDelay:(i*0.4+0.3)+"s"}} />
              </div>
              <span style={{fontSize:10,color:p[1],fontWeight:800,letterSpacing:"1.5px"}}>{p[2]}</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,.2)",fontWeight:600,letterSpacing:"1px"}}>{p[3]}</span>
            </div>
          );})}
        </div>
      </nav>

      {/* ════════ HERO SPLIT LAYOUT ════════ */}
      <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",minHeight:"calc(100vh - 89px - 64px)",padding:"0 40px",gap:40,flexWrap:"wrap"}}>

        {/* ── LEFT: Text content ── */}
        <div style={{flex:"1 1 420px",maxWidth:580,paddingTop:20,paddingBottom:40}}>

          {/* Eyebrow tag */}
          <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"8px 16px",borderRadius:6,background:"rgba(56,189,248,.06)",border:"1px solid rgba(56,189,248,.15)",marginBottom:28,animation:"fadeUp .6s ease .1s both"}}>
            <span style={{display:"inline-block",width:20,height:1.5,background:"linear-gradient(90deg,#38BDF8,#818CF8)",borderRadius:2}}/>
            <span style={{fontSize:11,fontWeight:800,letterSpacing:"2.5px",textTransform:"uppercase",background:"linear-gradient(90deg,#38BDF8,#818CF8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Next-Generation Radiology AI</span>
          </div>

          {/* Main headline */}
          <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(38px,5vw,62px)",lineHeight:1.08,fontWeight:400,margin:"0 0 8px",animation:"fadeUp .7s ease .2s both"}}>
            <span style={{color:"#fff"}}>Where Precision</span><br/>
            <span style={{color:"#fff"}}>Meets</span>{" "}
            <span style={{fontStyle:"italic",background:"linear-gradient(105deg,#38BDF8 0%,#818CF8 50%,#2DD4BF 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Intelligence.</span>
          </h1>

          <p style={{fontSize:16,color:"rgba(255,255,255,.42)",lineHeight:1.75,maxWidth:460,margin:"20px 0 36px",animation:"fadeUp .7s ease .32s both"}}>
            Speak your findings. Let AI craft clinical prose. Generate complete professional radiology reports in a fraction of the time.
          </p>

          {/* Stat counters */}
          <div style={{display:"flex",gap:28,marginBottom:40,flexWrap:"wrap",animation:"fadeUp .7s ease .42s both"}}>
            {[["4","Modalities","#38BDF8"],["35+","Templates","#818CF8"],["100%","AI-Assisted","#2DD4BF"]].map(function(s,i){return(
              <div key={i} style={{position:"relative",paddingLeft:14}}>
                <div style={{position:"absolute",left:0,top:4,bottom:4,width:2,borderRadius:2,background:s[2]}} />
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:"#fff",lineHeight:1,animation:"numPop .5s cubic-bezier(.34,1.56,.64,1) "+(0.5+i*0.12)+"s both"}}>{s[0]}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:"1.5px",textTransform:"uppercase",marginTop:3}}>{s[1]}</div>
              </div>
            );})}
          </div>

          {/* Feature pills */}
          <div style={{display:"flex",flexWrap:"wrap",gap:8,animation:"fadeUp .7s ease .52s both"}}>
            {[["🎤","Voice dictation on every field"],["✨","AI sentence expansion"],["📋","Print-ready reports"],["🏷️","Normal / Abnormal tagging"]].map(function(f,i){return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:20,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)"}}>
                <span style={{fontSize:13}}>{f[0]}</span>
                <span style={{fontSize:12,color:"rgba(255,255,255,.5)",fontWeight:500}}>{f[1]}</span>
              </div>
            );})}
          </div>
        </div>

        {/* ── RIGHT: Sonar visualization ── */}
        <div style={{flex:"1 1 300px",display:"flex",alignItems:"center",justifyContent:"center",minHeight:340,animation:"fadeIn 1s ease .4s both"}}>
          <div style={{position:"relative",width:320,height:320}}>

            {/* Sonar rings */}
            {[1,2,3,4,5].map(function(i){return(
              <div key={i} style={{
                position:"absolute",inset:0,borderRadius:"50%",
                border:"1px solid rgba(56,189,248,"+(0.15-i*0.02)+")",
                animation:"sonarPulse "+(2.5+i*0.4)+"s ease-out infinite",
                animationDelay:(i*0.5)+"s",
                transform:"scale(.3)"
              }}/>
            );})}

            {/* Static rings */}
            {[0.25,0.5,0.72,0.9].map(function(r,i){return(
              <div key={i} style={{
                position:"absolute",
                top:(160-(160*r))+"px",left:(160-(160*r))+"px",
                width:(320*r)+"px",height:(320*r)+"px",
                borderRadius:"50%",
                border:"1px solid rgba(56,189,248,"+(0.06+i*0.02)+")",
              }}/>
            );})}

            {/* Cross hairs */}
            <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(56,189,248,.12),transparent)",marginTop:-0.5}}/>
            <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"linear-gradient(180deg,transparent,rgba(56,189,248,.12),transparent)",marginLeft:-0.5}}/>

            {/* Sweep arm */}
            <div style={{position:"absolute",top:"50%",left:"50%",width:140,height:1,transformOrigin:"0% 50%",background:"linear-gradient(90deg,rgba(56,189,248,.6),transparent)",animation:"spin 6s linear infinite",marginTop:-0.5}}/>

            {/* Center dot */}
            <div style={{position:"absolute",top:"50%",left:"50%",width:10,height:10,borderRadius:"50%",background:"#38BDF8",transform:"translate(-50%,-50%)",boxShadow:"0 0 0 4px rgba(56,189,248,.15),0 0 16px rgba(56,189,248,.5)"}}>
              <div style={{position:"absolute",inset:-6,borderRadius:"50%",border:"1px solid rgba(56,189,248,.3)",animation:"sonarPulse 2s ease-out infinite"}}/>
            </div>

            {/* Blip dots — simulated echo returns */}
            {[
              {x:62,y:88,s:6,c:"#38BDF8",o:.9,d:"0s"},
              {x:210,y:130,s:4,c:"#818CF8",o:.7,d:".3s"},
              {x:175,y:220,s:5,c:"#2DD4BF",o:.8,d:".6s"},
              {x:95,y:200,s:3,c:"#38BDF8",o:.5,d:"1s"},
              {x:240,y:190,s:4,c:"#818CF8",o:.6,d:"1.4s"},
              {x:130,y:65,s:3,c:"#2DD4BF",o:.55,d:"1.8s"},
            ].map(function(b,i){return(
              <div key={i} style={{
                position:"absolute",
                left:b.x,top:b.y,
                width:b.s,height:b.s,
                borderRadius:"50%",
                background:b.c,
                opacity:b.o,
                boxShadow:"0 0 "+(b.s*2)+"px "+b.c,
                animation:"breathe 3s ease-in-out infinite",
                animationDelay:b.d,
                transform:"translate(-50%,-50%)"
              }}/>
            );})}

            {/* ECG mini strip at bottom of visualization */}
            <div style={{position:"absolute",bottom:-32,left:0,right:0,height:28,overflow:"hidden"}}>
              <svg viewBox="0 0 320 28" style={{width:"100%",height:"100%"}}>
                <defs>
                  <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0"/>
                    <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.8"/>
                    <stop offset="70%" stopColor="#818CF8" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#818CF8" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path
                  d="M0,14 L40,14 L50,14 L55,2 L60,24 L65,8 L70,14 L90,14 L100,14 L105,2 L110,24 L115,8 L120,14 L160,14 L165,2 L170,24 L175,8 L180,14 L220,14 L225,2 L230,24 L235,8 L240,14 L280,14 L285,2 L290,24 L295,8 L300,14 L320,14"
                  fill="none"
                  stroke="url(#ecgGrad)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="900"
                  style={{animation:"ecgDraw 2.5s ease-out infinite,ecgFade 2.5s ease-out infinite"}}
                />
              </svg>
            </div>

            {/* Label */}
            <div style={{position:"absolute",top:-36,left:0,right:0,textAlign:"center"}}>
              <span style={{fontSize:10,color:"rgba(56,189,248,.45)",letterSpacing:"3px",textTransform:"uppercase",fontWeight:700}}>SCAN VISUALIZATION</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ MODALITY CARDS SECTION ════════ */}
      <div style={{position:"relative",zIndex:10,padding:"0 40px 100px"}}>

        {/* Section header */}
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28,animation:"fadeUp .6s ease .7s both"}}>
          <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(56,189,248,.2),rgba(56,189,248,.05))"}}/>
          <span style={{fontSize:11,color:"rgba(56,189,248,.5)",letterSpacing:"3px",textTransform:"uppercase",fontWeight:700,flexShrink:0}}>Choose Your Modality</span>
          <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(56,189,248,.05),rgba(56,189,248,.2))"}}/>
        </div>

        {/* 4-column card grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
          {Object.entries(T).map(function(entry, idx) {
            var name = entry[0], t = entry[1];
            var meta = {
              "Ultrasound": { desc:"Real-time soft tissue & organ imaging", wave:"sound", detail:"Abdomen · Pelvis · Vascular" },
              "X-Ray":      { desc:"Fast skeletal & chest assessment",       wave:"beam",  detail:"Chest · Spine · Extremity" },
              "CT Scan":    { desc:"High-res cross-sectional analysis",      wave:"scan",  detail:"Brain · Chest · Abdomen" },
              "MRI":        { desc:"Superior soft tissue characterisation",  wave:"mag",   detail:"Brain · MSK · Cardiac" }
            };
            var m = meta[name] || {};
            var totalSec = Object.values(t.sections).reduce(function(a,s){return a+s.length;},0);

            return (
              <div key={name} className="mc"
                style={{
                  borderRadius:18,overflow:"hidden",
                  background:"linear-gradient(160deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.02) 100%)",
                  border:"1px solid rgba(255,255,255,.07)",
                  backdropFilter:"blur(16px)",
                  padding:"0",
                  animation:"fadeUp .6s ease "+(0.75+idx*0.1)+"s both",
                  "--gc": t.color+"66"
                }}
                onClick={function(){ setModality(name); setStep("region"); }}>

                {/* Full-width colour header band */}
                <div style={{background:"linear-gradient(135deg,"+t.color+"50 0%,"+t.accent+"30 100%)",padding:"22px 22px 16px",borderBottom:"1px solid "+t.color+"20",position:"relative",overflow:"hidden"}}>

                  {/* Background shimmer circles unique to each card */}
                  <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"radial-gradient(circle,"+t.color+"25 0%,transparent 70%)"}}/>
                  <div style={{position:"absolute",right:20,bottom:-30,width:70,height:70,borderRadius:"50%",border:"1px solid "+t.color+"30"}}/>

                  {/* Icon */}
                  <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,"+t.color+"50,"+t.accent+"35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,border:"1px solid "+t.color+"50",marginBottom:10,position:"relative",zIndex:1,boxShadow:"0 4px 16px "+t.color+"40"}}>
                    {t.icon}
                  </div>

                  <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:"#fff",lineHeight:1.1,position:"relative",zIndex:1}}>{name}</div>
                  <div style={{fontSize:11,color:t.accent,marginTop:4,fontWeight:600,letterSpacing:".5px",position:"relative",zIndex:1}}>{m.detail||""}</div>
                </div>

                {/* Card body */}
                <div style={{padding:"16px 22px 20px"}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.38)",lineHeight:1.55,marginBottom:14}}>{m.desc||""}</div>

                  {/* Micro stats */}
                  <div style={{display:"flex",gap:14,marginBottom:16}}>
                    <div style={{flex:1,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,.04)",textAlign:"center"}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#fff",fontWeight:700}}>{t.regions.length}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:"1px",marginTop:1}}>Regions</div>
                    </div>
                    <div style={{flex:1,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,.04)",textAlign:"center"}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#fff",fontWeight:700}}>{totalSec}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:"1px",marginTop:1}}>Sections</div>
                    </div>
                  </div>

                  {/* Region chips */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>
                    {t.regions.slice(0,3).map(function(r){return(
                      <span key={r} style={{fontSize:9,padding:"3px 8px",borderRadius:12,background:t.color+"18",color:t.accent,border:"1px solid "+t.color+"25",fontWeight:600,letterSpacing:".3px"}}>{r}</span>
                    );})}
                    {t.regions.length>3 && <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.25)",border:"1px solid rgba(255,255,255,.08)"}}>+{t.regions.length-3}</span>}
                  </div>

                  {/* CTA */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:12}}>
                    <span style={{fontSize:11,color:"rgba(255,255,255,.2)",fontWeight:600,letterSpacing:".5px"}}>Begin Reporting</span>
                    <div className="mc-cta" style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:20,background:"linear-gradient(90deg,"+t.color+","+t.accent+")",fontSize:11,fontWeight:800,letterSpacing:".5px"}}>
                      START →
                    </div>
                  </div>
                </div>

                {/* Bottom glow bar */}
                <div className="mc-glow" style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"linear-gradient(90deg,"+t.color+","+t.accent+")"}} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════ FIXED BOTTOM TICKER ════════ */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,height:44,borderTop:"1px solid rgba(56,189,248,.1)",background:"rgba(4,9,15,.92)",backdropFilter:"blur(20px)",overflow:"hidden",display:"flex",alignItems:"center"}}>
        {/* LEFT badge */}
        <div style={{flexShrink:0,padding:"0 18px",borderRight:"1px solid rgba(56,189,248,.1)",height:"100%",display:"flex",alignItems:"center",gap:7,background:"rgba(56,189,248,.04)"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22D3EE",animation:"breathe 1.5s ease-in-out infinite"}}/>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:"2px",color:"#22D3EE"}}>LIVE</span>
        </div>
        {/* Scrolling items */}
        <div style={{flex:1,overflow:"hidden",position:"relative"}}>
          <div style={{display:"flex",gap:0,animation:"tickerScroll 24s linear infinite",width:"max-content"}}>
            {[
              ["✨","AI sentence expansion on every field"],
              ["🎤","Voice dictation — mic button on every field"],
              ["📋","Complete structured radiology templates"],
              ["🏷️","Normal / Abnormal tagging per field"],
              ["🔁","Auto-retry on API rate limits"],
              ["🖨️","Print-ready professional PDF reports"],
              ["🧲","MRI · CT · X-Ray · Ultrasound covered"],
              ["⚡","Impression generation from all findings"],
              ["✨","AI sentence expansion on every field"],
              ["🎤","Voice dictation — mic button on every field"],
              ["📋","Complete structured radiology templates"],
              ["🏷️","Normal / Abnormal tagging per field"],
            ].map(function(item,i){return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"0 28px",borderRight:"1px solid rgba(255,255,255,.04)",whiteSpace:"nowrap"}}>
                <span style={{fontSize:13}}>{item[0]}</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,.35)",fontWeight:500}}>{item[1]}</span>
              </div>
            );})}
          </div>
        </div>
        {/* RIGHT version badge */}
        <div style={{flexShrink:0,padding:"0 18px",borderLeft:"1px solid rgba(56,189,248,.1)",height:"100%",display:"flex",alignItems:"center"}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,.2)",letterSpacing:"1px",fontWeight:600}}>v2.0 PRO</span>
        </div>
      </div>

    </div>
  );

  /* ══ REGION ══ */
  if (step === "region") return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Toast msg={toast&&toast.msg} type={toast&&toast.type} onClose={function(){setToast(null);}} />
      <AppHdr onBack backTo="home" setStep={setStep} sub={modality} />
      <div style={pg}>
        <div style={{padding:"28px 0 20px"}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:C.navy}}>{tpl.icon} {modality} — Select Region</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:12}}>
          {tpl.regions.map(function(r) {
            return (
              <div key={r} className="hr" style={{"--hc":C.col,"--hbg":C.col+"08",background:C.sur,borderRadius:10,padding:"20px 16px",border:"2px solid "+C.bdr,textAlign:"center"}}
                onClick={function(){ setRegion(r); setStep("patient"); }}>
                <div style={{fontWeight:700,fontSize:14,color:C.navy}}>{r}</div>
                <div style={{fontSize:11,color:C.soft,marginTop:4}}>{(tpl.sections[r]||[]).length} sections</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ══ PATIENT ══ */
  if (step === "patient") return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Toast msg={toast&&toast.msg} type={toast&&toast.type} onClose={function(){setToast(null);}} />
      <AppHdr onBack backTo="region" setStep={setStep} sub={modality+" › "+region+" › Patient Info"} />
      <div style={pg}>
        <div style={crd}>
          <div style={cHd(C.col)}><span style={{fontSize:20}}>👤</span><b style={{color:C.navy,fontSize:15}}>Patient & Study Information</b></div>
          <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div><label style={lbl}>Patient Name</label><input className="ri" style={inp()} placeholder="Full name" value={patient.name} onChange={function(e){setPatient(function(p){return Object.assign({},p,{name:e.target.value});});}} /></div>
            <div><label style={lbl}>Age / DOB</label><input className="ri" style={inp()} placeholder="e.g. 45 yrs" value={patient.age} onChange={function(e){setPatient(function(p){return Object.assign({},p,{age:e.target.value});});}} /></div>
            <div><label style={lbl}>Sex</label>
              <select className="ri" style={inp({cursor:"pointer"})} value={patient.sex} onChange={function(e){setPatient(function(p){return Object.assign({},p,{sex:e.target.value});});}}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div><label style={lbl}>Study Date</label><input className="ri" type="date" style={inp()} value={patient.studyDate} onChange={function(e){setPatient(function(p){return Object.assign({},p,{studyDate:e.target.value});});}} /></div>
            <div><label style={lbl}>Referred By</label><input className="ri" style={inp()} placeholder="Dr. Name / Dept" value={patient.refBy} onChange={function(e){setPatient(function(p){return Object.assign({},p,{refBy:e.target.value});});}} /></div>
            <div><label style={lbl}>Reporting Doctor</label><input className="ri" style={inp()} placeholder="Radiologist name" value={patient.reportingDoc} onChange={function(e){setPatient(function(p){return Object.assign({},p,{reportingDoc:e.target.value});});}} /></div>
            <div><label style={lbl}>Institution</label><input className="ri" style={inp()} placeholder="Hospital / Clinic" value={patient.institution} onChange={function(e){setPatient(function(p){return Object.assign({},p,{institution:e.target.value});});}} /></div>
            <div style={{gridColumn:"1/-1"}}><label style={lbl}>Clinical History / Indication</label>
              <textarea className="ri" style={ta({minHeight:60})} placeholder="e.g. Pain RUQ, rule out cholelithiasis…" value={patient.clinicalInfo} onChange={function(e){setPatient(function(p){return Object.assign({},p,{clinicalInfo:e.target.value});});}} />
            </div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button style={btn(C.col)} disabled={!patient.name} onClick={function(){setStep("template");}}>Continue to Findings →</button>
        </div>
      </div>
    </div>
  );

  /* ══ FINDINGS ══ */
  if (step === "template") return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Toast msg={toast&&toast.msg} type={toast&&toast.type} onClose={function(){setToast(null);}} />
      <AppHdr onBack backTo="patient" setStep={setStep} sub={modality+" › "+region+" › Findings"}
        right={<div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>{patient.name}</span>
          <button style={btn(tpl.accent)} onClick={function(){setStep("impression");}}>Impression →</button>
        </div>}
      />
      <div style={pg}>
        {/* tip banner */}
        <div style={{marginBottom:16,padding:"13px 18px",background:"#F0FDFA",borderRadius:10,border:"1px solid #99F6E4",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>🎤</span>
              <div><div style={{fontWeight:700,fontSize:13,color:C.mic}}>Voice on every field</div><div style={{fontSize:11,color:"#0F766E"}}>Click 🎤 → instructions shown</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>✨</span>
              <div><div style={{fontWeight:700,fontSize:13,color:C.ai}}>AI on every field</div><div style={{fontSize:11,color:"#6366F1"}}>Type → ✨ AI → professional sentence</div></div>
            </div>
          </div>
          <button onClick={markAllNormal} style={Object.assign(obtn(C.ok),{padding:"7px 14px",fontSize:12,whiteSpace:"nowrap"})}>✓ Mark All Normal</button>
        </div>

        {/* recording indicator */}
        {activeKey && activeKey !== "impression" && (
          <div style={{marginBottom:12,padding:"10px 16px",background:"#FEF2F2",border:"2px solid #FCA5A5",borderRadius:10,display:"flex",alignItems:"center",gap:10,animation:"breathe 1s ease-in-out infinite"}}>
            <span style={{fontSize:16}}>🔴</span>
            <span style={{fontWeight:700,fontSize:13,color:"#DC2626"}}>Recording — speak clearly, then click ⏹ to stop</span>
          </div>
        )}

        {sections.map(function(sec) {
          var sk = "sec__"+sec.label;
          return (
            <div key={sec.label} style={crd}>
              <div style={cHd(C.col)}>
                <span style={{fontWeight:700,fontSize:14,color:C.navy,flex:1}}>{sec.label}</span>
                <AIBtn onClick={function(){expandSection(sec);}} loading={!!aiLoad[sk]} disabled={false} />
                <span style={{fontSize:11,color:C.soft}}>Expand All</span>
                <button onClick={function(){
                  var f = Object.assign({}, findings), t = Object.assign({}, tags);
                  sec.fields.forEach(function(fl){ f[sec.label+"__"+fl]="within normal limits"; t[sec.label+"__"+fl]="n"; });
                  setFindings(f); setTags(t);
                }} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",background:C.bdr,color:C.soft}}>✓ All Normal</button>
              </div>
              <div style={{padding:20}}>
                {sec.fields.map(function(field) {
                  var k = sec.label+"__"+field;
                  return (
                    <FindingField
                      key={field}
                      sl={sec.label}
                      field={field}
                      val={getF(sec.label, field)}
                      tag={getT(sec.label, field)}
                      aiLoading={!!aiLoad[k]}
                      isRec={activeKey === k}
                      isDictating={dictKey === k}
                      activeKey={activeKey}
                      dictKey={dictKey}
                      voiceStart={voiceStart}
                      voiceStop={voiceStop}
                      cancelDictation={cancelDictation}
                      onChange={function(v){ setF(sec.label, field, v); }}
                      onTag={function(t){ togT(sec.label, field, t); }}
                      onAI={function(){ expandField(sec.label, field); }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{display:"flex",justifyContent:"flex-end",gap:12}}>
          <button style={obtn(C.soft)} onClick={function(){setStep("patient");}}>← Patient</button>
          <button style={btn(C.col)} onClick={function(){setStep("impression");}}>Next: Impression →</button>
        </div>
      </div>
    </div>
  );

  /* ══ IMPRESSION ══ */
  if (step === "impression") return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Toast msg={toast&&toast.msg} type={toast&&toast.type} onClose={function(){setToast(null);}} />
      <AppHdr onBack backTo="template" setStep={setStep} sub="Impression & Recommendations"
        right={<button style={btn(C.col)} onClick={function(){setStep("preview");}}>Preview Report →</button>}
      />
      <div style={pg}>
        <div style={crd}>
          <div style={cHd(C.col)}><span style={{fontSize:20}}>📋</span><b style={{color:C.navy,fontSize:15}}>Impression / Conclusion</b></div>
          <div style={{padding:20}}>
            <div style={{marginBottom:18,padding:"16px 18px",background:C.aiL,borderRadius:12,border:"1px solid #C7D2FE"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.ai,marginBottom:12}}>✨ AI + 🎤 Voice Tools</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
                <button onClick={generateImpression} disabled={!!aiLoad["impression"]}
                  style={Object.assign(btn(aiLoad["impression"]?"#5B21B6":"linear-gradient(135deg,#4F46E5,#7C3AED)"),{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 18px",animation:aiLoad["impression"]?"aiGlow 1.1s infinite":"none",cursor:aiLoad["impression"]?"wait":"pointer"})}>
                  <span style={{display:"inline-block",animation:aiLoad["impression"]?"spin .8s linear infinite":"none",fontSize:15}}>{aiLoad["impression"]?"⟳":"✨"}</span>
                  {aiLoad["impression"] ? "Writing…" : "Generate from All Findings"}
                </button>
                <button onClick={expandImpression} disabled={!!aiLoad["impExp"]||!impression.trim()}
                  style={Object.assign(obtn("#7C3AED"),{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 18px",opacity:(!impression.trim()||aiLoad["impExp"])?.4:1,cursor:(!impression.trim()||aiLoad["impExp"])?"not-allowed":"pointer",color:"#7C3AED"})}>
                  <span style={{display:"inline-block",animation:aiLoad["impExp"]?"spin .8s linear infinite":"none"}}>{aiLoad["impExp"]?"⟳":"✨"}</span>
                  {aiLoad["impExp"] ? "Expanding…" : "Expand My Draft"}
                </button>
                <button onClick={function(){activeKey==="impression"?voiceStop():voiceStart("impression");}}
                  style={Object.assign(btn(activeKey==="impression"?"linear-gradient(135deg,#DC2626,#EF4444)":"linear-gradient(135deg,#0F766E,#14B8A6)"),{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 18px",animation:activeKey==="impression"?"micPulse 1s infinite":"none"})}>
                  <span style={{fontSize:16}}>{activeKey==="impression"?"⏹":"🎤"}</span>
                  {activeKey==="impression" ? "Stop Recording" : "Voice Dictation"}
                </button>
              </div>
              <div style={{fontSize:11,color:"#6366F1"}}><b>Generate</b> — reads all findings &nbsp;|&nbsp; <b>Expand</b> — elaborates your draft &nbsp;|&nbsp; <b>🎤 Voice</b> — dictate directly</div>
            </div>
            <label style={lbl}>Impression Text</label>
            <textarea className="ri" style={ta({minHeight:150,borderColor:activeKey==="impression"?"#DC2626":(aiLoad["impression"]||aiLoad["impExp"])?"#7C3AED":C.bdr,background:activeKey==="impression"?"#FFF5F5":(aiLoad["impression"]||aiLoad["impExp"])?"#F5F3FF":"#FAFCFF"})}
              placeholder={activeKey==="impression"?"🔴 Listening… speak now":"Type, dictate, or use AI…"}
              value={impression} onChange={function(e){setImpression(e.target.value);}} />
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>
              {["No significant abnormality detected. Study within normal limits.","Correlate clinically.","Follow-up recommended."].map(function(p){return(
                <span key={p} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#EEF4FF",color:C.navy,cursor:"pointer",border:"1px solid "+C.bdr,fontWeight:500}} onClick={function(){setImpression(function(v){return v?v+" "+p:p;});}}>
                  {p}
                </span>
              );})}
            </div>
          </div>
        </div>
        <div style={crd}>
          <div style={cHd(C.col)}><span style={{fontSize:20}}>⚡</span><b style={{color:C.navy,fontSize:15}}>Urgency & Recommendations</b></div>
          <div style={{padding:20}}>
            <label style={lbl}>Report Urgency</label>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
              {[["Routine",C.ok],["Urgent",C.warn],["Critical – Notify Immediately",C.err]].map(function(u){return(
                <button key={u[0]} onClick={function(){setUrgency(u[0]);}} style={{padding:"8px 16px",borderRadius:8,fontWeight:700,fontSize:12,cursor:"pointer",border:"2px solid "+(urgency===u[0]?u[1]:C.bdr),background:urgency===u[0]?u[1]:"transparent",color:urgency===u[0]?"#fff":C.soft,fontFamily:"'DM Sans',sans-serif"}}>{u[0]}</button>
              );})}
            </div>
            <label style={lbl}>Recommendations</label>
            <textarea className="ri" style={ta()} placeholder="e.g. Clinical correlation recommended. Follow-up in 6 months…" value={recommendation} onChange={function(e){setRec(e.target.value);}} />
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:12}}>
          <button style={obtn(C.soft)} onClick={function(){setStep("template");}}>← Findings</button>
          <button style={btn(C.col)} onClick={function(){setStep("preview");}}>Generate Report →</button>
        </div>
      </div>
    </div>
  );

  /* ══ PREVIEW ══ */
  if (step === "preview") {
    var abnF = Object.entries(tags).filter(function(e){ return e[1]==="ab"; });
    var hasAbn = abnF.length > 0;
    return (
      <div style={{fontFamily:"'DM Sans',sans-serif",background:C.bg,minHeight:"100vh"}}>
        <style>{CSS}</style>
        <AppHdr setStep={setStep} sub="Report Preview"
          right={<div style={{display:"flex",gap:10}}>
            <button style={obtn("#fff")} onClick={function(){window.print();}}>🖨️ Print / PDF</button>
            <button style={btn(C.err)} onClick={reset}>🔄 New Report</button>
          </div>}
        />
        <div ref={printRef} style={{maxWidth:860,margin:"0 auto",padding:"28px 20px"}}>
          {/* header card */}
          <div style={Object.assign({},crd,{marginBottom:20})}>
            <div style={{background:"linear-gradient(135deg,#0D2137,#1A3A5C)",padding:"22px 32px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#fff"}}>{patient.institution||"RadReport Pro"}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.55)",letterSpacing:1.5,textTransform:"uppercase"}}>Radiology & Imaging Report</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>Study Date</div>
                <div style={{fontSize:15,color:"#fff",fontWeight:700}}>{patient.studyDate}</div>
                <div style={{marginTop:8,padding:"4px 14px",borderRadius:20,fontSize:11,fontWeight:800,background:urgency==="Routine"?C.ok:urgency==="Urgent"?C.warn:C.err,color:"#fff"}}>{urgency.toUpperCase()}</div>
              </div>
            </div>
            <div style={{padding:"14px 32px",background:"#F8FAFC",borderBottom:"1px solid "+C.bdr,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
              {[["Patient",patient.name],["Age / Sex",patient.age+" / "+patient.sex],["Referred By",patient.refBy||"—"],["Reporting Doctor",patient.reportingDoc||"—"]].map(function(x){return(
                <div key={x[0]}><div style={{fontSize:10,fontWeight:700,color:C.soft,textTransform:"uppercase",letterSpacing:.8}}>{x[0]}</div><div style={{fontSize:14,fontWeight:600,color:C.navy,marginTop:2}}>{x[1]||"—"}</div></div>
              );})}
            </div>
            <div style={{padding:"14px 32px",display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:22}}>{tpl.icon}</span>
                <div><div style={{fontSize:10,fontWeight:700,color:C.soft,textTransform:"uppercase"}}>Modality</div><div style={{fontSize:15,fontWeight:700,color:C.navy}}>{modality} — {region}</div></div>
              </div>
              {patient.clinicalInfo && (
                <div style={{flex:1,padding:"10px 14px",background:"#F0F4FF",borderRadius:8,borderLeft:"3px solid "+C.col}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.soft,textTransform:"uppercase"}}>Clinical History</div>
                  <div style={{fontSize:13,color:C.txt,marginTop:2}}>{patient.clinicalInfo}</div>
                </div>
              )}
              {hasAbn && <div style={{padding:"8px 14px",borderRadius:8,background:"#FFF0EE",border:"1px solid #FFCCC7"}}><div style={{fontSize:10,fontWeight:700,color:C.err,textTransform:"uppercase"}}>Abnormal</div><div style={{fontSize:14,fontWeight:800,color:C.err}}>{abnF.length} field(s)</div></div>}
            </div>
          </div>
          {/* findings */}
          <div style={crd}>
            <div style={Object.assign(cHd(C.col),{background:"linear-gradient(90deg,"+C.col+"18,transparent)"})}><span style={{fontFamily:"'DM Serif Display',serif",fontSize:17,color:C.navy}}>Findings</span></div>
            <div style={{padding:"20px 32px"}}>
              {sections.map(function(sec){
                var rows = sec.fields.filter(function(f){ return getF(sec.label,f)||getT(sec.label,f); });
                if (!rows.length) return null;
                return (
                  <div key={sec.label} style={{marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0 10px"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:C.col}} />
                      <div style={{fontWeight:800,fontSize:12,color:C.col,textTransform:"uppercase",letterSpacing:1}}>{sec.label}</div>
                      <div style={{flex:1,height:1,background:C.bdr}} />
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
                      {sec.fields.map(function(field){
                        var v = getF(sec.label,field), t = getT(sec.label,field);
                        if (!v && !t) return null;
                        return (
                          <tr key={field} style={{borderBottom:"1px solid "+C.bdr}}>
                            <td style={{padding:"7px 0",fontSize:13,fontWeight:600,color:C.soft,width:200,verticalAlign:"top"}}>{field}</td>
                            <td style={{padding:"7px 12px",fontSize:13,color:t==="ab"?C.err:C.txt,fontWeight:t==="ab"?600:400,verticalAlign:"top"}}>{v||"—"}</td>
                            <td style={{padding:"7px 0",textAlign:"right",verticalAlign:"top"}}>
                              {t && <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,background:t==="n"?"#E8F8F2":"#FEECEC",color:t==="n"?C.ok:C.err,border:"1px solid "+(t==="n"?"#A8E6CF":"#FFACAC")}}>{t==="n"?"NORMAL":"ABNORMAL"}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                );
              })}
            </div>
          </div>
          {impression && (
            <div style={Object.assign({},crd,{border:"2px solid "+(hasAbn?"#FFACAC":"#A8E6CF")})}>
              <div style={Object.assign(cHd(hasAbn?C.err:C.ok),{background:hasAbn?"#FFF5F5":"#F5FFF9"})}><span style={{fontFamily:"'DM Serif Display',serif",fontSize:17,color:C.navy}}>Impression & Conclusion</span></div>
              <div style={{padding:"20px 32px",fontSize:14,lineHeight:1.85,color:C.txt,whiteSpace:"pre-wrap"}}>{impression}</div>
            </div>
          )}
          {recommendation && (
            <div style={crd}>
              <div style={cHd(C.warn)}><span style={{fontFamily:"'DM Serif Display',serif",fontSize:17,color:C.navy}}>Recommendations</span></div>
              <div style={{padding:"20px 32px",fontSize:14,lineHeight:1.85,whiteSpace:"pre-wrap",color:C.txt}}>{recommendation}</div>
            </div>
          )}
          <div style={{background:C.sur,borderRadius:12,padding:"22px 32px",border:"1px solid "+C.bdr,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            <div style={{fontSize:11,color:C.soft}}>Report generated: {new Date().toLocaleString()}<br/>For clinical use by qualified medical practitioners only.</div>
            <div style={{textAlign:"right"}}>
              <div style={{width:180,borderBottom:"2px solid "+C.navy,marginBottom:6}} />
              <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{patient.reportingDoc||"Reporting Physician"}</div>
              <div style={{fontSize:11,color:C.soft}}>{modality} Reporting</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(<RadReport />);
