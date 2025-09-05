// Colors & constants
const COLORS = {
  blue: "#0E50C8",
  blueMid: "#1E56D9",
  white: "#FFFFFF",
  bg: "#FFFFFF",
  tagFill: "#225DDC",
};

// Floating tag buttons (label → actual data tags)
const TAGS = [
  { label: "New York",   tags: ["People"]  },
  { label: "Design",     tags: ["Process"] },
  { label: "Exhibition", tags: ["Purpose"] },
  { label: "Finance",    tags: ["Research"]},
  { label: "Climate",    tags: ["Context"] },
];

// Project dataset
const PROJECTS = [
  {
    title: "Climate change",
    tags: ["People","Purpose","brand repositioning","campaign","social"],
    info: { desc: "A multi-year initiative connecting people to action on climate.",
            category: "Project", tools: "Workshops, Social, Campaign" },
    children: [
      { title: "Campaign A",
        tags: ["campaign"],
        info: { category: "Subnode", desc: "Flagship campaign concept and rollout." },
        children: [
          { title: "Channels", tags: ["social"], info: { category: "Detail", desc: "Owned/paid social mix." } },
          { title: "KPIs",     tags: ["measurement"], info: { category: "Detail", desc: "Reach, CTR, sign-ups." } }
        ]
      },
      { title: "New York",
        tags: ["brand"],         // was "branding" — normalize if you prefer
        info: { category: "Subnode", desc: "Local activation in NYC." },
        children: [
          { title: "Partners", tags: ["People"], info: { category: "Detail", desc: "NGO + city partners." } }
        ]
      }
    ]
  },

  {
    title: "Social housing",
    tags: ["Research","Context","campaign","social"],
    info: { desc: "Research-led proposals for accessible housing models.",
            category: "Project", tools: "Research, Policy, Mapping" },
    children: [
      { title: "Social Drops",
        tags: ["social"],
        info: { category: "Subnode", desc: "Micro-stories distributed via social." },
        children: [
          { title: "Editorial Plan", tags: ["Process"], info: { category: "Detail", desc: "Cadence, themes." } }
        ]
      }
    ]
  },

  {
    title: "Social cause",
    tags: ["Purpose","Process"],
    info: { desc: "Brand platform to activate a social mission at scale.",
            category: "Project", tools: "Brand, Content" },
    children: [
      { title: "Retail Pilot",
        tags: ["retail"],
        info: { category: "Subnode", desc: "In-store pilot to validate the concept." },
        children: [
          { title: "POS Kit", tags: ["tools"], info: { category: "Detail", desc: "Signage & staff guide." } }
        ]
      }
    ]
  },

  {
    title: "Specific time",
    tags: ["Process","People"],
    info: { desc: "Rapid prototyping to validate ideas with real users.",
            category: "Project", tools: "Prototyping, Testing" },
    children: [
      { title: "Prototype 1",
        tags: ["innovation"],
        info: { category: "Subnode", desc: "Low-fidelity workflow test." },
        children: [
          { title: "User Tasks", tags: ["Research"], info: { category: "Detail", desc: "Critical tasks list." } }
        ]
      },
      { title: "Prototype 2",
        tags: ["innovation"],
        info: { category: "Subnode", desc: "Hi-fidelity UI validation." },
        children: [
          { title: "Findings", tags: ["Context"], info: { category: "Detail", desc: "Top issues & wins." } }
        ]
      }
    ]
  },

  {
    title: "Context",
    tags: ["Research","Context"],
    info: { desc: "Context analysis and market scan for opportunities.",
            category: "Project", tools: "Research, Analysis" },
    children: [
      { title: "Market Scan",
        tags: ["research"],
        info: { category: "Subnode", desc: "Landscape of actors, gaps, and niches." },
        children: [
          { title: "Segments", tags: ["People"], info: { category: "Detail", desc: "Priority audiences." } }
        ]
      }
    ]
  },

  {
    title: "Stay Home",
    tags: ["Process","Research"],
    info: { desc: "Cultural exhibition exploring life at home.",
            category: "Project", tools: "Exhibition, Curation" },
    children: [
      { title: "Exhibit",
        tags: ["exhibition"],
        info: { category: "Subnode", desc: "Physical/digital exhibit assets." },
        children: [
          { title: "Curatorial Notes", tags: ["Purpose"], info: { category: "Detail", desc: "Intent & narrative." } }
        ]
      }
    ]
  }
];


const TAG_COLORS = {
  People: "#7C4DFF",
  Process: "#00BCD4",
  Purpose: "#00C853",
  Research: "#FFAB00",
  Context: "#FF5252",
  campaign: "#E91E63",
  social: "#2196F3",
  branding: "#9C27B0",
  "brand repositioning": "#8BC34A",
  retail: "#795548",
  innovation: "#00ACC1",
  exhibition: "#6D4C41",
  research: "#5D4037",
};

// Responsive UI config
let UI = null;

function isMobileViewport() {
  const shortSide = Math.min(windowWidth, windowHeight);
  return shortSide <= 640;
}

function getUIConfig() {
  const mobile = isMobileViewport();
  return {
    baseWidth:  mobile ? 360 : 1200,
    baseHeight: mobile ? 640 : 680,

    topBarRatio: mobile ? 0.24 : 0.18,
    topBarMin:   110,
    topBarMax:   240,

    zonePadX:    mobile ? 12 : 40,
    zonePadY:    mobile ? 90 : 120,
    zoneBottom:  mobile ? 140 : 160,

    playRadius:  mobile ? 28 : 36,
    playY:       (h) => Math.min(h - (mobile ? 60 : 80), h * 0.86),

    rCenter:     mobile ? 20 : 24,
    rNode:       mobile ? 20 : 24,
    rChild:      mobile ? 18 : 18,
    rTag:        mobile ? 18 : 20,

    repulseGraph: mobile ? 52000 : 60000,
    repulseTag:   mobile ? 32000 : 38000,
    damping:      mobile ? 0.88   : 0.86,
    linkRest:     mobile ? 430    : 350,
    childRest:    mobile ? 400    : 320,
    kick:         mobile ? 1.8    : 2.2,

    fontTitle:   mobile ? 22 : 24,
    fontBody:    mobile ? 12 : 13,
    fontNode:    mobile ? 20 : 20,
    fontCenter:  mobile ? 20 : 20,

    maxSelected: 3,
  };
}
