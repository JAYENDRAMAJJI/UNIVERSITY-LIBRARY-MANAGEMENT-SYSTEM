export interface ShelfDefinition {
  shelfId: string; // Strictly 'SHELF-1' | 'SHELF-2' | 'SHELF-3' | 'SHELF-4' | 'SHELF-5'
  shelfNumber: number; // 1 | 2 | 3 | 4 | 5
  shelfName: string;
  focus: string;
  maxCapacity: number;
}

export interface RackDefinition {
  rackId: string;
  rackCode: string;
  rackName: string;
  program: 'B.Tech' | 'B.Sc';
  department: string;
  domain: string;
  shortCode: string;
  description: string;
  colorTheme: string;
  shelves: ShelfDefinition[];
}

export const ACADEMIC_RACK_HIERARCHY: RackDefinition[] = [
  // ================= B.TECH PROGRAM RACKS (5 RACKS, 5 SHELVES EACH) =================
  {
    rackId: 'RACK-BTECH-CSE',
    rackCode: 'RACK-BTECH-CSE-01',
    rackName: 'B.Tech - Computer Science & Engineering (CSE)',
    program: 'B.Tech',
    department: 'Computer Science & Engineering',
    domain: 'Computer Science & Engineering',
    shortCode: 'CSE',
    description: 'Core stacks for Computer Science, Algorithms, Software Engineering, AI & Database Systems.',
    colorTheme: 'from-blue-600 to-indigo-700',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: AI, Machine Learning & Neural Networks', focus: 'Artificial Intelligence, Deep Learning & Robotics', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Data Structures & Core Algorithms', focus: 'Algorithms, Complexity Theory & Competitive Programming', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Software Engineering & Architecture', focus: 'Clean Code, Design Patterns, Agile & OOP', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Operating Systems & Computer Networks', focus: 'OS Kernels, Distributed Systems & Network Protocols', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Database Systems & Web Technologies', focus: 'DBMS, SQL/NoSQL, Cloud Computing & Web Frameworks', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BTECH-ECE',
    rackCode: 'RACK-BTECH-ECE-01',
    rackName: 'B.Tech - Electronics & Communication Engineering (ECE)',
    program: 'B.Tech',
    department: 'Electronics & Communication Engineering',
    domain: 'Electronics & Communication',
    shortCode: 'ECE',
    description: 'Core stacks for Microelectronics, VLSI, Digital Signal Processing, Embedded Systems & Telecom.',
    colorTheme: 'from-cyan-600 to-blue-700',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Digital Signal Processing (DSP)', focus: 'Discrete Time Signals, Filters, Image & Audio Processing', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: VLSI Design & Microelectronics', focus: 'CMOS Circuits, ASIC, FPGA & Semiconductor Fabrication', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Embedded Systems & Microcontrollers', focus: 'ARM, 8051/8086, IoT Devices & RTOS Architecture', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Solid State Devices & Analog Circuits', focus: 'Transistors, Op-Amps, RF Circuits & Semiconductor Physics', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Wireless & Satellite Communications', focus: '5G Networks, Antennas, Microwave & Optical Fiber Comm', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BTECH-EEE',
    rackCode: 'RACK-BTECH-EEE-01',
    rackName: 'B.Tech - Electrical & Electronics Engineering (EEE)',
    program: 'B.Tech',
    department: 'Electrical & Electronics Engineering',
    domain: 'Electrical & Electronics',
    shortCode: 'EEE',
    description: 'Core stacks for Power Systems, Electrical Machines, High Voltage, Power Electronics & Smart Grids.',
    colorTheme: 'from-amber-600 to-orange-700',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Power Systems & Transmission', focus: 'Grid Stability, Load Flow, HVDC Transmission & Relays', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Electrical Machines & Transformers', focus: 'Induction Motors, Synchronous Machines & DC Generators', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Power Electronics & Converters', focus: 'Inverters, Thyristors, Motor Drives & EV Powertrains', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Control Systems & Instrumentation', focus: 'Feedback Control, State Space, Sensors & PLC/SCADA', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Renewable Energy & Smart Microgrids', focus: 'Solar PV, Wind Turbines, Energy Storage & Power Quality', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BTECH-CIVIL',
    rackCode: 'RACK-BTECH-CIVIL-01',
    rackName: 'B.Tech - Civil Engineering (CIVIL)',
    program: 'B.Tech',
    department: 'Civil Engineering',
    domain: 'Civil Engineering',
    shortCode: 'CIVIL',
    description: 'Core stacks for Structural Analysis, Concrete Technology, Fluid Mechanics, Soil Mechanics & Surveying.',
    colorTheme: 'from-emerald-600 to-teal-700',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Structural Analysis & Design', focus: 'RCC Design, Steel Structures, Earthquake Engg & Beams', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Fluid Mechanics & Hydraulics', focus: 'Open Channel Flow, Pipe Networks, Dams & Hydrology', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Concrete Technology & Materials', focus: 'Cement Chemistry, Aggregate Testing & Building Materials', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Geotechnical & Foundation Engg', focus: 'Soil Mechanics, Pavements, Slope Stability & Retaining Walls', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Surveying, GIS & Transportation', focus: 'Total Station, GPS, Highway Engg & Urban Planning', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BTECH-MECH',
    rackCode: 'RACK-BTECH-MECH-01',
    rackName: 'B.Tech - Mechanical Engineering (MECH)',
    program: 'B.Tech',
    department: 'Mechanical Engineering',
    domain: 'Mechanical Engineering',
    shortCode: 'MECH',
    description: 'Core stacks for Thermodynamics, Machine Design, Fluid Power, Manufacturing & Robotics.',
    colorTheme: 'from-rose-600 to-red-700',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Thermodynamics & Heat Transfer', focus: 'Applied Thermodynamics, Refrigeration, IC Engines & Conduction', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Fluid Dynamics & Turbo-Machinery', focus: 'Aerodynamics, Compressible Flow, Turbines & Pumps', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Machine Design & Kinematics', focus: 'Gear Trains, Cams, Finite Element Analysis (FEA) & Stress', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Manufacturing & Material Science', focus: 'CNC Machining, Metallurgy, 3D Printing, Casting & Welding', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Robotics, Mechatronics & CAD/CAM', focus: 'Robot Kinematics, Actuators, SolidWorks & Automation', maxCapacity: 40 },
    ],
  },

  // ================= B.SC PROGRAM RACKS (5 SUB-GROUPS, 5 SHELVES EACH) =================
  {
    rackId: 'RACK-BSC-PHY',
    rackCode: 'RACK-BSC-PHY-01',
    rackName: 'B.Sc - Physics (PHY)',
    program: 'B.Sc',
    department: 'Physics & Applied Sciences',
    domain: 'Physics',
    shortCode: 'PHY',
    description: 'Core stacks for Quantum Physics, Optics, Electrodynamics, Nuclear Physics & Condensed Matter.',
    colorTheme: 'from-violet-600 to-purple-700',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Quantum Mechanics & Atomic Physics', focus: 'Schrodinger Equations, Wave Mechanics & Atomic Spectra', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Optics, Lasers & Electrodynamics', focus: 'Wave Optics, Polarization, Lasers & Maxwell Equations', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Classical Mechanics & Relativity', focus: 'Lagrangian Mechanics, Gravitation & Special Relativity', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Nuclear & Particle Physics', focus: 'Radioactivity, Nuclear Reactors & Standard Model', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Solid State Physics & Materials', focus: 'Crystal Lattices, Superconductivity & Nanomaterials', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BSC-MATH',
    rackCode: 'RACK-BSC-MATH-01',
    rackName: 'B.Sc - Mathematics & Statistics (MATH)',
    program: 'B.Sc',
    department: 'Mathematics & Statistics',
    domain: 'Mathematics',
    shortCode: 'MATH',
    description: 'Core stacks for Linear Algebra, Real Analysis, Differential Equations, Statistics & Topology.',
    colorTheme: 'from-indigo-600 to-blue-800',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Linear Algebra & Vector Spaces', focus: 'Matrices, Eigenvalues, Vector Spaces & Inner Products', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Calculus & Real Analysis', focus: 'Multivariable Calculus, Sequences, Series & Metric Spaces', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Differential Equations & Numerical Methods', focus: 'ODE, PDE, Boundary Value Problems & Numerical Integration', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Probability & Mathematical Statistics', focus: 'Probability Distributions, Hypothesis Testing & Regression', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Abstract Algebra & Discrete Math', focus: 'Group Theory, Rings, Fields, Combinatorics & Graph Theory', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BSC-CHEM',
    rackCode: 'RACK-BSC-CHEM-01',
    rackName: 'B.Sc - Chemistry (CHEM)',
    program: 'B.Sc',
    department: 'Chemical Sciences',
    domain: 'Chemistry',
    shortCode: 'CHEM',
    description: 'Core stacks for Organic Chemistry, Coordination Complexes, Physical Chemistry, Biochemistry & Spectroscopy.',
    colorTheme: 'from-teal-600 to-emerald-800',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Organic Chemistry & Reaction Mechanisms', focus: 'Stereochemistry, Reaction Kinetics, Named Reactions & Polymers', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Inorganic & Coordination Chemistry', focus: 'Transition Metals, Crystal Field Theory & Organometallics', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Physical Chemistry & Thermodynamics', focus: 'Chemical Equilibrium, Electrochemistry & Quantum Chemistry', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Biochemistry & Natural Products', focus: 'Proteins, Nucleic Acids, Enzymes, Lipids & Carbohydrates', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Analytical Chemistry & Spectroscopy', focus: 'NMR, IR, UV-Vis, Mass Spectrometry & Chromatography', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BSC-CS',
    rackCode: 'RACK-BSC-CS-01',
    rackName: 'B.Sc - Computer Science & Information Tech (CS/IT)',
    program: 'B.Sc',
    department: 'Computer Science (B.Sc)',
    domain: 'Computer Science',
    shortCode: 'CS',
    description: 'Core stacks for Programming Fundamentals, Web & Mobile Development, Database Management & Data Analytics.',
    colorTheme: 'from-sky-600 to-indigo-800',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Programming in C, C++ & Java', focus: 'Object-Oriented Programming, Logic & Control Structures', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Python, Data Analytics & Visualization', focus: 'NumPy, Pandas, Matplotlib, Data Wrangling & Scraping', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Web Development & Mobile Applications', focus: 'HTML5, CSS3, JavaScript, React, Node.js & Flutter', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Relational Databases & SQL Queries', focus: 'MySQL, PostgreSQL, Normalization & Database Administration', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Cyber Security, Linux & Cloud Computing', focus: 'Network Defense, Ethical Hacking, Linux Shell & AWS/GCP', maxCapacity: 40 },
    ],
  },
  {
    rackId: 'RACK-BSC-BIO',
    rackCode: 'RACK-BSC-BIO-01',
    rackName: 'B.Sc - Biotechnology & Life Sciences (BIO)',
    program: 'B.Sc',
    department: 'Biotechnology & Life Sciences',
    domain: 'Biotechnology',
    shortCode: 'BIO',
    description: 'Core stacks for Molecular Biology, Microbiology, Genetic Engineering, Immunology & Bioinformatics.',
    colorTheme: 'from-green-600 to-emerald-800',
    shelves: [
      { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Molecular Biology & Genetics', focus: 'DNA Replication, Transcription, Translation & Gene Expression', maxCapacity: 40 },
      { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Microbiology & Virology', focus: 'Bacterial Culturing, Pathogens, Antibiotics & Staining', maxCapacity: 40 },
      { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Immunology & Cell Physiology', focus: 'Antibodies, Antigens, T-Cells, Autoimmunity & Vaccines', maxCapacity: 40 },
      { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Genetic Engineering & Bioprocess', focus: 'Recombinant DNA, Fermentation, Bioreactors & Downstream Proc', maxCapacity: 40 },
      { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: Bioinformatics & Computational Biology', focus: 'BLAST, Sequence Alignment, Molecular Docking & Phylogenetics', maxCapacity: 40 },
    ],
  },
];

/**
 * Standard 5 Shelves definition array helper
 */
export const STANDARD_5_SHELVES = [
  { id: 'SHELF-1', label: 'Shelf 1 (Tier 1 - Top Tier)', num: 1 },
  { id: 'SHELF-2', label: 'Shelf 2 (Tier 2 - Upper Middle)', num: 2 },
  { id: 'SHELF-3', label: 'Shelf 3 (Tier 3 - Center Tier)', num: 3 },
  { id: 'SHELF-4', label: 'Shelf 4 (Tier 4 - Lower Middle)', num: 4 },
  { id: 'SHELF-5', label: 'Shelf 5 (Tier 5 - Bottom Tier)', num: 5 },
];

/**
 * Extract canonical shelf number (strictly 1 to 5) from any legacy/free-text shelf identifier
 */
export function getCanonicalShelfNumber(shelfStr?: string): number {
  if (!shelfStr) return 1;
  const s = String(shelfStr).toUpperCase().trim();
  if (s.includes('5') || s.endsWith('5') || s.includes('E') || s.includes('TIER 5') || s.includes('TIER-5')) return 5;
  if (s.includes('4') || s.endsWith('4') || s.includes('D') || s.includes('TIER 4') || s.includes('TIER-4')) return 4;
  if (s.includes('3') || s.endsWith('3') || s.includes('C') || s.includes('TIER 3') || s.includes('TIER-3')) return 3;
  if (s.includes('2') || s.endsWith('2') || s.includes('B') || s.includes('TIER 2') || s.includes('TIER-2')) return 2;
  if (s.includes('1') || s.endsWith('1') || s.includes('A') || s.includes('TIER 1') || s.includes('TIER-1')) return 1;
  return 1;
}

/**
 * Find Rack Definition by Rack ID or Rack Code or partial name
 */
export function findRackDefinition(identifier?: string): RackDefinition | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toUpperCase().trim();
  return ACADEMIC_RACK_HIERARCHY.find(
    (r) =>
      r.rackId === clean ||
      r.rackCode === clean ||
      r.rackId.replace(/-/g, '') === clean.replace(/-/g, '') ||
      r.rackCode.replace(/-/g, '') === clean.replace(/-/g, '') ||
      r.shortCode === clean ||
      clean.includes(r.shortCode)
  );
}

/**
 * Map legacy / unstructured rack and shelf names into the canonical B.Tech / B.Sc 5-Shelf standard
 */
export function normalizeRackAndShelf(
  rackStr?: string,
  shelfStr?: string,
  categoryOrDept?: string,
  bookTitle?: string
): { rackCode: string; rackId: string; shelfCode: string; shelfNumber: number; program: 'B.Tech' | 'B.Sc'; domain: string } {
  const combined = `${rackStr || ''} ${shelfStr || ''} ${categoryOrDept || ''} ${bookTitle || ''}`.toUpperCase();

  let targetRack = ACADEMIC_RACK_HIERARCHY[0]; // Default B.Tech CSE

  if (combined.includes('MECH') || combined.includes('THERMODYNAMICS') || combined.includes('HEAT') || combined.includes('ROBOTICS') || combined.includes('MACHINE DESIGN')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'MECH') || targetRack;
  } else if (combined.includes('CIVIL') || combined.includes('STRUCTURAL') || combined.includes('CONCRETE') || combined.includes('SURVEY') || combined.includes('SOIL')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'CIVIL') || targetRack;
  } else if (combined.includes('EEE') || combined.includes('ELECTRICAL') || combined.includes('POWER SYSTEM') || combined.includes('HIGH VOLTAGE')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'EEE') || targetRack;
  } else if (combined.includes('ECE') || combined.includes('ELECTRONICS') || combined.includes('VLSI') || combined.includes('DSP') || combined.includes('EMBEDDED') || combined.includes('COMMUNICATION')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'ECE') || targetRack;
  } else if (combined.includes('PHY') || combined.includes('PHYSICS') || combined.includes('QUANTUM') || combined.includes('OPTICS')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'PHY') || targetRack;
  } else if (combined.includes('MATH') || combined.includes('CALCULUS') || combined.includes('ALGEBRA') || combined.includes('STATISTIC')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'MATH') || targetRack;
  } else if (combined.includes('CHEM') || combined.includes('ORGANIC') || combined.includes('INORGANIC')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'CHEM') || targetRack;
  } else if (combined.includes('BIO') || combined.includes('GENETIC') || combined.includes('MICROBIOLOGY') || combined.includes('LIFE SCIENCE')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'BIO') || targetRack;
  } else if (combined.includes('B.SC') || combined.includes('BSC') || combined.includes('SCIENCE')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.shortCode === 'CS') || targetRack;
  } else {
    // Check if rack matches directly
    const directMatch = findRackDefinition(rackStr);
    if (directMatch) targetRack = directMatch;
  }

  // Determine Shelf (Strictly 1 of 5)
  let shelfNum = 1;
  const sUpper = (shelfStr || '').toUpperCase().trim();

  // If explicit shelf string is provided, extract its 1-5 tier number
  if (sUpper && (sUpper.includes('1') || sUpper.includes('2') || sUpper.includes('3') || sUpper.includes('4') || sUpper.includes('5') || sUpper.includes('SHELF-'))) {
    shelfNum = getCanonicalShelfNumber(sUpper);
  } else {
    // Subject/Title intelligent domain tier routing
    const titleUpper = (bookTitle || '').toUpperCase();
    if (titleUpper.includes('INTELLIGENCE') || titleUpper.includes('LEARNING') || titleUpper.includes('ROBOT') || titleUpper.includes('QUANTUM') || titleUpper.includes('THERMODYNAMICS') || titleUpper.includes('POWER SYSTEM') || titleUpper.includes('ORGANIC') || titleUpper.includes('GENETIC')) {
      shelfNum = 1;
    } else if (titleUpper.includes('ALGORITHM') || titleUpper.includes('DATA STRUCTURE') || titleUpper.includes('VLSI') || titleUpper.includes('MACHINE') || titleUpper.includes('CALCULUS') || titleUpper.includes('OPTICS') || titleUpper.includes('MICROBIOLOGY')) {
      shelfNum = 2;
    } else if (titleUpper.includes('CLEAN CODE') || titleUpper.includes('SOFTWARE') || titleUpper.includes('EMBEDDED') || titleUpper.includes('ELECTRONICS') || titleUpper.includes('KINEMATICS') || titleUpper.includes('DIFFERENTIAL') || titleUpper.includes('IMMUNOLOGY')) {
      shelfNum = 3;
    } else if (titleUpper.includes('OPERATING') || titleUpper.includes('NETWORK') || titleUpper.includes('SOLID STATE') || titleUpper.includes('MANUFACTURING') || titleUpper.includes('PROBABILITY') || titleUpper.includes('STATISTIC') || titleUpper.includes('BIOPROCESS')) {
      shelfNum = 4;
    } else if (titleUpper.includes('DATABASE') || titleUpper.includes('SQL') || titleUpper.includes('WEB') || titleUpper.includes('WIRELESS') || titleUpper.includes('CAD') || titleUpper.includes('ALGEBRA') || titleUpper.includes('BIOINFORMATICS')) {
      shelfNum = 5;
    } else {
      shelfNum = 1;
    }
  }

  const shelfCode = `SHELF-${shelfNum}`;

  return {
    rackCode: targetRack.rackCode,
    rackId: targetRack.rackId,
    shelfCode,
    shelfNumber: shelfNum,
    program: targetRack.program,
    domain: targetRack.domain,
  };
}
