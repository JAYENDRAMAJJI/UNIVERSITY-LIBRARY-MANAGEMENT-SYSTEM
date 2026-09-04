export interface PhysicalShelfTier {
  physicalShelfId: string; // 'P01' | 'P02' | 'P03' ...
  physicalShelfNumber: number; // 1, 2, 3 ...
  name: string; // 'Physical Shelf P01'
  capacity: number; // strictly 50 copies max
  startCopy: number; // e.g. 1
  endCopy: number; // e.g. 50
  allocatedCopiesCount?: number;
}

export interface ShelfDefinition {
  shelfId: string; // 'S01', 'S02', 'S03' ...
  shelfNumber: number; // 1, 2, 3 ...
  shelfName: string; // Branch / Department / Specialization (e.g. 'Computer Science & Engineering (CSE)')
  focus?: string;
  defaultBookTitles?: number; // Default 20 titles
  defaultCopiesPerTitle?: number; // Default 5 copies
  maxCapacity?: number; // Dynamic physical capacity
}

export type AcademicProgram = string;

export interface RackDefinition {
  rackId: string; // e.g. 'RACK-R01-BTECH-BE'
  rackCode: string; // 'R01', 'R02', 'R03' ... 'R24'
  rackName: string; // e.g. 'R01 — B.Tech / B.E. Engineering'
  degreeName: string; // e.g. 'B.Tech / B.E. Engineering'
  program: string;
  department: string;
  domain: string;
  shortCode: string;
  description: string;
  colorTheme: string;
  shelves: ShelfDefinition[];
}

export const PHYSICAL_SHELF_CAPACITY = 50; // Maximum physical capacity per shelf tier
export const DEFAULT_BOOK_TITLES_PER_BRANCH = 20; // 20 book titles default per branch
export const DEFAULT_COPIES_PER_TITLE = 5; // 5 copies per book title default

export const STANDARD_5_SHELVES = [
  { id: 'S01', label: 'Shelf S01 (Branch Specialization 1)', num: 1 },
  { id: 'S02', label: 'Shelf S02 (Branch Specialization 2)', num: 2 },
  { id: 'S03', label: 'Shelf S03 (Branch Specialization 3)', num: 3 },
  { id: 'S04', label: 'Shelf S04 (Branch Specialization 4)', num: 4 },
  { id: 'S05', label: 'Shelf S05 (Branch Specialization 5)', num: 5 },
];

/**
 * Dynamically computes physical shelves (P01, P02, P03...) required for a given total number of physical copies
 * Formula: Physical Shelves = Math.ceil(totalCopies / 50) (minimum 1 physical shelf)
 */
export function calculatePhysicalShelves(totalCopies: number = 100): PhysicalShelfTier[] {
  const copies = Math.max(1, totalCopies);
  const shelfCount = Math.ceil(copies / PHYSICAL_SHELF_CAPACITY);
  const physicalShelves: PhysicalShelfTier[] = [];

  for (let i = 1; i <= shelfCount; i++) {
    const padNum = String(i).padStart(2, '0');
    const startCopy = (i - 1) * PHYSICAL_SHELF_CAPACITY + 1;
    const endCopy = Math.min(i * PHYSICAL_SHELF_CAPACITY, copies);

    physicalShelves.push({
      physicalShelfId: `P${padNum}`,
      physicalShelfNumber: i,
      name: `Physical Shelf P${padNum} (Copies ${startCopy}–${endCopy})`,
      capacity: PHYSICAL_SHELF_CAPACITY,
      startCopy,
      endCopy,
      allocatedCopiesCount: Math.max(0, endCopy - startCopy + 1),
    });
  }

  return physicalShelves;
}

/**
 * Generate standard University Library Location Code
 * Format: Rxx-Sxx-Pxx-Bxxx-Cxx (e.g. R01-S01-P01-B001-C01)
 */
