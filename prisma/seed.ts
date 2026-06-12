import { PrismaClient, Dimension } from "@prisma/client";

const prisma = new PrismaClient();

type Term = { value: string; label?: string; definition: string };

function labelize(value: string) {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const GLOSSARY: { dimension: Dimension; prefix: string; terms: Term[] }[] = [
  {
    dimension: "BATCH",
    prefix: "",
    terms: [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ].map((m) => ({
      value: m,
      label: m,
      definition: `Production batch of the ${m} monthly creative sprint. First token of every ad name, uppercase, no prefix.`,
    })),
  },
  {
    dimension: "FORMAT",
    prefix: "ft.",
    terms: [
      { value: "static", definition: "Single still image ad (PNG/JPG). The default output of a Figma frame." },
      { value: "video", definition: "Filmed or edited video ad with motion and usually sound (MP4)." },
      { value: "carrousel", definition: "Multi-card ad where the viewer swipes through a sequence of images." },
      { value: "ugc", definition: "User-generated-content style ad: creator-shot, authentic, non-studio look." },
      { value: "motion", definition: "Animated graphic ad (motion design), between static and full video." },
    ],
  },
  {
    dimension: "AWARENESS",
    prefix: "al.",
    terms: [
      { value: "unaware", definition: "Audience doesn't yet realize they have the problem. Ad must create the itch before anything else." },
      { value: "problem-aware", definition: "Audience feels the pain (admin overload, slow refunds…) but doesn't know solutions exist." },
      { value: "solution-aware", definition: "Audience knows solutions like digital health insurance exist, but not Alan specifically." },
      { value: "product-aware", definition: "Audience knows Alan; the ad must differentiate and prove value vs. alternatives." },
      { value: "most-aware", definition: "Audience is ready to buy; the ad pushes the offer, price or a direct call to action." },
    ],
  },
  {
    dimension: "ANGLE",
    prefix: "a.",
    terms: [
      { value: "administrative-overload", definition: "Pain: drowning in insurance paperwork, forms and processes. Exists without Alan." },
      { value: "waiting-anxiety", definition: "Pain: the stress of waiting — for reimbursements, appointments, or answers." },
      { value: "lack-of-control", definition: "Pain: not knowing what's covered, what's pending, or what things will cost." },
      { value: "health-uncertainty", definition: "Pain: not knowing whether a symptom is serious or where to turn for care." },
      { value: "mental-load", definition: "Pain: health admin is one more invisible burden on top of everything else." },
      { value: "trust-fatigue", definition: "Pain: burned by opaque insurers, fine print and broken promises." },
      { value: "lack-of-time", definition: "Pain: no time for calls, queues and offices to manage health or coverage." },
      { value: "budget-pressure", definition: "Pain: health coverage feels expensive; every euro of the budget is scrutinized." },
      { value: "value-for-money", definition: "Pain: doubt about whether the current insurance is actually worth what it costs." },
      { value: "reimbursement-friction", definition: "Pain: slow, confusing, multi-step reimbursements with unclear status." },
      { value: "bad-habits", definition: "Pain: knowing one's daily habits (sitting, stress, sleep) hurt health but lacking a push to change." },
      { value: "health-last", definition: "Pain: always putting one's own health last, behind work and family." },
      { value: "health-ROI", definition: "Pain (employer): unclear return on investment of health benefits spend for the company." },
      { value: "complex-care-journey", definition: "Pain: navigating the care system (referrals, specialists, paperwork) is a maze." },
      { value: "lack-of-innovation", definition: "Pain: legacy insurers feel stuck in the past — paper, mail, branch offices." },
    ],
  },
  {
    dimension: "VALUE_PROP",
    prefix: "vp.",
    terms: [
      { value: "fast-reimbursement", definition: "Alan reimburses fast — hours, not weeks. Counterpart to reimbursement-friction." },
      { value: "human-support", definition: "Real humans answer quickly; no phone trees or ticket purgatory." },
      { value: "transparent-pricing", definition: "Prices and coverage are clear up front, no fine print or surprises." },
      { value: "preventive-care", definition: "Alan helps you stay healthy (programs, check-ins), not just pay when you're sick." },
      { value: "all-in-one-app", definition: "Insurance, care, and health services unified in a single app." },
      { value: "medical-access", definition: "Quick access to doctors and care through Alan (chat, clinic, callbacks)." },
      { value: "transparent", definition: "Radical transparency as a company value — pricing, coverage, communication." },
      { value: "peace-of-mind", definition: "With Alan, health is handled; members can stop worrying." },
      { value: "simplicity", definition: "Everything is simple: enrolling, claiming, understanding coverage." },
      { value: "tailored-pricing", definition: "Pricing adapted to the company or person's actual situation and needs." },
      { value: "integrated-model", definition: "Insurer + care provider in one integrated model, removing middlemen." },
      { value: "trust-proof", definition: "Proof of trustworthiness: member counts, ratings, testimonials, press." },
      { value: "data-privacy", definition: "Health data stays private and secure; Alan is a trustworthy data steward." },
      { value: "on-demand-health", definition: "Health help when you need it, instantly, from your phone." },
      { value: "no-out-of-pocket", definition: "Members don't advance money — direct payment (tiers payant) handles it." },
      { value: "integrated-shopping", definition: "Health products (glasses, etc.) purchasable directly via Alan (shop)." },
      { value: "premium-accessible", definition: "Premium-quality coverage and care at an accessible price point." },
      { value: "gamification", definition: "Health engagement made motivating through play (challenges, streaks, duels)." },
    ],
  },
  {
    dimension: "FEATURE",
    prefix: "f.",
    terms: [
      { value: "24h-refund", definition: "Reimbursement within 24 hours of submitting a claim." },
      { value: "alan-shop", definition: "In-app shop for health products (e.g. glasses) with coverage applied." },
      { value: "alan-play", definition: "Alan Play: gamified health activities and challenges in the app." },
      { value: "1h-callback", definition: "A doctor or advisor calls you back within one hour." },
      { value: "5min-coverage", definition: "Get covered in 5 minutes — fully online enrollment." },
      { value: "mobile-app", definition: "The Alan mobile app itself as the product surface." },
      { value: "backpain-programm", definition: "Guided back-pain prevention/relief program in the app." },
      { value: "alan-clinic", definition: "Alan Clinic: in-house medical consultations." },
      { value: "bundle-features", definition: "Several features presented together as a bundle (no single hero feature)." },
      { value: "claim-view", definition: "Real-time view of claim/reimbursement status in the app." },
      { value: "digital-tiers-payant", definition: "Digital direct-payment card — no advancing money at the pharmacy." },
      { value: "stress-programm", definition: "Guided stress-management program in the app." },
      { value: "optic", definition: "Optical coverage and services (glasses, lenses)." },
      { value: "mo", definition: "Mo: Alan's AI health assistant in the app." },
      { value: "nofeatures", definition: "Explicitly no feature highlighted — brand or pure angle-led creative." },
      { value: "admin-dashboard", definition: "The HR/admin dashboard for managing company coverage." },
      { value: "price", definition: "The price itself is the highlighted element of the ad." },
    ],
  },
  {
    dimension: "TONE",
    prefix: "t.",
    terms: [
      { value: "humorous", definition: "Makes the viewer laugh; comedy carries the message." },
      { value: "factual", definition: "Dry facts and figures, minimal styling of the message." },
      { value: "serious", definition: "Grave, weighty register for topics that deserve it." },
      { value: "informative", definition: "Teaches the viewer something useful; educational register." },
      { value: "provocatif", definition: "Deliberately provocative; challenges norms to trigger a reaction." },
      { value: "empathetic", definition: "Leads with understanding of the viewer's situation and feelings." },
      { value: "authentic", definition: "Raw, real, unpolished; feels like a person, not a brand." },
      { value: "reassuring", definition: "Calms the viewer's worry; safety and care register." },
      { value: "direct", definition: "Straight to the point, no detours; assertive phrasing." },
      { value: "cute", definition: "Adorable register (e.g. the marmot); warmth through charm." },
      { value: "confident", definition: "Self-assured brand voice; states strengths without hedging." },
    ],
  },
  {
    dimension: "SEGMENT",
    prefix: "s.",
    terms: [
      { value: "company", definition: "B2B: companies buying health coverage for their employees." },
      { value: "tns", definition: "Travailleurs non salariés — self-employed / independent workers." },
      { value: "retiree", definition: "Retired individuals buying personal coverage." },
      { value: "all", definition: "No specific segment; broad-reach creative." },
    ],
  },
  {
    dimension: "PERSONA",
    prefix: "p.",
    terms: [
      { value: "business-owner", definition: "Founder/CEO/manager deciding on company health coverage." },
      { value: "hr", definition: "HR professional managing employee benefits day to day." },
      { value: "freelance", definition: "Independent professional covering themselves." },
      { value: "lawyer", definition: "Legal professionals — a specific independent vertical." },
      { value: "cse", definition: "Works-council (CSE) members influencing benefits choices." },
      { value: "connected-woman", definition: "Digitally savvy woman managing health for herself or her family." },
      { value: "parent", definition: "Parent managing the family's health and coverage." },
      { value: "remote-worker", definition: "Remote/hybrid employee with digital-first expectations." },
      { value: "all", definition: "No specific persona; broad-reach creative." },
    ],
  },
  {
    dimension: "CONCEPT",
    prefix: "c.",
    terms: [
      { value: "chat-conversation", definition: "Ad framed as a chat/messaging conversation." },
      { value: "comparison", definition: "Side-by-side comparison (Alan vs. legacy insurer, before/after)." },
      { value: "product-demo", definition: "Shows the product in use — screens, flows, real interactions." },
      { value: "testimonial", definition: "A member or customer speaks about their experience." },
      { value: "lockscreen", definition: "Framed as a phone lock screen with notifications." },
      { value: "historicalfigures", definition: "Historical figures placed in modern health-insurance situations." },
      { value: "OOH", definition: "Out-of-home style visual (billboard, metro poster) repurposed for digital." },
      { value: "rightclick", definition: "Desktop right-click context-menu visual metaphor." },
      { value: "face-cam-story", definition: "Creator talks to camera, story-style vertical video." },
      { value: "journey-moment", definition: "A slice-of-life moment in a member's care journey." },
      { value: "notification-ui", definition: "Built around a push-notification UI element." },
      { value: "game-ui", definition: "Styled like a video-game interface." },
      { value: "linkedin-post", definition: "Styled as a LinkedIn post screenshot." },
      { value: "marmot+text", definition: "The Alan marmot mascot paired with a text message." },
      { value: "product-ui", definition: "App UI itself is the hero visual." },
      { value: "multitaskingmarmot", definition: "The marmot juggling many tasks — mascot dramatization of overload." },
      { value: "offer-stack", definition: "Visual stack/list of everything included in the offer." },
      { value: "pov", definition: "Point-of-view framing (\"POV: you …\") meme format." },
      { value: "ai-marmot", definition: "AI-generated marmot visuals." },
      { value: "hold-to-speed", definition: "Uses the hold-to-fast-forward video gesture as a hook mechanic." },
      { value: "viral-trend", definition: "Rides a current viral format or meme template." },
      { value: "meditation-exercise", definition: "Guided meditation/breathing exercise format." },
      { value: "stat-over-activity", definition: "A bold statistic overlaid on footage of an everyday activity." },
      { value: "timelapse", definition: "Timelapse footage as the visual backbone." },
      { value: "farwest", definition: "Far-west / western movie pastiche." },
      { value: "press-article", definition: "Styled as a press article or news clipping." },
      { value: "member-count", definition: "Hero number of members/companies as social proof." },
      { value: "text+cards", definition: "Headline text plus a row of feature/benefit cards." },
      { value: "text+photo", definition: "Headline text over a photograph." },
      { value: "feature-cards", definition: "Cards each highlighting one feature." },
      { value: "ai-video", definition: "AI-generated video creative." },
      { value: "aftermovie", definition: "Event aftermovie style edit." },
      { value: "dashboard+avatars", definition: "Admin dashboard visual with employee avatars." },
      { value: "streaks", definition: "Built around streak mechanics (daily consistency)." },
      { value: "movewithKM", definition: "\"Move with Kylian Mbappé\" fitness campaign concept." },
      { value: "pressphoto", definition: "Press-style photography as the creative base." },
      { value: "stepduel", definition: "Step-count duel/challenge between colleagues." },
      { value: "podcast", definition: "Framed as a podcast clip or studio setting." },
      { value: "instagrampool", definition: "Instagram poll/story interaction format." },
      { value: "demo-cta", definition: "Product demo cut that drives straight to a CTA." },
      { value: "app-review", definition: "Built around a real app-store review." },
      { value: "apologies", definition: "Brand 'apology' framing as attention device." },
      { value: "strava", definition: "Styled as a Strava activity screenshot." },
      { value: "glasses", definition: "Glasses/optic-centric visual concept." },
      { value: "ugc", definition: "Creator-made UGC as the concept itself." },
    ],
  },
  {
    dimension: "HOOK",
    prefix: "h.",
    terms: [
      { value: "bold-statement", definition: "Opens with a daring claim that demands attention." },
      { value: "visual-contrast", definition: "Strong visual before/after or clash stops the scroll." },
      { value: "ui-focus", definition: "Zoom on a UI detail viewers recognize instantly." },
      { value: "layer-removal", definition: "Visual layers peel away to reveal the message." },
      { value: "statistic", definition: "Leads with a striking number or stat." },
      { value: "familiar-ui", definition: "Mimics an interface viewers use daily (chat, notifications…)." },
      { value: "cta-focus", definition: "The call-to-action itself is the visual hook." },
      { value: "question", definition: "Opens with a question the viewer wants answered." },
      { value: "persona-callout", definition: "Names the viewer directly (\"HR managers, …\")." },
      { value: "dog", definition: "A dog. Works every time." },
      { value: "viraltopic", definition: "Hooks onto a topic currently going viral." },
      { value: "cta-first", definition: "Starts with the CTA before any setup." },
      { value: "social-trend", definition: "Uses a current social-media trend or sound." },
      { value: "interactive-feature", definition: "Invites interaction (tap, hold, vote) as the hook." },
      { value: "celebrity-twist", definition: "A celebrity appears in an unexpected context." },
      { value: "insta-comment", definition: "Framed as an Instagram comment exchange." },
      { value: "stop-scroll", definition: "Pure pattern-interrupt visual designed to halt scrolling." },
      { value: "pattern-break", definition: "Breaks the expected format of the feed or genre." },
      { value: "familliar-logo", definition: "A well-known logo, twisted. (Legacy spelling kept as-is.)" },
      { value: "sneeze", definition: "A sneeze as the opening beat — universal health moment." },
      { value: "tension-build", definition: "Slow build of tension that keeps viewers watching." },
      { value: "big-number", definition: "An oversized number dominates the first frame." },
      { value: "shock-statement", definition: "A shocking claim that viewers must verify by watching." },
      { value: "price", definition: "The price, front and center, as the hook." },
      { value: "nohook", definition: "Deliberately no hook device — straight delivery." },
      { value: "kylian-mbappe", definition: "Kylian Mbappé's appearance is itself the hook." },
    ],
  },
  {
    dimension: "CONCEPT_VAR",
    prefix: "cv.",
    terms: [
      { value: "marmot", definition: "The Alan marmot mascot appears in the execution." },
      { value: "macron", definition: "Macron reference in the execution." },
      { value: "pharmacy-scene", definition: "Scene set in a pharmacy." },
      { value: "app-store-rating", definition: "App Store rating shown in the execution." },
    ],
  },
  {
    dimension: "MARKET",
    prefix: "m.",
    terms: [
      { value: "fr", label: "France", definition: "French market (default for legacy assets that carry no m. token)." },
      { value: "es", label: "Spain", definition: "Spanish market." },
      { value: "be", label: "Belgium", definition: "Belgian market." },
      { value: "ca", label: "Canada", definition: "Canadian market." },
    ],
  },
];

async function main() {
  let created = 0;
  for (const { dimension, prefix, terms } of GLOSSARY) {
    for (const term of terms) {
      await prisma.nomenclatureTerm.upsert({
        where: { dimension_value: { dimension, value: term.value } },
        update: { prefix, label: term.label ?? labelize(term.value), definition: term.definition },
        create: {
          dimension,
          prefix,
          value: term.value,
          label: term.label ?? labelize(term.value),
          definition: term.definition,
        },
      });
      created++;
    }
  }
  console.log(`Seeded ${created} nomenclature terms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
