export interface MockPaper {
  id: string;
  title: string;
  authors: { name: string }[];
  abstract: string;
  year: number;
  citation_count: number;
  doi: string;
  external_pdf_url: string;
  ai_summary: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface MockNode {
  id: string;
  title: string;
  description: string;
  tier: "foundational" | "intermediate" | "advanced";
  prerequisites: string[];
  paperId: string;
  paper: MockPaper;
}

export interface MockRoadmap {
  id: string;
  topic: string;
  nodes: MockNode[];
  quizzes: Record<string, QuizQuestion[]>;
}

// 1. Sodium-Ion Batteries Mock Data
export const SODIUM_ION_MOCK: MockRoadmap = {
  id: "demo-sodium-ion",
  topic: "Sodium-Ion Batteries",
  nodes: [
    {
      id: "node-1",
      title: "Sodium Battery Chemistry Fundamentals",
      description: "Understand the core differences in ionic radius and voltage limits between Lithium and Sodium.",
      tier: "foundational",
      prerequisites: [],
      paperId: "paper-sodium-1",
      paper: {
        id: "paper-sodium-1",
        title: "A Review of Sodium-Ion Battery Chemistry and Materials",
        authors: [{ name: "M. H. Han" }, { name: "E. Gonzalo" }],
        abstract: "Sodium-ion batteries represent a highly promising and low-cost alternative to lithium-ion technologies due to the abundant nature of sodium. This review outlines cathode insertion materials, anode interface mechanics, and hard carbon anode structures. We analyze the lower energy density limitations driven by sodium's larger ionic radius and discuss solid-electrolyte interphase (SEI) stabilization methods.",
        year: 2021,
        citation_count: 520,
        doi: "10.1016/j.ensm.2021.04.012",
        external_pdf_url: "https://www.sciencedirect.com",
        ai_summary: `## ## MILESTONE GUIDE: SODIUM BATTERY CHEMISTRY FUNDAMENTALS\n\n### 1. Milestone Concept Alignment\nThis demo paper outlines the foundation of sodium-ion battery chemistry, which is critical for this node. It outlines how sodium's larger ionic radius (1.02 Å vs 0.76 Å for Li) affects capacity and volume changes.\n\n### 2. Deep Dive Methodology & Findings\n- Analyzed cathode insertion structures (O3, P2-type layering).\n- Evaluated hard carbon anode insertion mechanics.\n- Investigated solid-electrolyte interphase (SEI) passivation stability.\n\n### 3. Essential Takeaways\n- Sodium-ion offers 20-30% lower cost but ~15% lower energy density.\n- Hard carbon holds sodium via adsorption/intercalation processes.\n\n### 4. Limitations & Challenges\n- Low ionic conductivity at room temperature limits rate capability.\n- Soluble interphase layers lead to continuous capacity fade.`
      }
    },
    {
      id: "node-2",
      title: "Solid Polymer Electrolytes",
      description: "Investigate polymer matrices used for solid-state sodium transport.",
      tier: "intermediate",
      prerequisites: ["node-1"],
      paperId: "paper-sodium-2",
      paper: {
        id: "paper-sodium-2",
        title: "Solid Polymer Electrolytes for Solid-State Sodium Batteries",
        authors: [{ name: "J. Y. Zhang" }, { name: "L. W. Wang" }],
        abstract: "Solid polymer electrolytes (SPEs) based on poly(ethylene oxide) (PEO) offer mechanical flexibility and ease of fabrication. However, room-temperature ionic conductivity remains a bottleneck. This study investigates the incorporation of nano-sized ceramic fillers and plasticizers to disrupt polymer crystallinity and enhance sodium-ion transport dynamics.",
        year: 2022,
        citation_count: 142,
        doi: "10.1021/acsenergylett.2c00451",
        external_pdf_url: "https://pubs.acs.org",
        ai_summary: `## ## MILESTONE GUIDE: SOLID POLYMER ELECTROLYTES\n\n### 1. Concept Alignment\nSolid Polymer Electrolytes (SPEs) eliminate the flammable liquid solvents in standard cells. This paper focuses on PEO matrices.\n\n### 2. Methodology & Findings\nThe authors doped standard PEO polymers with nano-ceramic fillers to block polymer chain crystallization, forcing an amorphous state at room temperature which acts as a highway for Na+ ions.\n\n### 3. Essential Takeaways\n- Crystallinity kills ion mobility; amorphous regions are required.\n- PEO operates best above 60°C without plasticizers.\n\n### 4. Limitations\n- The mechanical strength degrades as plasticizers are added, increasing the risk of dendrite penetration.`
      }
    },
    {
      id: "node-3",
      title: "NASICON Ceramics",
      description: "Study high-conductivity inorganic solid electrolytes.",
      tier: "intermediate",
      prerequisites: ["node-1"],
      paperId: "paper-sodium-3",
      paper: {
        id: "paper-sodium-3",
        title: "NASICON-type Ceramic Solid Electrolytes for Sodium Batteries",
        authors: [{ name: "P. R. Roy" }, { name: "S. K. Singh" }],
        abstract: "Sodium Super Ionic Conductor (NASICON) solid electrolytes exhibit high bulk ionic conductivity exceeding 1 mS/cm at ambient temperatures. This work addresses the high grain-boundary resistance in Na3Zr2Si2PO12 ceramic pellets and proposes a low-temperature sintering strategy using glass additives to densify the microstructures.",
        year: 2023,
        citation_count: 98,
        doi: "10.1016/j.jechem.2023.01.009",
        external_pdf_url: "https://www.sciencedirect.com",
        ai_summary: `## ## MILESTONE GUIDE: NASICON CERAMICS\n\n### 1. Concept Alignment\nNASICON represents the state-of-the-art in rigid ceramic ionic conductors for sodium.\n\n### 2. Methodology & Findings\nResearchers used glass additives to melt and fuse the grain boundaries of ceramic powder pellets, heavily reducing electrical resistance between particles.\n\n### 3. Essential Takeaways\n- Bulk conductivity is fast (>1 mS/cm), but grain boundary resistance acts as a roadblock.\n- Densification is key to performance.\n\n### 4. Limitations\n- Extremely brittle material, difficult to scale into roll-to-roll manufacturing.`
      }
    },
    {
      id: "node-4",
      title: "Mitigating Interfacial Dendrites",
      description: "Solve the critical failure point of solid-state sodium metal anodes.",
      tier: "advanced",
      prerequisites: ["node-2", "node-3"],
      paperId: "paper-sodium-4",
      paper: {
        id: "paper-sodium-4",
        title: "Mitigating Dendrites at Sodium Metal-Solid Electrolyte Interfaces",
        authors: [{ name: "T. J. Tan" }, { name: "H. M. Chen" }],
        abstract: "Sodium metal anodes suffer from severe dendrite growth and short-circuit risks when paired with solid electrolytes. We report an in-situ formed sodiated organic-inorganic hybrid interphase layer that regulates sodium deposition, distributes local electric fields, and suppresses dendritic penetration under high current densities.",
        year: 2024,
        citation_count: 35,
        doi: "10.1002/adma.202308914",
        external_pdf_url: "https://onlinelibrary.wiley.com",
        ai_summary: `## ## MILESTONE GUIDE: MITIGATING DENDRITES\n\n### 1. Concept Alignment\nCombining the high energy of sodium metal anodes with solid electrolytes requires preventing metallic dendrite growth.\n\n### 2. Methodology & Findings\nA hybrid organic-inorganic layer is chemically grown on the anode surface to spread out the electric field, preventing sharp metallic spikes from forming during charging.\n\n### 3. Essential Takeaways\n- Dendrites grow where current density is concentrated.\n- Hybrid layers offer both mechanical toughness (inorganic) and flexibility (organic).\n\n### 4. Limitations\n- The in-situ formation process is sensitive to initial charging rates (formation cycles).`
      }
    }
  ],
  quizzes: {
    "paper-sodium-1": [
      {
        question: "Why are sodium-ion batteries considered a promising alternative to lithium-ion?",
        options: [
          "Sodium is far more abundant and cost-effective.",
          "Sodium-ion batteries have much higher voltages.",
          "Sodium is lighter than lithium.",
          "Sodium anodes never form dendrites."
        ],
        answerIndex: 0,
        explanation: "Sodium is highly abundant globally, making it a sustainable and cheap alternative."
      },
      {
        question: "What limits sodium-ion energy density compared to lithium?",
        options: [
          "Sodium's larger ionic radius.",
          "Lack of cathode materials.",
          "Extreme volatility.",
          "High raw material costs."
        ],
        answerIndex: 0,
        explanation: "The larger ionic radius leads to lower theoretical capacities and cell potentials."
      },
      {
        question: "Which material is standard for sodium battery anodes?",
        options: [
          "Pure graphite.",
          "Hard carbon structures.",
          "Silicon nanowires.",
          "Lithium titanate."
        ],
        answerIndex: 1,
        explanation: "Sodium ions cannot easily intercalate into graphite, requiring hard carbon."
      }
    ],
    "paper-sodium-2": [
       {
        question: "What is the primary host polymer for solid electrolytes in this study?",
        options: [
          "Poly(ethylene oxide) (PEO).",
          "Polyvinyl chloride (PVC).",
          "Polytetrafluoroethylene (PTFE).",
          "Polystyrene."
        ],
        answerIndex: 0,
        explanation: "PEO is the most studied host polymer due to excellent chain coordination."
      },
      {
        question: "What is the main bottleneck of PEO electrolytes at room temperature?",
        options: [
          "Low room-temperature ionic conductivity.",
          "High volatility.",
          "Total chemical instability.",
          "High cost."
        ],
        answerIndex: 0,
        explanation: "PEO crystallization restricts ion transport at room temp."
      },
      {
        question: "How did the study enhance sodium-ion transport?",
        options: [
          "Incorporating nano-ceramic fillers.",
          "Using extreme pressure.",
          "Replacing sodium with lithium.",
          "Removing all salts."
        ],
        answerIndex: 0,
        explanation: "Fillers disrupt crystalline phases, creating amorphous pathways."
      }
    ],
    "paper-sodium-3": [
      {
        question: "What does NASICON stand for?",
        options: [
          "Sodium Super Ionic Conductor.",
          "Sodium Acid-Silicate Network.",
          "Nano Silicon-Cobalt.",
          "New Advanced Solid Conductor."
        ],
        answerIndex: 0,
        explanation: "It stands for Sodium (Na) Super Ionic Conductor."
      },
      {
        question: "What issue blocks bulk flow in NASICON pellets?",
        options: [
          "High grain-boundary resistance.",
          "Rapid evaporation.",
          "Structural shattering.",
          "Low operating voltage."
        ],
        answerIndex: 0,
        explanation: "The boundaries between ceramic grains have high resistance."
      },
      {
        question: "How was the grain boundary issue resolved?",
        options: [
          "Low-temperature sintering with glass additives.",
          "Melting the entire pellet.",
          "Adding liquid acid.",
          "Wrapping in copper tape."
        ],
        answerIndex: 0,
        explanation: "Glass additives densified the structure at lower temperatures."
      }
    ],
    "paper-sodium-4": [
      {
        question: "What causes short circuits in solid-state sodium batteries?",
        options: [
          "Sodium metal dendrite penetration.",
          "Ceramic dissolution.",
          "Polymer melting.",
          "Gas buildup."
        ],
        answerIndex: 0,
        explanation: "Metallic dendrites grow through the electrolyte and short the cell."
      },
      {
        question: "How does the hybrid interphase suppress dendrites?",
        options: [
          "By distributing local electric fields.",
          "By physically melting them.",
          "By completely blocking ion transport.",
          "By converting sodium to gas."
        ],
        answerIndex: 0,
        explanation: "It spreads out current density to ensure smooth deposition."
      },
      {
        question: "How is the hybrid layer applied?",
        options: [
          "In-situ formation.",
          "Chemical Vapor Deposition.",
          "Painted on.",
          "Laser sintering."
        ],
        answerIndex: 0,
        explanation: "It forms naturally (in-situ) on the sodium surface during operation."
      }
    ]
  }
};

// 2. JavaScript Fundamentals Mock Data
export const JAVASCRIPT_MOCK: MockRoadmap = {
  id: "demo-javascript",
  topic: "JavaScript Fundamentals",
  nodes: [
    {
      id: "js-node-1",
      title: "The ECMAScript Standard",
      description: "Understand the historical standardization of JavaScript and its core execution contexts.",
      tier: "foundational",
      prerequisites: [],
      paperId: "paper-js-1",
      paper: {
        id: "paper-js-1",
        title: "The Essence of JavaScript: Standardization and Semantics",
        authors: [{ name: "A. Guha" }, { name: "C. Saftoiu" }, { name: "S. Krishnamurthi" }],
        abstract: "JavaScript is the most widely used programming language on the web. However, its semantics are highly complex and defined by the massive ECMAScript prose specification. This paper distills the core language into a tractable formal semantics, focusing on scope, prototypes, and execution contexts.",
        year: 2010,
        citation_count: 320,
        doi: "10.1007/978-3-642-14107-2_7",
        external_pdf_url: "https://link.springer.com/chapter/10.1007/978-3-642-14107-2_7",
        ai_summary: `## ## MILESTONE GUIDE: THE ECMASCRIPT STANDARD\n\n### 1. Concept Alignment\nJavaScript isn't just a browser tool; it's a formalized language governed by the ECMAScript standard. Understanding its semantic rules is step one.\n\n### 2. Methodology & Findings\nThe researchers formalized JS into a "core calculus", proving that complex behaviors like closures, prototypical inheritance, and hoisting can be modeled mathematically.\n\n### 3. Essential Takeaways\n- JavaScript relies on Prototypal Inheritance, not classical OOP.\n- Execution contexts dictate lexical scoping.\n- 'hoisting' is an artifact of the two-pass execution system.\n\n### 4. Limitations\n- The language evolves rapidly, making older static formalizations obsolete quickly.`
      }
    },
    {
      id: "js-node-2",
      title: "Asynchronous Event Loop",
      description: "Master non-blocking I/O, Callbacks, Promises, and the Microtask Queue.",
      tier: "intermediate",
      prerequisites: ["js-node-1"],
      paperId: "paper-js-2",
      paper: {
        id: "paper-js-2",
        title: "Formalizing the JavaScript Event Loop",
        authors: [{ name: "S. Loring" }, { name: "M. Madsen" }],
        abstract: "Modern JavaScript heavily utilizes asynchronous execution to maintain responsiveness in single-threaded environments. We present a formal model of the JavaScript event loop, detailing the interaction between the call stack, Web APIs, the macro-task queue, and the micro-task queue.",
        year: 2018,
        citation_count: 115,
        doi: "10.1145/3276495",
        external_pdf_url: "https://dl.acm.org/doi/10.1145/3276495",
        ai_summary: `## ## MILESTONE GUIDE: ASYNCHRONOUS EVENT LOOP\n\n### 1. Concept Alignment\nJS is single-threaded. To do heavy tasks without freezing the UI, it relies on the Event Loop.\n\n### 2. Methodology & Findings\nThe paper maps the exact priority hierarchy: Synchronous Code -> Microtasks (Promises) -> Macrotasks (setTimeout).\n\n### 3. Essential Takeaways\n- Promises resolve in the Microtask queue, executing before the next Macrotask.\n- The call stack must be empty before the Event Loop pushes queued tasks.\n\n### 4. Limitations\n- Infinite Microtask loops can completely lock the main thread, bypassing the intended async safety.`
      }
    }
  ],
  quizzes: {
    "paper-js-1": [
      {
        question: "What standard governs the semantics of JavaScript?",
        options: ["ECMAScript", "W3C HTML5", "Java Language Specification", "ANSI C"],
        answerIndex: 0,
        explanation: "JavaScript is the popular name for the language defined by the ECMAScript standard."
      },
      {
        question: "What object-oriented model does JavaScript natively use?",
        options: ["Prototypal Inheritance", "Classical Inheritance", "Multiple Inheritance", "Interface Implementation"],
        answerIndex: 0,
        explanation: "JS objects inherit directly from other objects via their prototype chain."
      },
      {
        question: "What dictates lexical scoping in JS?",
        options: ["Execution Contexts", "The DOM", "CSS Selectors", "The Browser Engine"],
        answerIndex: 0,
        explanation: "Scope is determined by the lexical execution context created during compilation."
      }
    ],
    "paper-js-2": [
      {
        question: "How does JavaScript achieve non-blocking I/O despite being single-threaded?",
        options: ["Through the Event Loop", "By creating background OS threads", "By pausing the CPU", "Through CSS animations"],
        answerIndex: 0,
        explanation: "The Event Loop delegates async tasks to Web APIs and queues callbacks."
      },
      {
        question: "Which queue has higher priority when the call stack clears?",
        options: ["Microtask Queue (Promises)", "Macrotask Queue (setTimeout)", "Render Queue", "Garbage Collector"],
        answerIndex: 0,
        explanation: "Microtasks are processed immediately after the current stack empties, before any Macrotasks."
      },
      {
        question: "What happens if you trigger an infinite loop of Promises?",
        options: ["The main thread locks up.", "It safely runs in the background.", "The browser allocates more memory.", "The Event Loop skips them."],
        answerIndex: 0,
        explanation: "The microtask queue will continuously refill, preventing the browser from ever rendering or handling user input."
      }
    ]
  }
};

// 3. API Integration Mock Data
export const API_INTEGRATION_MOCK: MockRoadmap = {
  id: "demo-api-integration",
  topic: "API Integration Strategies",
  nodes: [
    {
      id: "api-node-1",
      title: "RESTful Architecture Principles",
      description: "Understand stateless communication, resource URIs, and standard HTTP methods.",
      tier: "foundational",
      prerequisites: [],
      paperId: "paper-api-1",
      paper: {
        id: "paper-api-1",
        title: "Architectural Styles and the Design of Network-based Software Architectures",
        authors: [{ name: "Roy T. Fielding" }],
        abstract: "This seminal dissertation defines the Representational State Transfer (REST) architectural style for distributed hypermedia systems. It outlines the constraints of statelessness, client-server separation, uniform interfaces, and cacheability that guide modern Web API design.",
        year: 2000,
        citation_count: 8500,
        doi: "10.17760/fielding-dissertation",
        external_pdf_url: "https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm",
        ai_summary: `## ## MILESTONE GUIDE: RESTFUL ARCHITECTURE PRINCIPLES\n\n### 1. Concept Alignment\nREST is the bedrock of modern API integration. Understanding Fielding's constraints is essential for building scalable APIs.\n\n### 2. Methodology & Findings\nFielding derived REST by observing the success of the early Web. He proved that statelessness and uniform interfaces (HTTP GET/POST) allow systems to scale infinitely across load balancers.\n\n### 3. Essential Takeaways\n- Statelessness: The server holds no client context between requests.\n- Uniform Interface: Resources are manipulated through standard representations (JSON/XML).\n\n### 4. Limitations\n- High overhead: Every request must carry all necessary context (e.g., auth tokens), increasing bandwidth usage.`
      }
    },
    {
      id: "api-node-2",
      title: "GraphQL Data Fetching",
      description: "Learn how to mitigate over-fetching and under-fetching using graph-based query languages.",
      tier: "intermediate",
      prerequisites: ["api-node-1"],
      paperId: "paper-api-2",
      paper: {
        id: "paper-api-2",
        title: "GraphQL: A data query language",
        authors: [{ name: "L. Byron" }],
        abstract: "REST APIs often suffer from over-fetching or under-fetching of data on mobile clients. This paper introduces GraphQL, a query language that allows clients to specify exactly the shape of the data they need in a single round-trip, optimizing network performance.",
        year: 2015,
        citation_count: 840,
        doi: "10.1145/graphql-2015",
        external_pdf_url: "https://graphql.org/foundation/",
        ai_summary: `## ## MILESTONE GUIDE: GRAPHQL DATA FETCHING\n\n### 1. Concept Alignment\nWhen REST fails due to rigid endpoints, GraphQL allows frontend clients to take control of their data requirements.\n\n### 2. Methodology & Findings\nBy providing a strongly typed schema, clients can request nested relationships (e.g., a user and their top 3 posts) in one HTTP POST request, drastically reducing mobile latency.\n\n### 3. Essential Takeaways\n- Solves over-fetching (getting too much data) and under-fetching (requiring multiple waterfall requests).\n- Strongly typed schemas act as a contract between client and server.\n\n### 4. Limitations\n- Highly complex caching mechanisms compared to simple REST URLs.\n- Susceptible to deeply nested query denial-of-service (DoS) attacks.`
      }
    }
  ],
  quizzes: {
    "paper-api-1": [
      {
        question: "What is a core constraint of REST architecture regarding client-server communication?",
        options: ["Statelessness", "Persistent WebSockets", "Server-side session storage", "Binary protocols"],
        answerIndex: 0,
        explanation: "REST requires every request to contain all necessary context, meaning the server stores no session state."
      },
      {
        question: "Who authored the dissertation defining REST?",
        options: ["Roy T. Fielding", "Tim Berners-Lee", "Linus Torvalds", "Brendan Eich"],
        answerIndex: 0,
        explanation: "Roy Fielding defined REST in his 2000 Ph.D. dissertation."
      },
      {
        question: "What is a drawback of statelessness in REST?",
        options: ["Increased bandwidth overhead per request.", "It crashes servers frequently.", "It only supports XML.", "It requires dedicated mainframes."],
        answerIndex: 0,
        explanation: "Because the server stores no state, the client must repeatedly send auth tokens and context, increasing overhead."
      }
    ],
    "paper-api-2": [
      {
        question: "What primary network issue does GraphQL solve compared to REST?",
        options: ["Over-fetching and under-fetching of data.", "DNS resolution delays.", "SSL handshake latency.", "CORS policy errors."],
        answerIndex: 0,
        explanation: "GraphQL allows clients to request the exact data shape they need, preventing bloated payloads or waterfall requests."
      },
      {
        question: "How does a GraphQL client ensure it gets the correct data structure?",
        options: ["By querying against a strongly typed schema.", "By using HTTP GET parameters.", "By scraping HTML.", "By guessing database tables."],
        answerIndex: 0,
        explanation: "GraphQL servers expose a strict schema defining available types and fields."
      },
      {
        question: "What is a common security/performance risk with GraphQL?",
        options: ["Deeply nested queries causing DoS.", "SQL injection in the headers.", "Cleartext password exposure.", "Man-in-the-middle proxying."],
        answerIndex: 0,
        explanation: "Clients can request infinitely nested relationships (e.g., author -> posts -> author -> posts), crashing the database if not rate-limited."
      }
    ]
  }
};

export const MOCK_ROADMAPS = {
  [SODIUM_ION_MOCK.id]: SODIUM_ION_MOCK,
  [JAVASCRIPT_MOCK.id]: JAVASCRIPT_MOCK,
  [API_INTEGRATION_MOCK.id]: API_INTEGRATION_MOCK,
};