export function generateLocationCode(
  rackCode: string = 'R01',
  shelfCode: string = 'S01',
  physicalShelfNumber: number = 1,
  bookIndex: number = 1,
  copyIndex: number = 1
): string {
  const rClean = rackCode.replace(/[^0-9A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'R01';
  const sClean = shelfCode.replace(/[^0-9A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'S01';
  const pCode = `P${String(physicalShelfNumber).padStart(2, '0')}`;
  const bCode = `B${String(bookIndex).padStart(3, '0')}`;
  const cCode = `C${String(copyIndex).padStart(2, '0')}`;

  return `${rClean}-${sClean}-${pCode}-${bCode}-${cCode}`;
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 *                    📚 UNIVERSITY LIBRARY MASTER STRUCTURE (R01 - R24)
 * ══════════════════════════════════════════════════════════════════════════════
 */
export const ACADEMIC_RACK_HIERARCHY: RackDefinition[] = [
  // ─────────────────────────────────────────────────────────────
  // R01 — B.TECH / B.E. ENGINEERING (28 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R01-BTECH-BE',
    rackCode: 'R01',
    rackName: 'R01 — B.Tech / B.E. Engineering',
    degreeName: 'B.Tech / B.E. Engineering',
    program: 'B.Tech / B.E.',
    department: 'Engineering & Technology',
    domain: 'Engineering & Technology',
    shortCode: 'BTECH',
    description: 'Undergraduate Engineering programs across 28 specialized engineering branches.',
    colorTheme: 'from-blue-600 to-indigo-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'CSE (Computer Science & Engineering)', focus: 'Algorithms, OS, DBMS, Software Engineering, AI & Architecture' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'IT (Information Technology)', focus: 'Web Systems, Cloud Infrastructure, DevOps & Info Security' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'AI & ML (Artificial Intelligence & Machine Learning)', focus: 'Neural Networks, Deep Learning, NLP & Computer Vision' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'AI & DS (Artificial Intelligence & Data Science)', focus: 'Big Data, Predictive Modeling & Data Analytics' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Data Science', focus: 'Statistical Learning, Data Wrangling, BI & Visual Analytics' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Cyber Security', focus: 'Cryptography, Ethical Hacking, Network Defense & Forensics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'ECE (Electronics & Communication Engineering)', focus: 'VLSI, DSP, Embedded Systems, Telecom & Microwave' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'EEE (Electrical & Electronics Engineering)', focus: 'Power Systems, Machines, Power Electronics & Smart Grids' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Electrical Engineering', focus: 'High Voltage, Control Systems & Electric Drive Systems' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Mechanical Engineering', focus: 'Thermodynamics, Machine Design, Fluid Power & Robotics' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Civil Engineering', focus: 'Structural Analysis, Concrete Tech, Geotech & Surveying' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Chemical Engineering', focus: 'Process Dynamics, Reaction Kinetics & Mass Transfer' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Aerospace / Aeronautical', focus: 'Aerodynamics, Propulsion, Flight Mechanics & Avionics' },
      { shelfId: 'S14', shelfNumber: 14, shelfName: 'Automobile Engineering', focus: 'IC Engines, Vehicle Dynamics, EV Systems & Chassis Design' },
      { shelfId: 'S15', shelfNumber: 15, shelfName: 'Biotechnology', focus: 'Genetics, Bioprocess, Molecular Biology & Fermentation' },
      { shelfId: 'S16', shelfNumber: 16, shelfName: 'Biomedical Engineering', focus: 'Medical Imaging, Biosensors & Biomechanics' },
      { shelfId: 'S17', shelfNumber: 17, shelfName: 'Instrumentation & Control', focus: 'PLC/SCADA, Transducers, Industrial Automation' },
      { shelfId: 'S18', shelfNumber: 18, shelfName: 'Mechatronics Engineering', focus: 'Sensors, Actuators, Micro-electromechanical Systems' },
      { shelfId: 'S19', shelfNumber: 19, shelfName: 'Robotics Engineering', focus: 'Kinematics, Autonomous Navigation & ROS Architecture' },
      { shelfId: 'S20', shelfNumber: 20, shelfName: 'Environmental Engineering', focus: 'Water Treatment, Pollution Control & Waste Management' },
      { shelfId: 'S21', shelfNumber: 21, shelfName: 'Industrial / Production', focus: 'Operations Research, Quality Engineering & Lean Mfg' },
      { shelfId: 'S22', shelfNumber: 22, shelfName: 'Mining Engineering', focus: 'Mine Surveying, Rock Mechanics & Mineral Processing' },
      { shelfId: 'S23', shelfNumber: 23, shelfName: 'Petroleum Engineering', focus: 'Reservoir Engineering, Drilling & Petrochemicals' },
      { shelfId: 'S24', shelfNumber: 24, shelfName: 'Marine Engineering', focus: 'Marine Propulsion, Naval Architecture & Ship Systems' },
      { shelfId: 'S25', shelfNumber: 25, shelfName: 'Agricultural Engineering', focus: 'Farm Machinery, Irrigation Systems & Soil Conservation' },
      { shelfId: 'S26', shelfNumber: 26, shelfName: 'Food Technology', focus: 'Food Processing, Nutrition & Preservation Engineering' },
      { shelfId: 'S27', shelfNumber: 27, shelfName: 'Textile Engineering', focus: 'Fiber Science, Fabric Manufacturing & Dyeing Chemistry' },
      { shelfId: 'S28', shelfNumber: 28, shelfName: 'VLSI / Microelectronics', focus: 'CMOS Circuits, ASIC Design, FPGA & Semiconductor Fab' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R02 — M.TECH / M.E. POSTGRADUATE ENGINEERING (18 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R02-MTECH-ME',
    rackCode: 'R02',
    rackName: 'R02 — M.Tech / M.E. Postgraduate Engineering',
    degreeName: 'M.Tech / M.E. Postgraduate Engineering',
    program: 'M.Tech / M.E.',
    department: 'Postgraduate Engineering',
    domain: 'Postgraduate Engineering',
    shortCode: 'MTECH',
    description: 'Master of Technology / Master of Engineering advanced research & specialized stacks.',
    colorTheme: 'from-violet-600 to-indigo-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'CSE', focus: 'Advanced Algorithms, Distributed Systems & Cloud' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'AI & ML', focus: 'Deep Neural Networks, Reinforcement Learning & LLMs' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Data Science', focus: 'Advanced Big Data, Graph Analytics & Scalable ML' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Cyber Security', focus: 'Advanced Cryptography, Penetration Testing & SOC' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'VLSI Design', focus: 'Low Power VLSI, Physical Design & Verification' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Embedded Systems', focus: 'RTOS, ARM Architectures & Automotive Electronics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Communication Systems', focus: '5G/6G Networks, MIMO & Optical Fiber Networks' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Power Systems', focus: 'Grid Modernization, FACTS & Renewable Integration' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Power Electronics', focus: 'High Frequency Converters & Electric Vehicle Drives' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Control Systems', focus: 'Adaptive Control, Non-linear Systems & State Space' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Structural Engineering', focus: 'Finite Element Analysis, Tall Buildings & Seismic Design' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Transportation Engineering', focus: 'Traffic Flow Theory, Pavement Design & Urban Transit' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Environmental Engineering', focus: 'Air Quality Modeling & Hazardous Waste Treatment' },
      { shelfId: 'S14', shelfNumber: 14, shelfName: 'Thermal Engineering', focus: 'Computational Fluid Dynamics (CFD) & Advanced Heat Exchangers' },
      { shelfId: 'S15', shelfNumber: 15, shelfName: 'CAD/CAM', focus: 'Additive Manufacturing & Reverse Engineering' },
      { shelfId: 'S16', shelfNumber: 16, shelfName: 'Machine Design', focus: 'Fatigue, Fracture Mechanics & Rotor Dynamics' },
      { shelfId: 'S17', shelfNumber: 17, shelfName: 'Industrial Engineering', focus: 'Supply Chain Optimization & Stochastic Systems' },
      { shelfId: 'S18', shelfNumber: 18, shelfName: 'Biotechnology', focus: 'Genetic Recombination & Metabolic Engineering' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R03 — B.SC. SCIENCE (15 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R03-BSC',
    rackCode: 'R03',
    rackName: 'R03 — B.Sc. Science',
    degreeName: 'B.Sc. Science',
    program: 'B.Sc.',
    department: 'Pure & Applied Sciences',
    domain: 'Pure & Applied Sciences',
    shortCode: 'BSC',
    description: 'Bachelor of Science undergraduate foundational & applied science stacks.',
    colorTheme: 'from-emerald-600 to-teal-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Mathematics', focus: 'Calculus, Linear Algebra, Real Analysis & Discrete Math' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Physics', focus: 'Mechanics, Quantum Physics, Optics & Electrodynamics' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Chemistry', focus: 'Organic, Inorganic, Physical & Analytical Chemistry' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Computer Science', focus: 'C, C++, Java, Python, Web Dev & Database Systems' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Statistics', focus: 'Probability, Sampling Distributions & Regression Analysis' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Biotechnology', focus: 'Cell Biology, Genetics, Immunology & Bioprocess' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Microbiology', focus: 'Bacteriology, Virology, Mycology & Medical Microbiology' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Biochemistry', focus: 'Biomolecules, Enzymology & Clinical Biochemistry' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Botany', focus: 'Plant Anatomy, Taxonomy, Plant Physiology & Ecology' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Zoology', focus: 'Animal Diversity, Physiology, Developmental Biology & Genetics' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Electronics', focus: 'Semiconductors, Op-Amps, Digital Logic & Microprocessors' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Geology', focus: 'Mineralogy, Petrology, Structural Geology & Geomorphology' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Environmental Science', focus: 'Ecology, Natural Resource Conservation & Pollution' },
      { shelfId: 'S14', shelfNumber: 14, shelfName: 'Data Science', focus: 'Data Analytics, Visualization, R Programming & Python' },
      { shelfId: 'S15', shelfNumber: 15, shelfName: 'Artificial Intelligence', focus: 'Knowledge Representation, Search & Applied ML' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R04 — M.SC. SCIENCE (13 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R04-MSC',
    rackCode: 'R04',
    rackName: 'R04 — M.Sc. Science',
    degreeName: 'M.Sc. Science',
    program: 'M.Sc.',
    department: 'Postgraduate Sciences',
    domain: 'Postgraduate Sciences',
    shortCode: 'MSC',
    description: 'Master of Science postgraduate advanced treatises, laboratories & monographs.',
    colorTheme: 'from-teal-600 to-green-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Mathematics', focus: 'Topology, Measure Theory, Functional Analysis & Complex Variables' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Physics', focus: 'Quantum Field Theory, Nuclear Physics & Condensed Matter' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Chemistry', focus: 'Advanced Organic Synthesis, Organometallics & Spectroscopy' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Computer Science', focus: 'Advanced Algorithms, Cloud Computing & AI Systems' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Statistics', focus: 'Stochastic Processes, Multivariate Analysis & Time Series' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Biotechnology', focus: 'Recombinant DNA Tech, Biopharmaceutics & Genomics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Microbiology', focus: 'Industrial Microbiology, Microbial Genetics & Immunology' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Biochemistry', focus: 'Molecular Enzymology, Signal Transduction & Proteomics' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Botany', focus: 'Plant Molecular Biology, Plant Biotechnology & Ecology' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Zoology', focus: 'Endocrinology, Animal Behavior & Molecular Genetics' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Environmental Science', focus: 'Environmental Impact Assessment & Remote Sensing/GIS' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Data Science', focus: 'Predictive Modeling, Deep Learning & Big Data Clusters' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Artificial Intelligence', focus: 'Reinforcement Learning, Transformer Architectures & LLMs' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R05 — BCA (11 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R05-BCA',
    rackCode: 'R05',
    rackName: 'R05 — BCA',
    degreeName: 'BCA (Bachelor of Computer Applications)',
    program: 'BCA',
    department: 'Computer Applications',
    domain: 'Computer Applications',
    shortCode: 'BCA',
    description: 'Undergraduate Computer Applications & software programming fundamentals.',
    colorTheme: 'from-amber-600 to-yellow-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Computer Applications', focus: 'Office Productivity, Computer Fundamentals & IT Basics' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Software Development', focus: 'C, C++, Java, C# & Object-Oriented Paradigms' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Web Development', focus: 'HTML5, CSS3, JavaScript, React, Node.js & REST APIs' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Mobile Application Development', focus: 'Android Studio, Kotlin, Flutter & iOS Basics' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Artificial Intelligence', focus: 'Knowledge Systems, Logic Programming & Chatbots' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Machine Learning', focus: 'Scikit-Learn, Regression, Classification & Clustering' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Data Science', focus: 'NumPy, Pandas, Matplotlib, Data Cleaning & Seaborn' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Cyber Security', focus: 'Password Security, Firewalls, Antivirus & Ethical Safety' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Cloud Computing', focus: 'AWS, Azure Basics, Storage & Containerization' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Database Management', focus: 'MySQL, PostgreSQL, Normalization & SQL Queries' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Computer Networking', focus: 'TCP/IP, OSI Layers, Routing & Network Hardware' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R06 — MCA (10 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R06-MCA',
    rackCode: 'R06',
    rackName: 'R06 — MCA',
    degreeName: 'MCA (Master of Computer Applications)',
    program: 'MCA',
    department: 'Postgraduate Computer Applications',
    domain: 'Postgraduate Computer Applications',
    shortCode: 'MCA',
    description: 'Postgraduate Master of Computer Applications enterprise architectures & advanced software systems.',
    colorTheme: 'from-orange-600 to-red-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Computer Applications', focus: 'Enterprise Systems, Middleware & Design Patterns' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Software Engineering', focus: 'Agile, DevOps, Microservices & UML Modeling' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Artificial Intelligence', focus: 'Expert Systems, NLP, Reinforcement Learning & Vision' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Machine Learning', focus: 'PyTorch, TensorFlow, CNNs, Transformers & LLMs' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Data Science', focus: 'Hadoop, Spark, Data Warehousing & Predictive AI' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Cyber Security', focus: 'Ethical Hacking, Network Security Protocols & Forensics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Cloud Computing', focus: 'Docker, Kubernetes, CI/CD Pipelines & Terraform' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Database Management', focus: 'MongoDB, Cassandra, Redis & Distributed Transactions' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Computer Networking', focus: 'SDN, Network Performance, Socket Programming & 5G' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Web Technologies', focus: 'MERN/MEAN Stack, GraphQL, Next.js & Serverless' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R07 — B.COM. (9 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R07-BCOM',
    rackCode: 'R07',
    rackName: 'R07 — B.Com.',
    degreeName: 'B.Com. (Bachelor of Commerce)',
    program: 'B.Com.',
    department: 'Commerce & Accounting',
    domain: 'Commerce & Accounting',
    shortCode: 'BCOM',
    description: 'Undergraduate Commerce, Financial Accounting, Corporate Taxation & Business Studies.',
    colorTheme: 'from-emerald-700 to-green-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'General Commerce', focus: 'Business Organization, Trade Practices & Commercial Principles' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Accounting', focus: 'Double-Entry, Company Accounts & Final Statements' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Finance', focus: 'Financial Management, Capital Budgeting & Markets' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Taxation', focus: 'Income Tax Laws, GST Framework & Tax Planning' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Banking', focus: 'Commercial Banking, RBI Regulations & Risk Insurance' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Auditing', focus: 'Audit Procedures, Internal Controls & Vouching' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Corporate Accounting', focus: 'Amalgamation, Liquidation, Holding Companies' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Computer Applications', focus: 'Tally Prime, Excel for Finance & ERP Solutions' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Business Economics', focus: 'Microeconomics, Macroeconomics & Business Math' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R08 — M.COM. (8 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R08-MCOM',
    rackCode: 'R08',
    rackName: 'R08 — M.Com.',
    degreeName: 'M.Com. (Master of Commerce)',
    program: 'M.Com.',
    department: 'Postgraduate Commerce',
    domain: 'Postgraduate Commerce',
    shortCode: 'MCOM',
    description: 'Postgraduate Commerce, Advanced Financial Reporting & Strategic Corporate Finance.',
    colorTheme: 'from-green-700 to-emerald-950',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Commerce', focus: 'Global Trade Policy, Commercial Treaties & Logistics' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Accounting', focus: 'IFRS, Ind AS Standards, Consolidated Financials' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Finance', focus: 'Portfolio Theory, Derivatives & Corporate Valuation' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Taxation', focus: 'International Taxation, Transfer Pricing & Tax Audits' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Banking', focus: 'Investment Banking, Merchant Banking & Credit Rating' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Auditing', focus: 'Forensic Auditing, Governance Codes & Ethics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Corporate Accounting', focus: 'Corporate Restructuring & Advanced Reporting' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Business Management', focus: 'Strategic Management & Global Policy' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R09 — BBA (10 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R09-BBA',
    rackCode: 'R09',
    rackName: 'R09 — BBA',
    degreeName: 'BBA (Bachelor of Business Administration)',
    program: 'BBA',
    department: 'Business Administration',
    domain: 'Business Administration',
    shortCode: 'BBA',
    description: 'Undergraduate Business Administration, Management Principles & Entrepreneurship.',
    colorTheme: 'from-sky-600 to-blue-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'General Management', focus: 'Organizational Behavior, Principles of Management' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Finance', focus: 'Financial Analysis, Working Capital & Budgeting' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Marketing', focus: 'Consumer Behavior, Branding, Advertising & Sales' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Human Resource Management', focus: 'Recruitment, Training, Performance & Industrial Relations' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Operations Management', focus: 'Production Planning, Inventory Control & Logistics' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Business Analytics', focus: 'Data-driven Decisions, Excel Analytics & Business KPIs' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'International Business', focus: 'Global Trade, Cross-Cultural Mgmt & Export-Import' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Information Technology', focus: 'MIS, Enterprise Systems & Digital Business' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Entrepreneurship', focus: 'Business Plan Formulation, Venture Capital & Incubation' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Supply Chain Management', focus: 'Procurement, Warehousing & Fleet Distribution' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R10 — MBA (11 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R10-MBA',
    rackCode: 'R10',
    rackName: 'R10 — MBA',
    degreeName: 'MBA (Master of Business Administration)',
    program: 'MBA',
    department: 'Postgraduate Business School',
    domain: 'Postgraduate Business School',
    shortCode: 'MBA',
    description: 'Postgraduate Master of Business Administration strategic management & corporate leadership.',
    colorTheme: 'from-blue-700 to-indigo-950',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Finance', focus: 'Corporate Finance, Mergers & Acquisitions, Fintech & Valuation' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Marketing', focus: 'Brand Strategy, SEO/SEM, Marketing Analytics & Omnichannel' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Human Resource Management', focus: 'Strategic HRM, Organizational Change & Leadership' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Operations Management', focus: 'Global SCM, Lean Operations, Six Sigma & Quality Mgmt' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Business Analytics', focus: 'Predictive Analytics, Tableau, Big Data for Managers & ML' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'International Business', focus: 'Global Strategy, International Negotiations & Geopolitics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'IT Management', focus: 'Enterprise Architecture, Cloud Strategy & IT Governance' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Entrepreneurship', focus: 'Design Thinking, Venture Scaling & Angel Financing' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Supply Chain Management', focus: 'Logistics, Port Management & Global Sourcing' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Healthcare Management', focus: 'Hospital Operations, Health Economics & Policy' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Banking & Financial Services', focus: 'Commercial Banking, Wealth Management & Credit Risk' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R11 — BA (14 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R11-BA',
    rackCode: 'R11',
    rackName: 'R11 — BA',
    degreeName: 'BA (Bachelor of Arts)',
    program: 'BA',
    department: 'Arts & Humanities',
    domain: 'Arts & Humanities',
    shortCode: 'BA',
    description: 'Undergraduate Bachelor of Arts in Literature, History, Philosophy & Humanities.',
    colorTheme: 'from-rose-600 to-pink-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'English', focus: 'British Literature, Poetry, Drama & Literary Criticism' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Telugu', focus: 'Classical Literature, Grammar, Poetry & Modern Prose' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Hindi', focus: 'Kavya, Natak, Nibandh & Hindi Sahitya ka Itihas' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'History', focus: 'Ancient, Medieval, Modern Indian & World History' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Economics', focus: 'Micro, Macro, Indian Economy & Public Finance' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Political Science', focus: 'Political Theory, Indian Constitution & International Politics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Sociology', focus: 'Social Institutions, Indian Society & Social Change' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Philosophy', focus: 'Indian Philosophy, Western Epistemology & Ethics' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Psychology', focus: 'General Psychology, Developmental & Social Psychology' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Geography', focus: 'Physical Geography, Human Geography & Cartography' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Public Administration', focus: 'Administrative Theories & Indian Administrative System' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Journalism', focus: 'News Writing, Media Ethics & Broadcasting' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Literature', focus: 'Post-Colonial, American & European Classics' },
      { shelfId: 'S14', shelfNumber: 14, shelfName: 'Linguistics', focus: 'Phonology, Syntax, Semantics & Sociolinguistics' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R12 — MA (12 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R12-MA',
    rackCode: 'R12',
    rackName: 'R12 — MA',
    degreeName: 'MA (Master of Arts)',
    program: 'MA',
    department: 'Postgraduate Arts & Humanities',
    domain: 'Postgraduate Arts & Humanities',
    shortCode: 'MA',
    description: 'Postgraduate Master of Arts advanced literary criticism, historical treatises & social theories.',
    colorTheme: 'from-pink-700 to-rose-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'English', focus: 'Critical Theory, Postmodernism & World Literatures' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Telugu', focus: 'Advanced Dravidian Linguistics, Classical Poetry & Criticism' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'History', focus: 'Historiography, Subaltern Studies & Archival Methods' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Economics', focus: 'Advanced Macroeconomics, Econometric Theory & Growth Models' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Political Science', focus: 'Comparative Politics, Political Thought & Foreign Policy' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Sociology', focus: 'Advanced Sociological Thought & Qualitative Research' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Psychology', focus: 'Cognitive Neuroscience, Clinical Psychology & Psychometrics' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Philosophy', focus: 'Phenomenology, Existentialism & Contemporary Ethics' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Geography', focus: 'Geomorphology, GIS Modeling & Urban Climatology' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Public Administration', focus: 'Public Policy Analysis & Comparative Public Administration' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Journalism', focus: 'Media Sociology, Political Communication & Digital Journalism' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Literature', focus: 'Comparative Literature, Translation Studies & Cultural Theory' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R13 — LAW (12 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R13-LAW',
    rackCode: 'R13',
    rackName: 'R13 — Law',
    degreeName: 'Law (LLB / LLM)',
    program: 'Law',
    department: 'School of Law & Legal Studies',
    domain: 'School of Law & Legal Studies',
    shortCode: 'LAW',
    description: 'Statutes, Constitutional Acts, Bare Acts, Case Reporters & Legal Jurisprudence.',
    colorTheme: 'from-stone-700 to-slate-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'LLB', focus: 'Foundational Law, Torts, Contracts & Jurisprudence' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'LLM', focus: 'Postgraduate Legal Monographs & Advanced Comparative Law' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Constitutional Law', focus: 'Fundamental Rights, Directive Principles & Judicial Review' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Criminal Law', focus: 'IPC / BNS, CrPC, Evidence Act & Penology' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Civil Law', focus: 'Code of Civil Procedure (CPC), Specific Relief & Property Law' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Corporate Law', focus: 'Companies Act, Insolvency & Bankruptcy Code (IBC), Competition' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Labour Law', focus: 'Trade Unions, Industrial Disputes & Minimum Wages' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'International Law', focus: 'Public International Law, UN Charters & Geneva Conventions' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Intellectual Property Law', focus: 'Patents, Copyrights, Trademarks & Geographical Indications' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Cyber Law', focus: 'IT Act, Data Privacy, Cyber Crimes & E-Commerce Regulations' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Environmental Law', focus: 'National Green Tribunal (NGT) & Wildlife Protection' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Human Rights Law', focus: 'Human Rights Jurisprudence, NHRC & International Treaties' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R14 — MEDICAL SCIENCES (16 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R14-MED',
    rackCode: 'R14',
    rackName: 'R14 — Medical Sciences',
    degreeName: 'Medical Sciences (MBBS / MD / MS)',
    program: 'Medical Sciences',
    department: 'Medical College & Clinical Sciences',
    domain: 'Medical College & Clinical Sciences',
    shortCode: 'MED',
    description: 'Human Anatomy, Pathology, Pharmacology, Surgery & Clinical Reference Manuals.',
    colorTheme: 'from-red-600 to-rose-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'MBBS', focus: 'Core Undergraduate Medical Curriculum & Clinical Case Studies' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'General Medicine', focus: 'Harrison Principles, Internal Medicine & Infectious Diseases' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'General Surgery', focus: 'Operative Surgery, Trauma Care & Laparoscopy' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Pediatrics', focus: 'Child Health, Neonatal Care & Pediatric Disorders' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Orthopedics', focus: 'Fracture Fixation, Joint Replacement & Spine Surgery' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Obstetrics & Gynecology', focus: 'Antenatal Care, Labor Management & Gynecological Surgery' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Dermatology', focus: 'Skin Diseases, Leprosy & STD Management' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Cardiology', focus: 'Cardiovascular Diseases, ECG, Angiography & Heart Failure' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Neurology', focus: 'Neuroanatomy, Stroke, Epilepsy & Neurodegenerative Diseases' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Psychiatry', focus: 'Psychiatric Disorders, Psychopharmacology & Psychotherapy' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Radiology', focus: 'X-Ray, Ultrasound, CT, MRI & Nuclear Medicine' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Anesthesiology', focus: 'General Anesthesia, ICU Protocols & Resuscitation' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Pathology', focus: 'General Pathology, Systemic Pathology & Clinical Lab Methods' },
      { shelfId: 'S14', shelfNumber: 14, shelfName: 'Anatomy', focus: 'Gross Anatomy, Histology, Neuroanatomy & Embryology' },
      { shelfId: 'S15', shelfNumber: 15, shelfName: 'Physiology', focus: 'Cardiovascular, Respiratory, Neurophysiology & Renal Systems' },
      { shelfId: 'S16', shelfNumber: 16, shelfName: 'Pharmacology', focus: 'Pharmacodynamics, Chemotherapy & Toxicology' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R15 — PHARMACY (8 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R15-PHARM',
    rackCode: 'R15',
    rackName: 'R15 — Pharmacy',
    degreeName: 'Pharmacy (B.Pharm / M.Pharm)',
    program: 'Pharmacy',
    department: 'Pharmaceutical Sciences',
    domain: 'Pharmaceutical Sciences',
    shortCode: 'PHARM',
    description: 'Drug Formulation, Pharmacognosy, Pharmaceutical Analysis & Clinical Pharmacy.',
    colorTheme: 'from-teal-700 to-cyan-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'B.Pharm', focus: 'Foundational Pharmaceutical Sciences, Compounding & Pharmaceutics' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'M.Pharm', focus: 'Advanced Drug Design, Novel Drug Delivery Systems & Regulatory' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Pharmaceutics', focus: 'Dosage Forms, Tablets, Capsules, Nanomedicine & Controlled Release' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Pharmacology', focus: 'Receptor Mechanisms, Preclinical Screening & Bioassays' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Pharmaceutical Chemistry', focus: 'Drug Synthesis, SAR Studies & Molecular Modeling' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Pharmacognosy', focus: 'Medicinal Plants, Herbal Formulations & Extraction' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Pharmaceutical Analysis', focus: 'HPLC, GC, Spectroscopy & Quality Assurance Protocols' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Clinical Pharmacy', focus: 'Pharmacovigilance, Prescription Audits & Patient Counseling' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R16 — NURSING & ALLIED HEALTH SCIENCES (10 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R16-NURSING',
    rackCode: 'R16',
    rackName: 'R16 — Nursing & Allied Health Sciences',
    degreeName: 'Nursing & Allied Health Sciences',
    program: 'Nursing',
    department: 'Nursing & Allied Health Sciences',
    domain: 'Nursing & Allied Health Sciences',
    shortCode: 'NURSING',
    description: 'Patient Care, Clinical Nursing, Allied Health Technology & Community Health.',
    colorTheme: 'from-pink-600 to-purple-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'B.Sc. Nursing', focus: 'Nursing Foundation, Patient Assessment & Basic Procedures' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'M.Sc. Nursing', focus: 'Advanced Clinical Specialization, Nursing Research & Admin' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'General Nursing', focus: 'General Patient Care, First Aid & Ward Management' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Community Health', focus: 'Primary Health Care, Rural Health & Family Welfare' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Medical-Surgical Nursing', focus: 'Adult Health, Surgical Wards & Post-Operative Care' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Child Health Nursing', focus: 'Growth Milestones, Pediatric Care & Immunization' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Mental Health Nursing', focus: 'Psychiatric Disorders, Therapeutic Communication & Rehab' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Physiotherapy', focus: 'Kinesiology, Exercise Therapy & Neuro-rehabilitation' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Medical Laboratory Technology', focus: 'Clinical Biochemistry, Hematology & Urinalysis' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Radiology Technology', focus: 'Radiation Safety, Darkroom Techniques & Positioning' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R17 — AGRICULTURE (10 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R17-AGRI',
    rackCode: 'R17',
    rackName: 'R17 — Agriculture',
    degreeName: 'Agriculture & Allied Sciences',
    program: 'Agriculture',
    department: 'Agricultural Sciences',
    domain: 'Agricultural Sciences',
    shortCode: 'AGRI',
    description: 'Agronomy, Soil Science, Horticulture, Plant Breeding & Agricultural Engineering.',
    colorTheme: 'from-lime-600 to-green-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Agriculture', focus: 'Principles of Agricultural Sciences & Farm Management' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Agronomy', focus: 'Cereal Crops, Weed Management & Sustainable Agriculture' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Horticulture', focus: 'Fruit Cultivation, Floriculture & Hybridization' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Soil Science', focus: 'Soil Fertility, Nutrient Management & Fertilizers' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Plant Pathology', focus: 'Crop Diseases, Fungicides & Biocontrol Agents' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Entomology', focus: 'Insect Pests, IPM (Integrated Pest Management) & Sericulture' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Agricultural Economics', focus: 'Farm Management, Agricultural Marketing & Microfinance' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Agricultural Engineering', focus: 'Tractors, Harvesters, Drip Irrigation & Drainage' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Genetics & Plant Breeding', focus: 'Transgenic Crops, CRISPR in Agriculture & Seed Tech' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Food Technology', focus: 'Grain Storage, Cold Chain & Food Preservation' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R18 — ARCHITECTURE & PLANNING (7 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R18-ARCH',
    rackCode: 'R18',
    rackName: 'R18 — Architecture & Planning',
    degreeName: 'Architecture & Planning',
    program: 'Architecture',
    department: 'School of Architecture & Planning',
    domain: 'School of Architecture & Planning',
    shortCode: 'ARCH',
    description: 'Architectural Design, Structural Systems, Urban Planning & Sustainable Habitats.',
    colorTheme: 'from-yellow-700 to-amber-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'B.Arch', focus: 'Spatial Planning, Form & Function, Architectural Drafting' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'M.Arch', focus: 'Advanced Architectural Research, Urban Design & Theory' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Urban Planning', focus: 'Master Planning, Zoning Laws & Smart Cities' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Regional Planning', focus: 'Regional Infrastructure, Resource Allocation & Demographics' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Landscape Architecture', focus: 'Site Planning, Botany in Design & Urban Forestry' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Interior Architecture', focus: 'Color Psychology, Material Sourcing & Space Ergonomics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Building Technology', focus: 'Acoustics, Lighting, HVAC & Green Building Codes' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R19 — EDUCATION (7 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R19-EDU',
    rackCode: 'R19',
    rackName: 'R19 — Education',
    degreeName: 'Education & Pedagogy',
    program: 'Education',
    department: 'Faculty of Education',
    domain: 'Faculty of Education',
    shortCode: 'EDU',
    description: 'Pedagogy, Educational Psychology, Curriculum Planning & Inclusive Learning.',
    colorTheme: 'from-amber-600 to-orange-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'B.Ed.', focus: 'Instructional Design, Lesson Planning & Teaching Methods' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'M.Ed.', focus: 'Educational Administration, Policy & Higher Education' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'D.El.Ed.', focus: 'Elementary Education, Early Childhood Pedagogy' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Educational Psychology', focus: 'Child Development, Learning Theories & Motivation' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Educational Technology', focus: 'LMS Platforms, Blended Learning & Digital Tools' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Curriculum & Instruction', focus: 'Formative Assessment, Rubrics & Standardized Testing' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Special Education', focus: 'Disability Studies, Assistive Tech & Remedial Teaching' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R20 — DESIGN & FINE ARTS (9 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R20-DESIGN',
    rackCode: 'R20',
    rackName: 'R20 — Design & Fine Arts',
    degreeName: 'Design & Fine Arts',
    program: 'Design',
    department: 'School of Design & Creative Arts',
    domain: 'School of Design & Creative Arts',
    shortCode: 'DESIGN',
    description: 'Graphic Design, UI/UX, Product Prototyping, Fashion & Fine Arts.',
    colorTheme: 'from-fuchsia-600 to-pink-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Fine Arts', focus: 'Oil, Watercolor, Acrylic, Sculpting & Art History' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Graphic Design', focus: 'Visual Hierarchy, Font Pairing, Branding & Vector Art' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Fashion Design', focus: 'Pattern Making, Garment Construction & Trend Forecasting' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Interior Design', focus: 'Spatial Aesthetics, Material Sourcing & Furniture Design' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Industrial Design', focus: '3D Prototyping, Ergonomics & Sustainable Materials' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Product Design', focus: 'Design Thinking, CAD Prototyping & Consumer Goods' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Animation', focus: 'Storyboarding, 2D/3D Animation & Visual Effects (VFX)' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Photography', focus: 'Lighting Techniques, Studio Photo & Color Grading' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Visual Communication', focus: 'Semiotics, Visual Storytelling & Exhibition Design' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R21 — JOURNALISM & MASS COMMUNICATION (7 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R21-JOURNALISM',
    rackCode: 'R21',
    rackName: 'R21 — Journalism & Mass Communication',
    degreeName: 'Journalism & Mass Communication',
    program: 'Journalism',
    department: 'Department of Communication & Media Studies',
    domain: 'Department of Communication & Media Studies',
    shortCode: 'JOURN',
    description: 'Print Journalism, Broadcasting, Digital PR, Film Production & Media Ethics.',
    colorTheme: 'from-red-700 to-rose-950',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Journalism', focus: 'Investigative Reporting, Headline Writing & Copy Editing' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Mass Communication', focus: 'Agenda Setting, Cultivation Theory & Audience Analysis' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Advertising', focus: 'Copywriting, Media Planning, Ad Campaigns & Consumer Behavior' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Public Relations', focus: 'Corporate Communications, Press Releases & Crisis PR' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Digital Media', focus: 'Content Strategy, Podcast Production & Digital Marketing' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Film & Television', focus: 'TV News Production, Cinematography & Video Editing' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Media Studies', focus: 'Media Laws, Press Council Guidelines & Journalistic Ethics' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R22 — SOCIAL SCIENCES (7 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R22-SOCSCI',
    rackCode: 'R22',
    rackName: 'R22 — Social Sciences',
    degreeName: 'Social Sciences',
    program: 'Social Sciences',
    department: 'School of Social Sciences',
    domain: 'School of Social Sciences',
    shortCode: 'SOCSCI',
    description: 'Applied Psychology, Sociology, Social Work & Development Studies.',
    colorTheme: 'from-violet-700 to-purple-950',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Psychology', focus: 'Counseling, Neuropsychology & Behavioral Interventions' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Sociology', focus: 'Urban Sociology, Gender Studies & Social Stratification' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Social Work', focus: 'Community Organization, NGO Management & Medical Social Work' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Anthropology', focus: 'Physical Anthropology, Tribal Cultures & Fieldwork' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Political Science', focus: 'Democratic Institutions, Elections & Political Parties' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'International Relations', focus: 'Foreign Affairs, Treaties & Strategic Geopolitics' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Development Studies', focus: 'Poverty Alleviation, SDGs & Human Development Index' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R23 — RESEARCH & HIGHER STUDIES (10 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R23-RESEARCH',
    rackCode: 'R23',
    rackName: 'R23 — Research & Higher Studies',
    degreeName: 'Research & Higher Studies (Ph.D.)',
    program: 'Research',
    department: 'Centre for Advanced Research & Doctoral Studies',
    domain: 'Centre for Advanced Research & Doctoral Studies',
    shortCode: 'RESEARCH',
    description: 'Ph.D. Dissertations, Research Methodology, Grant Writing & Academic Publishing.',
    colorTheme: 'from-cyan-700 to-slate-900',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'Ph.D.', focus: 'Doctoral Theses, Dissertation Guidelines & Defense' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'Research Methodology', focus: 'Hypothesis Formulation, Literature Review & Scientific Writing' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'Academic Research', focus: 'Scopus / Web of Science Indexing, Impact Factors & Journals' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Theses & Dissertations', focus: 'Archived University Doctoral Theses & Repositories' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Scientific Research', focus: 'Experimental Design, ANOVA & Quantitative Studies' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Engineering Research', focus: 'Computational Simulation, Patents & Applied Engineering' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'Science Research', focus: 'Pure Science Discoveries, Lab Trials & Field Surveys' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'Management Research', focus: 'Case Study Methodologies, Econometrics & Market Studies' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'Humanities Research', focus: 'Hermeneutics, Archival Analysis & Textual Criticism' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'Social Sciences Research', focus: 'Qualitative Field Studies, Ethnography & Public Policy' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // R24 — COMPETITIVE EXAMS & CAREER (13 Branches)
  // ─────────────────────────────────────────────────────────────
  {
    rackId: 'RACK-R24-EXAMS',
    rackCode: 'R24',
    rackName: 'R24 — Competitive Exams & Career',
    degreeName: 'Competitive Exams & Career Cell',
    program: 'Competitive Exams',
    department: 'Career Development & Competitive Examinations Cell',
    domain: 'Career Development & Competitive Examinations Cell',
    shortCode: 'EXAMS',
    description: 'UPSC, GATE, CAT, GRE, Banking, State PSC & Technical Interview Prep Collections.',
    colorTheme: 'from-yellow-600 to-red-800',
    shelves: [
      { shelfId: 'S01', shelfNumber: 1, shelfName: 'UPSC', focus: 'Civil Services IAS/IPS/IFS GS Papers 1-4, CSAT & Essay' },
      { shelfId: 'S02', shelfNumber: 2, shelfName: 'APPSC', focus: 'State Public Service Commission Groups 1, 2 & Previous Papers' },
      { shelfId: 'S03', shelfNumber: 3, shelfName: 'SSC', focus: 'Staff Selection Commission (CGL, CHSL, MTS) Preparation' },
      { shelfId: 'S04', shelfNumber: 4, shelfName: 'Banking', focus: 'IBPS, SBI PO & Clerk, Banking Awareness & Quantitative DI' },
      { shelfId: 'S05', shelfNumber: 5, shelfName: 'Railway Exams', focus: 'RRB NTPC, Group D, ALP & Technical Stream Question Banks' },
      { shelfId: 'S06', shelfNumber: 6, shelfName: 'Defence Exams', focus: 'NDA, CDS, AFCAT & SSB Interview Preparation Manuals' },
      { shelfId: 'S07', shelfNumber: 7, shelfName: 'GATE', focus: 'Graduate Aptitude Test in Engineering Solved Papers & Test Series' },
      { shelfId: 'S08', shelfNumber: 8, shelfName: 'CAT', focus: 'Common Admission Test Quantitative, VARC & Data Interpretation' },
      { shelfId: 'S09', shelfNumber: 9, shelfName: 'GRE', focus: 'Graduate Record Examinations Analytical Writing & Verbal Reasoning' },
      { shelfId: 'S10', shelfNumber: 10, shelfName: 'GMAT', focus: 'Graduate Management Admission Test Integrated Reasoning & Quantitative' },
      { shelfId: 'S11', shelfNumber: 11, shelfName: 'Placement Preparation', focus: 'RS Aggarwal Quantitative Aptitude, Logical Reasoning & Verbal' },
      { shelfId: 'S12', shelfNumber: 12, shelfName: 'Interview Preparation', focus: 'HR Round Behavioral Questions, Group Discussions & Mock Tests' },
      { shelfId: 'S13', shelfNumber: 13, shelfName: 'Resume & Career Development', focus: 'Professional Resume Building, LinkedIn Optimization & Portfolios' },
    ],
  },
];

/**
 * Extract canonical shelf number from string
 */
export function getCanonicalShelfNumber(shelfStr?: string): number {
  if (!shelfStr) return 1;
  const s = String(shelfStr).toUpperCase().trim();
  const match = s.match(/(?:SHELF|TIER|S)[-\s]*([0-9]+)/i) || s.match(/([0-9]+)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1) return num;
  }
  return 1;
}

/**
 * Find Rack Definition by Rack ID, Code, Name, or Shortcode
 */
export function findRackDefinition(identifier?: string): RackDefinition | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toUpperCase().trim();
  return ACADEMIC_RACK_HIERARCHY.find(
    (r) =>
      r.rackId === clean ||
      r.rackCode === clean ||
      r.shortCode === clean ||
      clean.startsWith(r.rackCode) ||
      clean.includes(r.rackCode) ||
      clean.includes(r.shortCode)
  );
}

/**
 * Map legacy / unstructured rack and shelf names into the canonical 24-Rack standard
 */
export function normalizeRackAndShelf(
  rackStr?: string,
  shelfStr?: string,
  categoryOrDept?: string,
  bookTitle?: string
): { rackCode: string; rackId: string; shelfCode: string; shelfNumber: number; program: string; domain: string } {
  const combined = `${rackStr || ''} ${shelfStr || ''} ${categoryOrDept || ''} ${bookTitle || ''}`.toUpperCase();

  // 1. Try direct code match (e.g. R01, R10, R24)
  for (const r of ACADEMIC_RACK_HIERARCHY) {
    if (
      (rackStr && (rackStr.toUpperCase() === r.rackCode || rackStr.toUpperCase() === r.rackId || rackStr.toUpperCase() === r.shortCode)) ||
      combined.includes(`[${r.rackCode}]`) ||
      combined.includes(`RACK-${r.rackCode}`) ||
      combined.includes(`${r.rackCode} -`) ||
      combined.includes(`${r.rackCode} —`)
    ) {
      const shelfNum = getCanonicalShelfNumber(shelfStr);
      const sCode = `S${String(shelfNum).padStart(2, '0')}`;
      return {
        rackCode: r.rackCode,
        rackId: r.rackId,
        shelfCode: sCode,
        shelfNumber: shelfNum,
        program: r.program,
        domain: r.domain,
      };
    }
  }

  // 2. Keyword-based academic routing into R01 - R24
  let targetRack = ACADEMIC_RACK_HIERARCHY[0]; // Default R01 B.Tech / B.E.

  if (combined.includes('MBA') || combined.includes('FINANCE') || combined.includes('MARKETING') || combined.includes('SUPPLY CHAIN') || combined.includes('HUMAN RESOURCE')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R10') || targetRack;
  } else if (combined.includes('BBA')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R09') || targetRack;
  } else if (combined.includes('B.COM') || combined.includes('BCOM') || combined.includes('ACCOUNTING') || combined.includes('TAXATION') || combined.includes('AUDITING')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R07') || targetRack;
  } else if (combined.includes('M.COM') || combined.includes('MCOM')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R08') || targetRack;
  } else if (combined.includes('MCA')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R06') || targetRack;
  } else if (combined.includes('BCA')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R05') || targetRack;
  } else if (combined.includes('M.TECH') || combined.includes('MTECH') || combined.includes('M.E.') || combined.includes('POSTGRADUATE ENGINEERING')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R02') || targetRack;
  } else if (combined.includes('M.SC') || combined.includes('MSC')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R04') || targetRack;
  } else if (combined.includes('B.SC') || combined.includes('BSC') || combined.includes('PHYSICS') || combined.includes('CHEMISTRY') || combined.includes('BIOLOGY')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R03') || targetRack;
  } else if (combined.includes('LAW') || combined.includes('LLB') || combined.includes('LLM') || combined.includes('CONSTITUTION') || combined.includes('LEGAL')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R13') || targetRack;
  } else if (combined.includes('MEDICINE') || combined.includes('MBBS') || combined.includes('ANATOMY') || combined.includes('SURGERY') || combined.includes('PATHOLOGY')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R14') || targetRack;
  } else if (combined.includes('PHARMACY') || combined.includes('PHARMA') || combined.includes('DRUG')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R15') || targetRack;
  } else if (combined.includes('NURSING') || combined.includes('PATIENT CARE')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R16') || targetRack;
  } else if (combined.includes('AGRICULTURE') || combined.includes('AGRONOMY') || combined.includes('HORTICULTURE')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R17') || targetRack;
  } else if (combined.includes('ARCHITECTURE') || combined.includes('ARCH') || combined.includes('URBAN PLANNING')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R18') || targetRack;
  } else if (combined.includes('EDUCATION') || combined.includes('B.ED') || combined.includes('PEDAGOGY')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R19') || targetRack;
  } else if (combined.includes('DESIGN') || combined.includes('FINE ARTS') || combined.includes('GRAPHIC')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R20') || targetRack;
  } else if (combined.includes('JOURNALISM') || combined.includes('MASS COMM') || combined.includes('MEDIA')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R21') || targetRack;
  } else if (combined.includes('SOCIAL SCIENCE') || combined.includes('SOCIOLOGY') || combined.includes('ANTHROPOLOGY')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R22') || targetRack;
  } else if (combined.includes('PH.D') || combined.includes('PHD') || combined.includes('DISSERTATION') || combined.includes('THESIS') || combined.includes('RESEARCH METHOD')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R23') || targetRack;
  } else if (combined.includes('GATE') || combined.includes('UPSC') || combined.includes('GRE') || combined.includes('CAT') || combined.includes('APTITUDE') || combined.includes('INTERVIEW')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R24') || targetRack;
  } else if (combined.includes('MA ') || combined.includes('M.A.')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R12') || targetRack;
  } else if (combined.includes('BA ') || combined.includes('B.A.') || combined.includes('ENGLISH') || combined.includes('HISTORY')) {
    targetRack = ACADEMIC_RACK_HIERARCHY.find((r) => r.rackCode === 'R11') || targetRack;
  } else {
    const directMatch = findRackDefinition(rackStr);
    if (directMatch) targetRack = directMatch;
  }

  const shelfNum = getCanonicalShelfNumber(shelfStr);
  const sCode = `S${String(shelfNum).padStart(2, '0')}`;

  return {
    rackCode: targetRack.rackCode,
    rackId: targetRack.rackId,
    shelfCode: sCode,
    shelfNumber: shelfNum,
    program: targetRack.program,
    domain: targetRack.domain,
  };
}
