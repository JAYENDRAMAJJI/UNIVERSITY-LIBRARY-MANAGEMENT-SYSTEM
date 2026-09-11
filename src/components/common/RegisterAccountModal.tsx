import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  X,
  CheckCircle,
  Mail,
  Lock,
  Phone,
  Building,
  User,
  Eye,
  EyeOff,
  Hash,
  GraduationCap,
  MapPin,
  PhoneCall,
  Clock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Briefcase,
  Layers,
  BookOpen,
  Award,
  Check,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { libraryStore, generateLibraryCardId } from '../../services/libraryStore.service';
import { Role } from '../../types';

// ==========================================
// DYNAMIC DATASETS PER MEMBERSHIP ROLE
// ==========================================
export const PROGRAM_DEPARTMENT_MAP: Record<string, string[]> = {
  'B.Tech (Bachelor of Technology)': [
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Biotechnology & Bioinformatics',
    'Data Science & Artificial Intelligence',
    'Information Technology',
    'Chemical Engineering',
    'Automobile Engineering',
  ],
  'M.Tech (Master of Technology)': [
    'Computer Science & Engineering (AI & Machine Learning)',
    'VLSI Design & Embedded Systems',
    'Power Systems & Power Electronics',
    'Thermal & Fluid Engineering',
    'Structural Engineering & Geomechanics',
    'Biotechnology & Bioprocess Engineering',
    'Data Science & Analytics',
  ],
  'MCA (Master of Computer Applications)': [
    'Computer Applications & Software Engineering',
    'Cloud Computing & DevOps',
    'Data Science & Artificial Intelligence',
    'Information Security & Cyber Forensics',
  ],
  'MBA (Master of Business Administration)': [
    'Management Studies & General Management',
    'Finance & Financial Analytics',
    'Marketing & Brand Management',
    'Human Resource Management (HRM)',
    'Operations & Supply Chain Management',
    'Business Analytics & Digital Transformation',
  ],
  'B.Sc / M.Sc (Applied Sciences)': [
    'Department of Physics & Applied Optics',
    'Department of Chemistry & Materials Science',
    'Department of Mathematics & Computing',
    'Department of Biotechnology & Life Sciences',
    'Department of Environmental Sciences',
  ],
  'Integrated Dual Degree (B.Tech + M.Tech)': [
    'Computer Science & Engineering (Dual Degree)',
    'Electronics & Communication (Dual Degree)',
    'Data Science & Artificial Intelligence (Dual Degree)',
    'Mechanical & Robotics (Dual Degree)',
    'Biotechnology & Computational Biology (Dual Degree)',
  ],
  'Diploma in Engineering': [
    'Diploma in Computer Engineering',
    'Diploma in Electronics & Communication',
    'Diploma in Electrical Engineering',
    'Diploma in Mechanical Engineering',
    'Diploma in Civil Engineering',
    'Diploma in Automobile Engineering',
  ],
};

export const STUDENT_DEPARTMENT_SPECIALIZATION_MAP: Record<string, string[]> = {
  // B.Tech / Engineering Departments
  'Computer Science & Engineering': [
    'Artificial Intelligence & Machine Learning (AI/ML)',
    'Cybersecurity & Network Defense',
    'Data Science & Big Data Engineering',
    'Cloud Computing & DevOps Engineering',
    'Software Architecture & Full-Stack Development',
    'Human-Computer Interaction & UI/UX Systems',
    'General Computer Science & Engineering',
  ],
  'Electronics & Communication Engineering': [
    'VLSI Design & Microelectronics',
    'Embedded Systems & Real-Time IoT',
    'Wireless Communications, 5G & RF Engineering',
    'Signal Processing & Computer Vision',
    'Robotics & Industrial Control Systems',
    'General Electronics & Communication',
  ],
  'Electrical & Electronics Engineering': [
    'Electric Vehicle Technology & Battery Management',
    'Power Systems & Renewable Clean Energy',
    'Smart Grids & Power Electronics',
    'Control Systems & Industrial Automation',
    'General Electrical & Electronics Engineering',
  ],
  'Mechanical Engineering': [
    'Robotics & Automated Mechatronics',
    'Automotive Design & Advanced Powertrains',
    'Thermal & Fluid Dynamics Engineering',
    'Computer-Aided Design & Manufacturing (CAD/CAM)',
    'Additive Manufacturing & 3D Materials',
    'General Mechanical Engineering',
  ],
  'Civil Engineering': [
    'Structural Engineering & Earthquake Resilient Design',
    'Transportation & Smart Highway Infrastructure',
    'Geotechnical & Foundation Engineering',
    'Environmental Engineering & Water Resources',
    'Construction Management & BIM Technology',
    'General Civil Engineering',
  ],
  'Biotechnology & Bioinformatics': [
    'Genetic Engineering & Recombinant DNA',
    'Computational Genomics & Bioinformatics',
    'Biopharmaceutical Processing & Drug Delivery',
    'Industrial Biotechnology & Enzyme Technology',
    'General Biotechnology & Bioinformatics',
  ],
  'Data Science & Artificial Intelligence': [
    'Generative AI & Deep Learning Systems',
    'Natural Language Processing & Speech Tech',
    'Computer Vision & Autonomous Perception',
    'Predictive Big Data Analytics & BI',
    'Reinforcement Learning & Decision Systems',
  ],
  'Information Technology': [
    'Enterprise Cloud & Network Infrastructure',
    'Full-Stack Software Development & APIs',
    'Information & Cyber Forensics Security',
    'Mobile Application Development & Web Tech',
    'General Information Technology',
  ],
  'Chemical Engineering': [
    'Petrochemical & Refinery Engineering',
    'Green Sustainable Chemical Processes & Catalysis',
    'Polymers & Advanced Functional Materials',
    'Process Design & Plant Simulation',
    'General Chemical Engineering',
  ],
  'Automobile Engineering': [
    'EV Powertrains & Hybrid Vehicle Systems',
    'Autonomous Driving Systems & ADAS Tech',
    'Automotive Chassis, Suspension & Dynamics',
    'Automotive Crash Safety & Structural Design',
    'General Automobile Engineering',
  ],

  // M.Tech Departments
  'Computer Science & Engineering (AI & Machine Learning)': [
    'Deep Neural Architectures & LLM Engineering',
    'Autonomous Vision & Robotics Intelligence',
    'Reinforcement Learning & AI Safety',
  ],
  'VLSI Design & Embedded Systems': [
    'ASIC / FPGA Chip Design & Hardware Verification',
    'Low-Power Analog & Mixed-Signal ICs',
    'Embedded Linux & RTOS System Architecture',
  ],
  'Power Systems & Power Electronics': [
    'Smart Microgrids & Distributed Clean Energy',
    'High-Power Density Inverters & Motor Drives',
    'Grid Modernization & SCADA Telemetry',
  ],
  'Thermal & Fluid Engineering': [
    'Advanced Computational Fluid Dynamics (CFD)',
    'Cryogenics, Refrigeration & Heat Exchangers',
    'Turbomachinery & Aero-Thermal Propulsion',
  ],
  'Structural Engineering & Geomechanics': [
    'High-Rise & Seismic Structural Analysis',
    'Advanced Prestressed Concrete & Steel Composites',
    'Soil-Structure Interaction & Deep Foundations',
  ],
  'Biotechnology & Bioprocess Engineering': [
    'Upstream / Downstream Bioprocess Optimization',
    'Cell Culture Engineering & Vaccines Tech',
    'Synthetic Metabolic Pathways',
  ],
  'Data Science & Analytics': [
    'Scalable Distributed Computing & Spark/Hadoop',
    'Time Series & Financial Econometric Forecasting',
    'Graph Neural Networks & Knowledge Graphs',
  ],

  // MCA Departments
  'Computer Applications & Software Engineering': [
    'Modern Web & Microservices Architecture',
    'Enterprise Java / Spring Boot & Node.js Systems',
    'Database Architecture & Distributed SQL/NoSQL',
  ],
  'Cloud Computing & DevOps': [
    'AWS / Azure / GCP Cloud Solutions Architecture',
    'Kubernetes, Docker & CI/CD Pipelines',
    'Site Reliability Engineering (SRE) & Observability',
  ],
  'Information Security & Cyber Forensics': [
    'Ethical Hacking & Penetration Testing',
    'Incident Response & Digital Evidence Forensics',
    'Network Vulnerability Assessment & Defense',
  ],

  // MBA Departments
  'Management Studies & General Management': [
    'Strategic Leadership & International Business',
    'Consulting & Organizational Design',
    'Entrepreneurship & Venture Capital Creation',
  ],
  'Finance & Financial Analytics': [
    'Investment Banking & Equity Valuation',
    'FinTech, Quantitative Finance & Risk Analytics',
    'Corporate Financial Management & Treasury',
  ],
  'Marketing & Brand Management': [
    'Digital Marketing, SEO & Performance Ads',
    'Brand Strategy & Consumer Psychology',
    'Product Management & GTM Execution',
  ],
  'Human Resource Management (HRM)': [
    'Strategic Talent Acquisition & HR Analytics',
    'Organizational Psychology & Culture Building',
    'Compensation, Benefits & Global Labour Relations',
  ],
  'Operations & Supply Chain Management': [
    'Global Logistics & Procurement Strategy',
    'Lean Six Sigma & Quality Engineering',
    'Warehouse Automation & Smart Supply Networks',
  ],
  'Business Analytics & Digital Transformation': [
    'Data-Driven Decision Making & Executive BI',
    'Customer Analytics & Predictive Modeling',
    'Enterprise ERP & Agile Transformation',
  ],

  // Applied Sciences
  'Department of Physics & Applied Optics': [
    'Photonics, Laser Technology & Fiber Optics',
    'Quantum Mechanics & Solid State Physics',
    'Nanoscale Materials & Condensed Matter',
  ],
  'Department of Chemistry & Materials Science': [
    'Organic Synthesis & Pharmaceutical Chemistry',
    'Analytical Chemistry & Spectroscopy Tech',
    'Polymer Science & Nano-composites',
  ],
  'Department of Mathematics & Computing': [
    'Computational Applied Mathematics & Cryptography',
    'Statistical Modeling & Stochastic Processes',
    'Operations Research & Numerical Simulation',
  ],
  'Department of Biotechnology & Life Sciences': [
    'Microbiology & Immunology',
    'Molecular Biology & Recombinant Genetics',
    'Plant & Agricultural Biotechnology',
  ],
  'Department of Environmental Sciences': [
    'Climate Change Modeling & Sustainability Studies',
    'Environmental Toxicology & Pollution Control',
    'Ecology & Natural Resource Governance',
  ],

  // Dual Degree
  'Computer Science & Engineering (Dual Degree)': [
    'Advanced Artificial Intelligence & Neural Computing',
    'Distributed Systems & Cyber Defense',
  ],
  'Electronics & Communication (Dual Degree)': [
    'VLSI & Microelectronic Chip Systems',
    'Advanced Microwave & Optical Telecommunications',
  ],
  'Data Science & Artificial Intelligence (Dual Degree)': [
    'Large-Scale Machine Learning Platforms',
    'Autonomous Intelligence & Vision Systems',
  ],
  'Mechanical & Robotics (Dual Degree)': [
    'Industrial Robotic Systems & Mechatronics',
    'Advanced Fluid Power & Aerodynamics',
  ],
  'Biotechnology & Computational Biology (Dual Degree)': [
    'Molecular Bioengineering & Synthetic Biology',
    'Drug Design & Genomic Bioinformatics',
  ],

  // Diploma
  'Diploma in Computer Engineering': [
    'Web Development & Database Operations',
    'Hardware & PC Network Administration',
  ],
  'Diploma in Electronics & Communication': [
    'PCB Assembly & Circuit Diagnostics',
    'Electronic Instrument Servicing & Microcontrollers',
  ],
  'Diploma in Electrical Engineering': [
    'Electrical Installation & Panel Maintenance',
    'Motor Windings & Substation Monitoring',
  ],
  'Diploma in Mechanical Engineering': [
    'CNC Machining & Precision Fabrication',
    'Automotive Maintenance & Tooling',
  ],
  'Diploma in Civil Engineering': [
    'Surveying, Drafting & AutoCAD Mapping',
    'Site Supervision & Quality Inspection',
  ],
  'Diploma in Automobile Engineering': [
    'Vehicle Engine Overhaul & Diagnostics',
    'Auto Electricals & Air Conditioning Systems',
  ],
};

export const STUDENT_STATUS_OPTIONS = [
  'Regular / Full-Time Student',
  'Hosteller / Campus Resident',
  'Day Scholar (Commuter)',
  'Lateral Entry (Direct 2nd Year)',
  'Exchange / International Student',
  'Part-Time / Working Professional Student',
];

export const SCHOLAR_PROGRAM_DEPARTMENT_MAP: Record<string, string[]> = {
  'Ph.D. (Doctor of Philosophy) – Regular Full-Time': [
    'Computer Science & Engineering (AI / Systems)',
    'Electronics & Nanotechnology',
    'Electrical & Energy Systems',
    'Mechanical & Mechatronics',
    'Biotechnology & Computational Biology',
    'Physical Sciences & Quantum Materials',
    'Chemical & Environmental Sciences',
    'Mathematical & Information Sciences',
    'Management, Finance & Economics',
  ],
  'Ph.D. (Doctor of Philosophy) – Sponsored / Part-Time': [
    'Computer Science & Engineering (Industry Track)',
    'Electronics & Systems Engineering',
    'Power Systems & Renewable Energy',
    'Advanced Materials & Manufacturing',
    'Management, Policy & Corporate Strategy',
  ],
  'Post-Doctoral Research Fellowship (PDF)': [
    'Advanced AI, Neural Networks & Autonomous Systems',
    'Quantum Materials, Photonics & Nanotechnology',
    'Renewable Clean Energy & Grid Optimization',
    'Precision Bioengineering & Molecular Therapeutics',
    'Robotics & Smart Mechatronics',
  ],
  'MS by Research (Master of Science)': [
    'Computer Science & Engineering',
    'Data Science & Machine Learning',
    'Signal Processing & VLSI',
    'Computational Mechanics & Thermal Fluids',
    'Computational Biology & Bioinformatics',
  ],
  'Integrated M.Tech + Ph.D. Research': [
    'Computer Science & Engineering (Direct Ph.D.)',
    'Microelectronics & VLSI Systems',
    'Power & Intelligent Energy Systems',
    'Robotics & Mechatronics Engineering',
  ],
  'Visiting Research Scholar (International/National)': [
    'Interdisciplinary Engineering & Computational Sciences',
    'Artificial Intelligence & Global Data Analytics',
    'Applied Physical & Materials Sciences',
    'Sustainable Energy & Green Tech Innovation',
    'International Business & Management Strategy',
  ],
};

export const DEPARTMENT_RESEARCH_AREA_MAP: Record<string, string[]> = {
  // Ph.D. Regular Full-Time
  'Computer Science & Engineering (AI / Systems)': [
    'Deep Learning, LLMs & Foundation Models',
    'Distributed Systems, Cloud & Edge Computing',
    'Cybersecurity, Cryptography & Blockchain',
    'Computer Vision, Autonomous Systems & Robotics',
    'Natural Language Processing & Information Retrieval',
    'Quantum Computing & Quantum Algorithms',
  ],
  'Electronics & Nanotechnology': [
    'Semiconductor Device Physics & Nanoelectronics',
    'VLSI Design & Neuromorphic Computing Hardware',
    'Wireless Communications, 5G/6G & RF Systems',
    'Optoelectronics, Photonics & Laser Systems',
    'MEMS & Bio-electronic Sensor Arrays',
  ],
  'Electrical & Energy Systems': [
    'Smart Grids, Microgrids & Wide-Area Monitoring',
    'Renewable Clean Energy (Solar/Wind) & Storage Systems',
    'Electric Vehicle Powertrains, Battery Mgmt & Drives',
    'High Voltage Engineering & Power Electronics',
    'Control Systems & Industrial Automation',
  ],
  'Mechanical & Mechatronics': [
    'Autonomous Robotics, Kinematics & Mechatronic Design',
    'Additive Manufacturing & Advanced 3D Printing',
    'Computational Fluid Dynamics (CFD) & Thermal Engineering',
    'Aerospace Systems, Turbomachinery & Propulsion',
    'Biomechanics & Prosthetic Device Engineering',
  ],
  'Biotechnology & Computational Biology': [
    'CRISPR Genome Editing & Genetic Engineering',
    'Computational Structural Biology & Molecular Docking',
    'Synthetic Biology & Metabolic Pathway Engineering',
    'Biopharmaceutical Drug Design & Delivery Systems',
    'Environmental Biotechnology & Bioremediation',
  ],
  'Physical Sciences & Quantum Materials': [
    'Quantum Condensed Matter Physics & Superconductors',
    '2D Materials, Graphene & Topological Insulators',
    'Ultrafast Laser Spectroscopy & Non-linear Optics',
    'Theoretical High-Energy Physics & Cosmology',
    'Plasma Physics & Nuclear Fusion Technologies',
  ],
  'Chemical & Environmental Sciences': [
    'Green Sustainable Chemistry & Homogeneous Catalysis',
    'Functional Polymer Nanocomposites & Smart Coatings',
    'Electrochemical Energy Storage (Lithium/Sodium Batteries)',
    'Carbon Capture, Utilization & Water Purification Tech',
    'Atmospheric Chemistry & Pollution Modeling',
  ],
  'Mathematical & Information Sciences': [
    'Applied Mathematical Modeling & Numerical Methods',
    'Statistical Machine Learning & High-Dimensional Data',
    'Algebraic Geometry & Cryptographic Algorithms',
    'Dynamical Systems & Non-linear Differential Equations',
    'Stochastic Optimization & Operations Research',
  ],
  'Management, Finance & Economics': [
    'FinTech, Digital Currencies & Algorithmic Trading',
    'Sustainable Supply Chain Management & Logistics',
    'Corporate Governance, ESG & Strategic Leadership',
    'AI in Consumer Behavioral Analytics & Marketing',
    'Macroeconomic Policy, Econometrics & Global Markets',
  ],

  // Ph.D. Sponsored / Part-Time
  'Computer Science & Engineering (Industry Track)': [
    'Enterprise Cloud Architectures & DevOps Automation',
    'Industrial IoT & Edge Computing Infrastructures',
    'Applied AI / ML for Enterprise Decision Systems',
    'Zero-Trust Network Security & Identity Governance',
  ],
  'Electronics & Systems Engineering': [
    'Industrial Embedded Systems & Real-Time OS',
    'Automotive Electronics & Autonomous Drive ECUs',
    'Power Management ICs & High-Speed PCB Systems',
  ],
  'Power Systems & Renewable Energy': [
    'Utility-Scale Solar/Wind Grid Integration',
    'Industrial Energy Efficiency & Microgrid Storage',
    'Substation Automation & SCADA Cybersecurity',
  ],
  'Advanced Materials & Manufacturing': [
    'Industry 4.0 Smart Manufacturing & Digital Twins',
    'Advanced High-Strength Alloys & Composites',
    'Non-Destructive Testing & Structural Health Monitoring',
  ],
  'Management, Policy & Corporate Strategy': [
    'Strategic Technology Management & Corporate R&D',
    'Operations Excellence & Six Sigma in Manufacturing',
    'Public Policy & Sustainable Industry Transitions',
  ],

  // Post-Doctoral Research Fellowship (PDF)
  'Advanced AI, Neural Networks & Autonomous Systems': [
    'Generative AI Safety, Alignment & Mechanistic Interpretability',
    'Autonomous Robotics & Embodied Agentic AI',
    'Neuromorphic AI Architectures & Brain-Computer Interfaces',
  ],
  'Quantum Materials, Photonics & Nanotechnology': [
    'Topological Quantum Computing & Majorana Fermions',
    'Integrated Photonic Quantum Circuits & Quantum Memory',
    'Metamaterials & Sub-wavelength Optoelectronics',
  ],
  'Renewable Clean Energy & Grid Optimization': [
    'Perovskite/Tandem Solar Cells & Photovoltaic Physics',
    'Solid-State Battery Electrolytes & Fast Charging Physics',
    'Next-Gen Hydrogen Generation & Fuel Cell Catalysis',
  ],
  'Precision Bioengineering & Molecular Therapeutics': [
    'Targeted mRNA / CRISPR Therapeutics & Lipid Nanoparticles',
    'Organ-on-a-Chip Microfluidics & Disease Modeling',
    'Immuno-engineering & CAR-T Cell Re-engineering',
  ],
  'Robotics & Smart Mechatronics': [
    'Soft Robotics, Bio-inspired Actuators & Artificial Muscles',
    'Multi-Agent Swarm Robotics & Decentralized SLAM',
    'Exoskeletons & Neural-controlled Prosthetics',
  ],

  // MS by Research
  'Computer Science & Engineering': [
    'Algorithms & Parallel Computing',
    'Database Systems & Query Optimization',
    'Software Engineering & Program Synthesis',
  ],
  'Data Science & Machine Learning': [
    'Predictive Analytics & Statistical Learning',
    'Computer Vision & Multimedia Analytics',
    'Natural Language Processing & Speech Tech',
  ],
  'Signal Processing & VLSI': [
    'Digital Signal & Audio/Image Processing',
    'Low-Power VLSI Architectures',
    'FPGA Hardware Acceleration',
  ],
  'Computational Mechanics & Thermal Fluids': [
    'Computational Solid Mechanics & FEA',
    'Turbulence Modeling & Microfluidics',
    'Heat Transfer & Phase Change Dynamics',
  ],
  'Computational Biology & Bioinformatics': [
    'Metagenomics & Microbiome Sequencing',
    'Protein Structure Prediction & Molecular Dynamics',
    'Phylogenetics & Evolutionary Genomics',
  ],

  // Integrated M.Tech + Ph.D.
  'Computer Science & Engineering (Direct Ph.D.)': [
    'Theoretical Computer Science & Complexity Theory',
    'AI Systems & Deep Learning Architectures',
    'High-Performance Distributed Computing',
  ],
  'Microelectronics & VLSI Systems': [
    'Analog/Mixed-Signal IC Design',
    'System-on-Chip (SoC) Architectures',
    'Nanoscale Device Modeling & TCAD',
  ],
  'Power & Intelligent Energy Systems': [
    'Intelligent Energy Storage & Smart Inverters',
    'Renewable Power Conversion & Drives',
    'Power Quality & Grid Synchronization',
  ],
  'Robotics & Mechatronics Engineering': [
    'Robotic Manipulators & Motion Planning',
    'Sensor Fusion & Perception Systems',
    'Haptics & Human-Robot Interaction',
  ],

  // Visiting Research Scholar
  'Interdisciplinary Engineering & Computational Sciences': [
    'Multiphysics Modeling & Scientific Supercomputing',
    'Data-Driven Engineering & Inverse Problems',
    'Complex Systems Simulation & Network Science',
  ],
  'Artificial Intelligence & Global Data Analytics': [
    'Cross-Lingual AI & Global Knowledge Graphs',
    'Ethical AI, Algorithmic Fairness & Governance',
    'Federated Learning Across Global Institutions',
  ],
  'Applied Physical & Materials Sciences': [
    'Synchrotron & Neutron Scattering Studies',
    'Advanced Functional Biomaterials & Biomimetics',
    'High-Pressure Physics & Condensed Matter',
  ],
  'Sustainable Energy & Green Tech Innovation': [
    'Global Decarbonization Pathways & Policy Analytics',
    'Circular Economy & Waste-to-Energy Innovations',
    'International Energy Transition Systems',
  ],
  'International Business & Management Strategy': [
    'Cross-Border Mergers, Acquisitions & Global Trade',
    'Global Supply Chain Resilience & Geopolitical Risk',
    'International Corporate Innovation Ecosystems',
  ],
};

export const DEPARTMENT_SUPERVISOR_MAP: Record<string, string[]> = {
  // Computer Science & AI
  'Computer Science & Engineering (AI / Systems)': [
    'Prof. (Dr.) Aris Thorne – AI & Neural Architectures (Head of AI Lab)',
    'Prof. (Dr.) Elena Rostova – Distributed Systems & Cloud Computing',
    'Prof. (Dr.) Marcus Vance – Quantum Computing & Cryptography',
    'Dr. Sarah Jenkins – Computer Vision & Visual Intelligence',
    'Dr. Vikram Malhotra – Cybersecurity & Blockchain Lab',
    'Other / External Research Supervisor',
  ],
  'Computer Science & Engineering (Industry Track)': [
    'Prof. (Dr.) Elena Rostova – Distributed Systems & Enterprise Architecture',
    'Dr. Vikram Malhotra – Cybersecurity & Enterprise Systems',
    'Dr. Devashish Roy – Industry Collaboration & Automation Chair',
    'Other / External Research Supervisor',
  ],
  'Advanced AI, Neural Networks & Autonomous Systems': [
    'Prof. (Dr.) Aris Thorne – AI & Neural Architectures (Head of AI Lab)',
    'Prof. (Dr.) Marcus Vance – Quantum Computing & Cryptography',
    'Dr. Sarah Jenkins – Autonomous AI Systems',
    'Other / External Research Supervisor',
  ],
  'Computer Science & Engineering': [
    'Prof. (Dr.) Aris Thorne – AI & Neural Architectures',
    'Prof. (Dr.) Elena Rostova – Distributed Systems',
    'Dr. Vikram Malhotra – Software Engineering & Databases',
    'Other / External Research Supervisor',
  ],
  'Data Science & Machine Learning': [
    'Prof. (Dr.) Aris Thorne – AI & Machine Learning',
    'Dr. Sarah Jenkins – Data Science & Vision',
    'Dr. Rajiv Sengupta – Statistical Learning & Big Data',
    'Other / External Research Supervisor',
  ],
  'Computer Science & Engineering (Direct Ph.D.)': [
    'Prof. (Dr.) Aris Thorne – AI Systems Research',
    'Prof. (Dr.) Elena Rostova – High Performance Computing',
    'Prof. (Dr.) Marcus Vance – Theoretical Computer Science',
    'Other / External Research Supervisor',
  ],
  'Interdisciplinary Engineering & Computational Sciences': [
    'Prof. (Dr.) Aris Thorne – Computational Systems Chair',
    'Prof. (Dr.) Rajesh K. Nair – Interdisciplinary Systems',
    'Prof. (Dr.) Priya Sharma – Bioinformatics & Computation',
    'Other / External Research Supervisor',
  ],
  'Artificial Intelligence & Global Data Analytics': [
    'Prof. (Dr.) Aris Thorne – Global AI Chair',
    'Dr. Sarah Jenkins – Cross-Lingual & Vision Systems',
    'Prof. (Dr.) Elena Rostova – Global Computing Networks',
    'Other / External Research Supervisor',
  ],

  // Electronics & Nanotechnology
  'Electronics & Nanotechnology': [
    'Prof. (Dr.) Rajesh K. Nair – Robotics & Nanotechnology Lab',
    'Dr. Kevin Zhang – Semiconductor Devices & Nanoelectronics',
    'Dr. Meenakshi Sundaram – VLSI Systems & Neuromorphic Hardware',
    'Dr. Sanjay Verma – RF Systems & 6G Wireless',
    'Other / External Research Supervisor',
  ],
  'Electronics & Systems Engineering': [
    'Prof. (Dr.) Rajesh K. Nair – Embedded Systems & Robotics',
    'Dr. Kevin Zhang – Semiconductor Devices',
    'Dr. Meenakshi Sundaram – Industrial VLSI Systems',
    'Other / External Research Supervisor',
  ],
  'Signal Processing & VLSI': [
    'Dr. Meenakshi Sundaram – VLSI & Signal Architectures',
    'Dr. Sanjay Verma – Digital Signal Processing',
    'Dr. Kevin Zhang – Hardware Microelectronics',
    'Other / External Research Supervisor',
  ],
  'Microelectronics & VLSI Systems': [
    'Dr. Meenakshi Sundaram – SoC & VLSI Systems',
    'Dr. Kevin Zhang – Nanoelectronics & TCAD',
    'Prof. (Dr.) Rajesh K. Nair – Smart Systems',
    'Other / External Research Supervisor',
  ],

  // Electrical & Energy
  'Electrical & Energy Systems': [
    'Prof. (Dr.) Sunita Deshmukh – Renewable Energy & Smart Grids',
    'Dr. Amitabh Basu – Electric Vehicle Powertrains & Drives',
    'Dr. Harish Chandra – High Voltage Engineering & Microgrids',
    'Other / External Research Supervisor',
  ],
  'Power Systems & Renewable Energy': [
    'Prof. (Dr.) Sunita Deshmukh – Renewable Energy Systems Chair',
    'Dr. Harish Chandra – Utility Power Systems & SCADA',
    'Dr. Amitabh Basu – Industrial Energy Efficiency',
    'Other / External Research Supervisor',
  ],
  'Renewable Clean Energy & Grid Optimization': [
    'Prof. (Dr.) Sunita Deshmukh – Clean Energy Fellow Chair',
    'Dr. Amitabh Basu – Energy Storage & Grid Systems',
    'Prof. (Dr.) Ananya Sen – Solar Materials & Catalysis',
    'Other / External Research Supervisor',
  ],
  'Power & Intelligent Energy Systems': [
    'Prof. (Dr.) Sunita Deshmukh – Intelligent Energy Systems',
    'Dr. Harish Chandra – Power Quality & Microgrids',
    'Dr. Amitabh Basu – Power Electronics & Inverters',
    'Other / External Research Supervisor',
  ],
  'Sustainable Energy & Green Tech Innovation': [
    'Prof. (Dr.) Sunita Deshmukh – Sustainable Tech Chair',
    'Prof. (Dr.) Ananya Sen – Green Chemistry & Decarbonization',
    'Other / External Research Supervisor',
  ],

  // Mechanical & Mechatronics
  'Mechanical & Mechatronics': [
    'Prof. (Dr.) Rajesh K. Nair – Advanced Robotics & Autonomous Mechatronics',
    'Dr. David Hoffman – Additive Manufacturing & Smart Materials',
    'Dr. Pradeep Mishra – Computational Fluid Dynamics & Propulsion',
    'Other / External Research Supervisor',
  ],
  'Advanced Materials & Manufacturing': [
    'Dr. David Hoffman – Smart Manufacturing & 3D Materials',
    'Prof. (Dr.) Rajesh K. Nair – Mechatronics & Industry 4.0',
    'Dr. Siddharth Ray – Material Characterization & Metallurgy',
    'Other / External Research Supervisor',
  ],
  'Robotics & Smart Mechatronics': [
    'Prof. (Dr.) Rajesh K. Nair – Autonomous Swarm & Soft Robotics',
    'Dr. David Hoffman – Bio-inspired Robotics & Actuators',
    'Dr. Sarah Jenkins – Robot Vision & Perception',
    'Other / External Research Supervisor',
  ],
  'Computational Mechanics & Thermal Fluids': [
    'Dr. Pradeep Mishra – CFD & Thermal Fluid Mechanics',
    'Dr. David Hoffman – Solid Mechanics & Finite Element Analysis',
    'Other / External Research Supervisor',
  ],
  'Robotics & Mechatronics Engineering': [
    'Prof. (Dr.) Rajesh K. Nair – Intelligent Robotic Manipulators',
    'Dr. David Hoffman – Mechatronic Sensors & Haptics',
    'Other / External Research Supervisor',
  ],

  // Biotechnology & Computational Biology
  'Biotechnology & Computational Biology': [
    'Prof. (Dr.) Priya Sharma – Computational Biology & Genome Engineering',
    'Dr. Aarti Pillai – Synthetic Biology & Metabolic Engineering',
    'Dr. Manish Gupta – Molecular Docking & Biopharmaceuticals',
    'Other / External Research Supervisor',
  ],
  'Precision Bioengineering & Molecular Therapeutics': [
    'Prof. (Dr.) Priya Sharma – Targeted Nanomedicine & Gene Therapy',
    'Dr. Aarti Pillai – Microfluidics & Organ-on-a-Chip',
    'Dr. Manish Gupta – Immuno-engineering & Therapeutics',
    'Other / External Research Supervisor',
  ],
  'Computational Biology & Bioinformatics': [
    'Prof. (Dr.) Priya Sharma – Genomics & Structural Bioinformatics',
    'Dr. Aarti Pillai – Microbiome & Sequence Analysis',
    'Other / External Research Supervisor',
  ],

  // Physical & Chemical Sciences
  'Physical Sciences & Quantum Materials': [
    'Prof. (Dr.) Marcus Vance – Quantum Materials & Quantum Optics',
    'Dr. Siddharth Ray – Condensed Matter Physics & Superconductors',
    'Dr. Nicole Bauer – Nanomaterials & Ultrafast Spectroscopy',
    'Other / External Research Supervisor',
  ],
  'Quantum Materials, Photonics & Nanotechnology': [
    'Prof. (Dr.) Marcus Vance – Photonic Quantum Circuits Chair',
    'Dr. Siddharth Ray – 2D Materials & Topological Systems',
    'Dr. Nicole Bauer – Metamaterials & Quantum Optics',
    'Other / External Research Supervisor',
  ],
  'Applied Physical & Materials Sciences': [
    'Prof. (Dr.) Marcus Vance – Materials Physics Chair',
    'Dr. Siddharth Ray – Condensed Matter & Synchrotron Studies',
    'Other / External Research Supervisor',
  ],
  'Chemical & Environmental Sciences': [
    'Prof. (Dr.) Ananya Sen – Green Catalysis & Battery Chemistries',
    'Dr. Robert Chen – Functional Polymers & Water Purification',
    'Dr. Nalini Swaminathan – Carbon Capture & Atmospheric Chemistry',
    'Other / External Research Supervisor',
  ],

  // Mathematical Sciences
  'Mathematical & Information Sciences': [
    'Prof. (Dr.) S. Ramanujam – Applied Mathematics & Nonlinear Dynamics',
    'Dr. Rajiv Sengupta – Statistical Machine Learning & Optimization',
    'Dr. Clara Oswald – Cryptography & Information Theory',
    'Other / External Research Supervisor',
  ],

  // Management & Business
  'Management, Finance & Economics': [
    'Prof. (Dr.) Alistair Sterling – FinTech & Strategic Finance Chair',
    'Dr. Kavita Murthy – Sustainable Supply Chain & Operations',
    'Dr. Ronald Foster – Behavioral Analytics & Digital Strategy',
    'Other / External Research Supervisor',
  ],
  'Management, Policy & Corporate Strategy': [
    'Prof. (Dr.) Alistair Sterling – Corporate Strategy & Technology Policy',
    'Dr. Kavita Murthy – Operations Excellence & Governance',
    'Other / External Research Supervisor',
  ],
  'International Business & Management Strategy': [
    'Prof. (Dr.) Alistair Sterling – Global Business & Strategy Chair',
    'Dr. Kavita Murthy – International Trade & Global Risk',
    'Other / External Research Supervisor',
  ],
};

export const RESEARCH_ADMISSION_YEARS: string[] = [
  '2026 (Current Academic Session)',
  '2025 (1st / 2nd Year Scholar)',
  '2024 (2nd / 3rd Year Scholar)',
  '2023 (3rd / 4th Year Scholar)',
  '2022 (Senior Research Scholar)',
  '2021 (Extended Research Term)',
];

export const RESEARCH_STATUS_OPTIONS: string[] = [
  'Coursework Ongoing (Phase 1)',
  'Comprehensive Examination Passed (Phase 2)',
  'Research Proposal Approved / Candidacy Confirmed (Phase 3)',
  'Experimental Investigation & Data Analysis (Phase 4)',
  'Pre-Ph.D. Seminar & Synopsis Submitted (Phase 5)',
  'Thesis Submitted / Under Peer Evaluation (Phase 6)',
  'Defense Scheduled / Viva-Voce Pending (Phase 7)',
  'Degree Awarded / Research Completed (Alumni)',
];

export const FACULTY_DEPT_PROGRAM_MAP: Record<string, string[]> = {
  'Department of Computer Science & Engineering': [
    'B.Tech (Computer Science & Engineering)',
    'B.Tech (Artificial Intelligence & Data Science)',
    'M.Tech (Computer Science & Engineering)',
    'M.Tech (AI & Machine Learning)',
    'MCA (Master of Computer Applications)',
    'Integrated Dual Degree (B.Tech + M.Tech CSE)',
    'Ph.D. & Doctoral Research Program (CSE)',
  ],
  'Department of Electronics & Communication': [
    'B.Tech (Electronics & Communication Engineering)',
    'M.Tech (VLSI Design & Embedded Systems)',
    'M.Tech (Wireless Communications & Signal Processing)',
    'Ph.D. & Doctoral Research Program (ECE)',
  ],
  'Department of Electrical Engineering': [
    'B.Tech (Electrical & Electronics Engineering)',
    'M.Tech (Power Systems & Intelligent Energy)',
    'M.Tech (Electric Vehicle Technology & Smart Grids)',
    'Ph.D. & Doctoral Research Program (EEE)',
  ],
  'Department of Mechanical Engineering': [
    'B.Tech (Mechanical Engineering)',
    'M.Tech (CAD/CAM, Robotics & Automation)',
    'M.Tech (Thermal & Fluid Engineering)',
    'Ph.D. & Doctoral Research Program (ME)',
  ],
  'Department of Civil Engineering': [
    'B.Tech (Civil Engineering)',
    'M.Tech (Structural & Earthquake Engineering)',
    'M.Tech (Environmental & Water Resources)',
    'Ph.D. & Doctoral Research Program (CE)',
  ],
  'Department of Biotechnology & Life Sciences': [
    'B.Tech (Biotechnology & Bioinformatics)',
    'M.Tech (Biopharmaceutical & Genetic Engineering)',
    'M.Sc (Applied Molecular Biology & Genomics)',
    'Ph.D. & Doctoral Research Program (BT)',
  ],
  'Department of Management Studies': [
    'MBA (Business Analytics & AI Strategy)',
    'MBA (Finance & FinTech Management)',
    'MBA (Operations, Supply Chain & Strategy)',
    'BBA (Bachelor of Business Administration)',
    'Executive Fellow / Ph.D. Program (Management)',
  ],
  'Department of Physics & Applied Optics': [
    'B.Sc / M.Sc (Applied Physics & Optics)',
    'M.Sc (Quantum Materials & Nanotechnology)',
    'Ph.D. & Doctoral Research Program (Physics)',
  ],
  'Department of Chemistry & Materials': [
    'B.Sc / M.Sc (Applied & Industrial Chemistry)',
    'M.Sc (Polymer & Green Sustainable Chemistry)',
    'Ph.D. & Doctoral Research Program (Chemistry)',
  ],
  'Department of Mathematics & Computing': [
    'B.Sc / M.Sc (Mathematics & Computing)',
    'M.Sc (Applied Statistics & Data Science)',
    'Ph.D. & Doctoral Research Program (Mathematics)',
  ],
  'Department of Humanities & Social Sciences': [
    'B.A. (Economics, Public Policy & Governance)',
    'M.A. (English, Linguistics & Communication)',
    'Ph.D. & Doctoral Research Program (HSS)',
  ],
};

export const FACULTY_DEPT_SPECIALIZATION_MAP: Record<string, string[]> = {
  'Department of Computer Science & Engineering': [
    'Artificial Intelligence & Deep Learning',
    'Distributed Systems & Cloud Computing',
    'Cybersecurity & Cryptographic Protocols',
    'Computer Vision & Autonomous Robotics',
    'Natural Language Processing & LLMs',
    'Quantum Computing & Quantum Algorithms',
    'Database Systems & Big Data Engineering',
    'Software Architecture & Formal Methods',
  ],
  'Department of Electronics & Communication': [
    'VLSI & Neuromorphic Chip Design',
    '5G/6G Wireless Networks & RF Circuits',
    'Embedded Systems & Real-Time OS',
    'Semiconductor Device Nanotechnology',
    'Digital Signal Processing & Image Processing',
    'Optoelectronics & Fiber Optics Communication',
  ],
  'Department of Electrical Engineering': [
    'Smart Grids & Microgrid Control Systems',
    'Electric Vehicle Powertrains & Battery Mgmt',
    'Power Electronics & Industrial Motor Drives',
    'Renewable Clean Energy Integration (Solar/Wind)',
    'High Voltage Engineering & Power Quality',
  ],
  'Department of Mechanical Engineering': [
    'Robotics, Kinematics & Mechatronic Systems',
    'Additive Manufacturing & Advanced 3D Printing',
    'Computational Fluid Dynamics (CFD) & Aerodynamics',
    'Automotive Systems, Powertrains & Dynamics',
    'Biomechanics & Orthopedic Implants Design',
  ],
  'Department of Civil Engineering': [
    'Earthquake Engineering & Seismic Design',
    'Structural Health Monitoring & Smart Materials',
    'Hydrology, Water Resources & Flood Modeling',
    'Geotechnical & Foundation Engineering',
    'Sustainable Urban Transportation Planning',
  ],
  'Department of Biotechnology & Life Sciences': [
    'CRISPR Gene Editing & Genetic Engineering',
    'Computational Structural Biology & Drug Design',
    'Synthetic Biology & Metabolic Engineering',
    'Microbial Biotechnology & Bioremediation',
    'Immunology & Cancer Therapeutics',
  ],
  'Department of Management Studies': [
    'Business Analytics, Big Data & AI Strategy',
    'Financial Econometrics, FinTech & Risk Mgmt',
    'Sustainable Global Supply Chain & Logistics',
    'Strategic Leadership & Corporate Governance',
    'Digital Consumer Behavior & Marketing Science',
  ],
  'Department of Physics & Applied Optics': [
    'Quantum Condensed Matter & Superconductivity',
    'Ultrafast Laser Spectroscopy & Photonics',
    '2D Materials & Nanoscale Physics',
    'Theoretical Astrophysics & General Relativity',
  ],
  'Department of Chemistry & Materials': [
    'Green Sustainable Catalysis & Organometallics',
    'Electrochemical Energy Storage & Battery Tech',
    'Functional Polymer Nanocomposites',
    'Medicinal Chemistry & Nanomedicine',
  ],
  'Department of Mathematics & Computing': [
    'Applied Mathematical Modeling & Scientific Computing',
    'Statistical Machine Learning & High-Dim Data',
    'Algebraic Topology & Cryptography',
    'Nonlinear Dynamics & Fluid Modeling',
  ],
  'Department of Humanities & Social Sciences': [
    'Development Economics & Public Policy Analysis',
    'Applied Linguistics, ELT & Technical Communication',
    'Science, Technology & Society (STS) Studies',
    'Ethics, AI Governance & Philosophy of Mind',
  ],
};

export const FACULTY_DESIGNATIONS: string[] = [
  'Assistant Professor (Grade I / II)',
  'Associate Professor',
  'Professor',
  'Professor of Eminence / Chair Professor',
  'Head of Department (HOD)',
  'Dean of Academic Affairs',
  'Dean of Research & Development',
  'Dean of Student Affairs',
  'Visiting / Adjunct Professor',
  'Principal Investigator / Emeritus Professor',
];

export const FACULTY_EMPLOYMENT_TYPES: string[] = [
  'Permanent / Tenured Faculty',
  'Contractual / Full-Time (Tenure Track)',
  'Visiting / Adjunct Faculty',
  'Emeritus Professor / Senior Fellow',
  'Adjunct Industry Specialist',
  'Post-Doctoral Teaching Fellow',
];

export const FACULTY_JOINING_YEARS: string[] = [
  '2026 (Current Academic Session)',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2018',
  '2015',
  '2010',
  '2005 or earlier',
];

export const FACULTY_STATUS_OPTIONS: string[] = [
  'Campus Resident (University Faculty Quarters / Enclave)',
  'Off-Campus Resident / City Commuter',
  'Active / On Regular Duty',
  'Visiting Faculty / Campus Guest House Resident',
  'On Academic Sabbatical Leave',
  'On Sponsored Research Deputation',
  'Emeritus Active / Honorary Professor',
  'On Administrative Assignment',
];

export const UNIVERSITY_HOSTEL_NAMES: string[] = [
  'Aryabhatta Boys Hostel (Hostel 1)',
  'Ramanujan Boys Hostel (Hostel 2)',
  'APJ Abdul Kalam Boys Hostel (Hostel 3)',
  'Homi Bhabha Boys Hostel (Hostel 4)',
  'Sarojini Naidu Girls Hostel (Hostel 5)',
  'Kalpana Chawla Girls Hostel (Hostel 6)',
  'Gargi Hall of Residence (Hostel 7)',
  'Maitreyi Hall of Residence (Hostel 8)',
  'International Students Hostel (ISH)',
  'Postgraduate & Scholars Hostel Complex',
  'University Transit Hostel / Guest House',
  'Other / Off-Campus Affiliated Hostel',
];

export const HOSTEL_BLOCKS: string[] = [
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'North Wing',
  'South Wing',
  'East Wing',
  'West Wing',
  'Central Wing',
];

export const HOSTEL_FLOORS: string[] = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
];

export const FACULTY_QUARTERS_TYPES: string[] = [
  'Professors Enclave (Type-V Housing)',
  'Associate Professors Housing (Type-IV Housing)',
  'Assistant Professors Quarters (Type-III Housing)',
  'Executive Faculty Guest House & Suites',
  'University Transit Faculty Apartments',
  'Deans & Administrative Officers Enclave',
  'Staff Residential Complex (Type-II / I)',
  'Other Campus Accommodation',
];

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi (NCT)',
  'Chandigarh',
  'Puducherry',
  'Other Union Territory / State',
];

export const PIN_PREFIX_STATE_MAP: Record<string, { state: string; city?: string }> = {
  '11': { state: 'Delhi (NCT)', city: 'New Delhi' },
  '12': { state: 'Haryana', city: 'Gurugram' },
  '13': { state: 'Haryana', city: 'Ambala' },
  '14': { state: 'Punjab', city: 'Ludhiana' },
  '15': { state: 'Punjab', city: 'Bathinda' },
  '16': { state: 'Chandigarh', city: 'Chandigarh' },
  '17': { state: 'Himachal Pradesh', city: 'Shimla' },
  '18': { state: 'Jammu & Kashmir / Ladakh', city: 'Jammu' },
  '19': { state: 'Jammu & Kashmir / Ladakh', city: 'Srinagar' },
  '20': { state: 'Uttar Pradesh', city: 'Noida' },
  '21': { state: 'Uttar Pradesh', city: 'Prayagraj' },
  '22': { state: 'Uttar Pradesh', city: 'Lucknow' },
  '23': { state: 'Uttar Pradesh', city: 'Mirzapur' },
  '24': { state: 'Uttarakhand', city: 'Dehradun' },
  '25': { state: 'Uttar Pradesh', city: 'Meerut' },
  '26': { state: 'Uttarakhand', city: 'Nainital' },
  '27': { state: 'Uttar Pradesh', city: 'Gorakhpur' },
  '28': { state: 'Uttar Pradesh', city: 'Agra' },
  '30': { state: 'Rajasthan', city: 'Jaipur' },
  '31': { state: 'Rajasthan', city: 'Udaipur' },
  '32': { state: 'Rajasthan', city: 'Kota' },
  '33': { state: 'Rajasthan', city: 'Bikaner' },
  '34': { state: 'Rajasthan', city: 'Jodhpur' },
  '36': { state: 'Gujarat', city: 'Rajkot' },
  '37': { state: 'Gujarat', city: 'Kutch' },
  '38': { state: 'Gujarat', city: 'Ahmedabad' },
  '39': { state: 'Gujarat', city: 'Surat' },
  '40': { state: 'Maharashtra', city: 'Mumbai' },
  '41': { state: 'Maharashtra', city: 'Pune' },
  '42': { state: 'Maharashtra', city: 'Nashik' },
  '43': { state: 'Maharashtra', city: 'Aurangabad' },
  '44': { state: 'Maharashtra', city: 'Nagpur' },
  '45': { state: 'Madhya Pradesh', city: 'Indore' },
  '46': { state: 'Madhya Pradesh', city: 'Bhopal' },
  '47': { state: 'Madhya Pradesh', city: 'Gwalior' },
  '48': { state: 'Madhya Pradesh', city: 'Jabalpur' },
  '49': { state: 'Chhattisgarh', city: 'Raipur' },
  '50': { state: 'Telangana', city: 'Hyderabad' },
  '51': { state: 'Andhra Pradesh', city: 'Tirupati' },
  '52': { state: 'Andhra Pradesh', city: 'Vijayawada' },
  '53': { state: 'Andhra Pradesh', city: 'Visakhapatnam' },
  '56': { state: 'Karnataka', city: 'Bengaluru' },
  '57': { state: 'Karnataka', city: 'Mangaluru' },
  '58': { state: 'Karnataka', city: 'Hubballi' },
  '59': { state: 'Karnataka', city: 'Belagavi' },
  '60': { state: 'Tamil Nadu', city: 'Chennai' },
  '61': { state: 'Tamil Nadu', city: 'Thanjavur' },
  '62': { state: 'Tamil Nadu', city: 'Madurai' },
  '63': { state: 'Tamil Nadu', city: 'Vellore' },
  '64': { state: 'Tamil Nadu', city: 'Coimbatore' },
  '67': { state: 'Kerala', city: 'Kozhikode' },
  '68': { state: 'Kerala', city: 'Kochi' },
  '69': { state: 'Kerala', city: 'Thiruvananthapuram' },
  '70': { state: 'West Bengal', city: 'Kolkata' },
  '71': { state: 'West Bengal', city: 'Howrah' },
  '72': { state: 'West Bengal', city: 'Midnapore' },
  '73': { state: 'West Bengal', city: 'Siliguri' },
  '74': { state: 'West Bengal', city: 'North 24 Parganas' },
  '75': { state: 'Odisha', city: 'Bhubaneswar' },
  '76': { state: 'Odisha', city: 'Berhampur' },
  '77': { state: 'Odisha', city: 'Rourkela' },
  '78': { state: 'Assam', city: 'Guwahati' },
  '79': { state: 'Meghalaya', city: 'Shillong' },
  '80': { state: 'Bihar', city: 'Patna' },
  '81': { state: 'Bihar', city: 'Bhagalpur' },
  '82': { state: 'Bihar', city: 'Gaya' },
  '83': { state: 'Jharkhand', city: 'Ranchi' },
  '84': { state: 'Bihar', city: 'Muzaffarpur' },
  '85': { state: 'Bihar', city: 'Purnia' },
};

export const normalizeIndianState = (rawState: string): string => {
  if (!rawState) return '';
  const s = rawState.trim().toLowerCase();
  if (s.includes('delhi')) return 'Delhi (NCT)';
  if (s.includes('andhra')) return 'Andhra Pradesh';
  if (s.includes('arunachal')) return 'Arunachal Pradesh';
  if (s.includes('assam')) return 'Assam';
  if (s.includes('bihar')) return 'Bihar';
  if (s.includes('chhattisgarh')) return 'Chhattisgarh';
  if (s.includes('goa')) return 'Goa';
  if (s.includes('gujarat')) return 'Gujarat';
  if (s.includes('haryana')) return 'Haryana';
  if (s.includes('himachal')) return 'Himachal Pradesh';
  if (s.includes('jharkhand')) return 'Jharkhand';
  if (s.includes('karnataka')) return 'Karnataka';
  if (s.includes('kerala')) return 'Kerala';
  if (s.includes('madhya')) return 'Madhya Pradesh';
  if (s.includes('maharashtra')) return 'Maharashtra';
  if (s.includes('manipur')) return 'Manipur';
  if (s.includes('meghalaya')) return 'Meghalaya';
  if (s.includes('mizoram')) return 'Mizoram';
  if (s.includes('nagaland')) return 'Nagaland';
  if (s.includes('odisha') || s.includes('orissa')) return 'Odisha';
  if (s.includes('punjab')) return 'Punjab';
  if (s.includes('rajasthan')) return 'Rajasthan';
  if (s.includes('sikkim')) return 'Sikkim';
  if (s.includes('tamil')) return 'Tamil Nadu';
  if (s.includes('telangana')) return 'Telangana';
  if (s.includes('tripura')) return 'Tripura';
  if (s.includes('uttar pradesh')) return 'Uttar Pradesh';
  if (s.includes('uttarakhand') || s.includes('uttaranchal')) return 'Uttarakhand';
  if (s.includes('west bengal') || s.includes('bengal')) return 'West Bengal';
  if (s.includes('chandigarh')) return 'Chandigarh';
  if (s.includes('puducherry') || s.includes('pondicherry')) return 'Puducherry';
  return rawState.trim();
};

export const lookupPincodeDetails = async (
  pincode: string
): Promise<{ city?: string; state?: string } | null> => {
  const pin = pincode.trim().replace(/[^0-9]/g, '');
  if (pin.length !== 6) return null;

  // 1. Try public Indian Postal API with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const district = po.District || po.Block || po.Circle || po.Name || '';
        const stateName = normalizeIndianState(po.State || '');
        return {
          city: district,
          state: stateName,
        };
      }
    }
  } catch {
    // Continue to next fallback
  }

  // 2. Try Zippopotam fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://api.zippopotam.us/in/${pin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.places && data.places.length > 0) {
        const place = data.places[0];
        const stateName = normalizeIndianState(place.state || '');
        return {
          city: place['place name'] || '',
          state: stateName,
        };
      }
    }
  } catch {
    // Continue to offline fallback
  }

  // 3. Instant 2-digit PIN prefix mapping
  const prefix = pin.slice(0, 2);
  const fallback = PIN_PREFIX_STATE_MAP[prefix];
  if (fallback) {
    return {
      city: fallback.city || '',
      state: fallback.state,
    };
  }

  return null;
};

export const PROGRAM_BATCH_MAP: Record<string, string[]> = {
  'B.Tech (Bachelor of Technology)': [
    'Batch 2026 – 2030 (4-Year UG)',
    'Batch 2025 – 2029 (4-Year UG)',
    'Batch 2024 – 2028 (4-Year UG)',
    'Batch 2023 – 2027 (4-Year UG)',
  ],
  'M.Tech (Master of Technology)': [
    'Batch 2026 – 2028 (2-Year PG)',
    'Batch 2025 – 2027 (2-Year PG)',
    'Batch 2024 – 2026 (2-Year PG)',
  ],
  'MCA (Master of Computer Applications)': [
    'Batch 2026 – 2028 (2-Year PG)',
    'Batch 2025 – 2027 (2-Year PG)',
    'Batch 2024 – 2026 (2-Year PG)',
  ],
  'MBA (Master of Business Administration)': [
    'Batch 2026 – 2028 (2-Year PG)',
    'Batch 2025 – 2027 (2-Year PG)',
    'Batch 2024 – 2026 (2-Year PG)',
  ],
  'B.Sc / M.Sc (Applied Sciences)': [
    'Batch 2026 – 2029 (3-Year UG)',
    'Batch 2025 – 2028 (3-Year UG)',
    'Batch 2024 – 2027 (3-Year UG)',
    'Batch 2026 – 2028 (2-Year PG)',
    'Batch 2025 – 2027 (2-Year PG)',
  ],
  'Integrated Dual Degree (B.Tech + M.Tech)': [
    'Batch 2026 – 2031 (5-Year Dual Degree)',
    'Batch 2025 – 2030 (5-Year Dual Degree)',
    'Batch 2024 – 2029 (5-Year Dual Degree)',
    'Batch 2023 – 2028 (5-Year Dual Degree)',
    'Batch 2022 – 2027 (5-Year Dual Degree)',
  ],
  'Diploma in Engineering': [
    'Batch 2026 – 2029 (3-Year Diploma)',
    'Batch 2025 – 2028 (3-Year Diploma)',
    'Batch 2024 – 2027 (3-Year Diploma)',
    'Batch 2023 – 2026 (3-Year Diploma)',
  ],
};

export const PROGRAM_DURATION_MAP: Record<string, { durationYears: number; label: string }> = {
  'B.Tech (Bachelor of Technology)': { durationYears: 4, label: '4-Year UG' },
  'M.Tech (Master of Technology)': { durationYears: 2, label: '2-Year PG' },
  'MCA (Master of Computer Applications)': { durationYears: 2, label: '2-Year PG' },
  'MBA (Master of Business Administration)': { durationYears: 2, label: '2-Year PG' },
  'B.Sc / M.Sc (Applied Sciences)': { durationYears: 3, label: '3-Year Degree' },
  'Integrated Dual Degree (B.Tech + M.Tech)': { durationYears: 5, label: '5-Year Dual Degree' },
  'Diploma in Engineering': { durationYears: 3, label: '3-Year Diploma' },
};

export const calculateAcademicBatch = (startYear: number | string, program: string): string => {
  const cleanYear = typeof startYear === 'string' ? parseInt(startYear.replace(/[^0-9]/g, ''), 10) : startYear;
  if (!cleanYear || isNaN(cleanYear) || cleanYear < 1990 || cleanYear > 2100) return '';
  const info = PROGRAM_DURATION_MAP[program] || { durationYears: 4, label: 'Degree' };
  const endYear = cleanYear + info.durationYears;
  return `Batch ${cleanYear} – ${endYear} (${info.label})`;
};

export const STUDENT_START_YEARS: number[] = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

export const PROGRAM_LEVEL_MAP: Record<string, string[]> = {
  'B.Tech (Bachelor of Technology)': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
    '3rd Year (Semester 5 / 6)',
    '4th Year (Semester 7 / 8)',
  ],
  'M.Tech (Master of Technology)': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
  ],
  'MCA (Master of Computer Applications)': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
  ],
  'MBA (Master of Business Administration)': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
  ],
  'B.Sc / M.Sc (Applied Sciences)': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
    '3rd Year (Semester 5 / 6)',
    'PG Year 1 (Semester 1 / 2)',
    'PG Year 2 (Semester 3 / 4)',
  ],
  'Integrated Dual Degree (B.Tech + M.Tech)': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
    '3rd Year (Semester 5 / 6)',
    '4th Year (Semester 7 / 8)',
    '5th Year (Semester 9 / 10)',
  ],
  'Diploma in Engineering': [
    '1st Year (Semester 1 / 2)',
    '2nd Year (Semester 3 / 4)',
    '3rd Year (Semester 5 / 6)',
  ],
};

export const ROLE_DATASETS = {
  STUDENT: {
    label: 'Student Scholar',
    badge: 'Undergraduate & Postgraduate',
    idLabel: 'Roll No / Registration ID *',
    idPlaceholder: '',
    departments: [
      'Computer Science & Engineering',
      'Electronics & Communication Engineering',
      'Electrical & Electronics Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Biotechnology & Bioinformatics',
      'Management Studies & General Management',
      'Data Science & Artificial Intelligence',
    ],
    programs: [
      'B.Tech (Bachelor of Technology)',
      'M.Tech (Master of Technology)',
      'MCA (Master of Computer Applications)',
      'MBA (Master of Business Administration)',
      'B.Sc / M.Sc (Applied Sciences)',
      'Integrated Dual Degree (B.Tech + M.Tech)',
      'Diploma in Engineering',
    ],
    batches: [
      'Batch 2026 – 2030 (4-Year UG)',
      'Batch 2025 – 2029 (4-Year UG)',
      'Batch 2024 – 2028 (4-Year UG)',
      'Batch 2023 – 2027 (4-Year UG)',
      'Batch 2025 – 2027 (2-Year PG)',
      'Batch 2024 – 2026 (2-Year PG)',
      'Batch 2026 – 2028 (2-Year PG)',
    ],
    levels: [
      '1st Year (Semester 1 / 2)',
      '2nd Year (Semester 3 / 4)',
      '3rd Year (Semester 5 / 6)',
      '4th Year (Semester 7 / 8)',
      'PG Year 1 (Semester 1 / 2)',
      'PG Year 2 (Semester 3 / 4)',
    ],
  },
  FACULTY: {
    label: 'Faculty Member / Professor',
    badge: 'Academic Teaching & Research',
    idLabel: 'Faculty Employee ID *',
    idPlaceholder: '',
    departments: [
      'Department of Computer Science & Engineering',
      'Department of Electronics & Communication',
      'Department of Electrical Engineering',
      'Department of Mechanical Engineering',
      'Department of Civil Engineering',
      'Department of Biotechnology & Life Sciences',
      'Department of Management Studies',
      'Department of Physics & Applied Optics',
      'Department of Chemistry & Materials',
      'Department of Mathematics & Computing',
      'Department of Humanities & Social Sciences',
    ],
    designations: [
      'Assistant Professor',
      'Associate Professor',
      'Professor',
      'Professor of Eminence',
      'Head of Department (HOD)',
      'Dean of Academic Affairs',
      'Dean of Research & Development',
      'Visiting / Adjunct Professor',
      'Principal Investigator / Emeritus',
    ],
    facultyTypes: [
      'Permanent / Tenured',
      'Contractual / Full-Time',
      'Visiting / Guest Faculty',
      'Emeritus Professor',
      'Research Fellow / Post-Doc Faculty',
    ],
  },
  RESEARCH_SCHOLAR: {
    label: 'Research Scholar / Doctoral Fellow',
    badge: 'Doctoral & Post-Doctoral Research',
    idLabel: 'Scholar ID / Registration ID *',
    idPlaceholder: '',
    departments: [
      'Computer Science & Engineering (AI / Systems)',
      'Electronics & Nanotechnology',
      'Electrical & Energy Systems',
      'Mechanical & Mechatronics',
      'Biotechnology & Computational Biology',
      'Physical Sciences & Quantum Materials',
      'Chemical & Environmental Sciences',
      'Mathematical & Information Sciences',
      'Management, Finance & Economics',
    ],
    researchPrograms: [
      'Ph.D. (Doctor of Philosophy) – Regular Full-Time',
      'Ph.D. (Doctor of Philosophy) – Sponsored / Part-Time',
      'Post-Doctoral Research Fellowship (PDF)',
      'MS by Research (Master of Science)',
      'Integrated M.Tech + Ph.D. Research',
      'Visiting Research Scholar (International/National)',
    ],
    supervisors: [
      'Prof. (Dr.) Aris Thorne – AI & Neural Architectures',
      'Prof. (Dr.) Elena Rostova – Distributed Systems & IoT',
      'Prof. (Dr.) Marcus Vance – Quantum Computing & Cryptography',
      'Prof. (Dr.) Priya Sharma – Computational Biology & Bioinformatics',
      'Prof. (Dr.) Rajesh K. Nair – Advanced Robotics & Automation',
      'Prof. (Dr.) Sunita Deshmukh – Renewable Energy & Materials',
      'Other / External Research Supervisor',
    ],
  },
  STAFF: {
    label: 'Library Staff / Administration',
    badge: 'Circulation & Vault Operations',
    idLabel: 'Library Staff Employee ID *',
    idPlaceholder: '',
    divisions: [
      'Circulation & Access Services',
      'Technical Processing & Cataloging',
      'Digital Library & Institutional Repositories',
      'Reference & Research Support',
      'Acquisitions & Collection Development',
      'Periodicals & Serials Management',
      'Systems Administration & IT Infrastructure',
      'Archives & Special Collections',
    ],
    designations: [
      'Chief Librarian & Administrative Head',
      'Deputy Librarian',
      'Assistant Librarian',
      'Library Information Officer',
      'Library Technical Assistant (LTA)',
      'Documentation & Cataloging Officer',
      'Circulation Desk Supervisor',
      'IT Systems & Digital Repository Administrator',
    ],
  },
};

interface RegisterAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterAccountModal({ isOpen, onClose, onSuccess }: RegisterAccountModalProps) {
  // Membership Role State
  const [selectedRole, setSelectedRole] = useState<Role>('STUDENT');

  // Common Fields State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '' as 'MALE' | 'FEMALE' | 'OTHER' | '',
    address: '',
    emergencyContact: '',
    idProofType: 'COLLEGE_ID' as 'COLLEGE_ID' | 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'OTHER',
    idProofNumber: '',
    password: '',
    confirmPassword: '',

    // Student Specific (Requires manual user selection)
    studentId: '',
    studentProgram: '',
    studentDept: '',
    studentSpecialization: '',
    studentStartYear: '',
    studentBatch: '',
    studentLevel: '',
    studentStatus: '',

    // Faculty Specific (Requires manual user selection)
    facultyId: '',
    facultyDept: '',
    facultyProgram: '',
    facultySpecialization: '',
    facultyDesignation: '',
    facultyType: '',
    facultyJoiningYear: '',
    facultyStatus: '',

    // Research Scholar Specific (Requires manual user selection)
    scholarId: '',
    researchProgram: '',
    scholarDept: '',
    researchArea: '',
    researchSupervisor: '',
    customSupervisor: '',
    researchAdmissionYear: '',
    researchStatus: '',

    // Staff Specific (Requires manual user selection)
    staffId: '',
    staffDivision: '',
    staffDesignation: '',

    // Dynamic Address Subfields
    hostelName: '',
    hostelBlock: '',
    hostelRoomNo: '',
    hostelFloor: '',

    resHouseStreet: '',
    resCity: '',
    resState: '',
    resPincode: '',

    facultyQuartersType: '',
    facultyQuarterNo: '',
    facultyQuarterBlock: '',
    facultyQuarterLane: '',

    intlCampusRoom: '',
    intlCountry: '',
    intlCity: '',
    intlPermanentAddress: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [pincodeSuccessMsg, setPincodeSuccessMsg] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    appRef: string;
    message: string;
    submittedName: string;
    submittedEmail: string;
    submittedRole: Role;
  } | null>(null);

  // Auto-lookup city and state when user enters a 6-digit PIN code
  const handlePincodeChange = async (val: string) => {
    const numericPin = val.replace(/[^0-9]/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, resPincode: numericPin }));
    if (fieldErrors.resPincode) setFieldErrors((prev) => ({ ...prev, resPincode: '' }));

    if (numericPin.length === 6) {
      setIsPincodeLoading(true);
      setPincodeSuccessMsg(null);
      try {
        const details = await lookupPincodeDetails(numericPin);
        if (details) {
          setFormData((prev) => ({
            ...prev,
            resCity: details.city || prev.resCity,
            resState: details.state || prev.resState,
          }));
          if (details.city || details.state) {
            setPincodeSuccessMsg(`Auto-detected: ${[details.city, details.state].filter(Boolean).join(', ')}`);
          }
        }
      } catch {
        // Keep existing user input
      } finally {
        setIsPincodeLoading(false);
      }
    } else {
      setPincodeSuccessMsg(null);
    }
  };

  // Dynamic available options based on currently selected Program / Course
  const availableStudentDepartments = useMemo(() => {
    if (!formData.studentProgram) return [];
    return PROGRAM_DEPARTMENT_MAP[formData.studentProgram] || ROLE_DATASETS.STUDENT.departments;
  }, [formData.studentProgram]);

  const availableStudentSpecializations = useMemo(() => {
    if (!formData.studentDept) return [];
    return (
      STUDENT_DEPARTMENT_SPECIALIZATION_MAP[formData.studentDept] || [
        'General Academic Studies',
        'Advanced Core Discipline',
        'Applied Research Track',
      ]
    );
  }, [formData.studentDept]);

  const availableStudentBatches = useMemo(() => {
    const list: string[] = [];
    if (formData.studentStartYear && formData.studentProgram) {
      const computed = calculateAcademicBatch(formData.studentStartYear, formData.studentProgram);
      if (computed) list.push(computed);
    }
    if (formData.studentProgram && PROGRAM_BATCH_MAP[formData.studentProgram]) {
      PROGRAM_BATCH_MAP[formData.studentProgram].forEach((b) => {
        if (!list.includes(b)) list.push(b);
      });
    } else {
      ROLE_DATASETS.STUDENT.batches.forEach((b) => {
        if (!list.includes(b)) list.push(b);
      });
    }
    return list;
  }, [formData.studentProgram, formData.studentStartYear]);

  const availableStudentLevels = useMemo(() => {
    if (!formData.studentProgram) return [];
    return PROGRAM_LEVEL_MAP[formData.studentProgram] || ROLE_DATASETS.STUDENT.levels;
  }, [formData.studentProgram]);

  // Faculty Dynamic Mappings
  const availableFacultyPrograms = useMemo(() => {
    if (!formData.facultyDept) return [];
    return FACULTY_DEPT_PROGRAM_MAP[formData.facultyDept] || [];
  }, [formData.facultyDept]);

  const availableFacultySpecializations = useMemo(() => {
    if (!formData.facultyDept) return [];
    return FACULTY_DEPT_SPECIALIZATION_MAP[formData.facultyDept] || [];
  }, [formData.facultyDept]);

  // Research Scholar Dynamic Mappings
  const availableScholarDepartments = useMemo(() => {
    if (!formData.researchProgram) return [];
    return SCHOLAR_PROGRAM_DEPARTMENT_MAP[formData.researchProgram] || ROLE_DATASETS.RESEARCH_SCHOLAR.departments;
  }, [formData.researchProgram]);

  const availableResearchAreas = useMemo(() => {
    if (!formData.scholarDept) return [];
    return (
      DEPARTMENT_RESEARCH_AREA_MAP[formData.scholarDept] || [
        'Advanced Algorithmic Research & Computation',
        'Applied Engineering Design & Modeling',
        'Theoretical & Experimental Investigation',
        'Interdisciplinary Studies & Analytics',
      ]
    );
  }, [formData.scholarDept]);

  const availableSupervisors = useMemo(() => {
    if (!formData.scholarDept) return [];
    return (
      DEPARTMENT_SUPERVISOR_MAP[formData.scholarDept] ||
      ROLE_DATASETS.RESEARCH_SCHOLAR.supervisors
    );
  }, [formData.scholarDept]);

  // Handler when Admission / Start Year changes -> automatically calculates Academic Batch based on course duration
  const handleStudentStartYearChange = (newYear: string) => {
    let computedBatch = formData.studentBatch;
    if (newYear) {
      const calc = calculateAcademicBatch(newYear, formData.studentProgram);
      if (calc) computedBatch = calc;
    }
    setFormData((prev) => ({
      ...prev,
      studentStartYear: newYear,
      studentBatch: computedBatch,
    }));
    if (fieldErrors.studentBatch && computedBatch) {
      setFieldErrors((prev) => ({ ...prev, studentBatch: '' }));
    }
  };

  // Handler when Student Program changes -> resets dependent fields and recalculates batch if start year is present
  const handleStudentProgramChange = (newProgram: string) => {
    let computedBatch = '';
    if (formData.studentStartYear) {
      computedBatch = calculateAcademicBatch(formData.studentStartYear, newProgram);
    }
    setFormData((prev) => ({
      ...prev,
      studentProgram: newProgram,
      studentDept: '',
      studentSpecialization: '',
      studentBatch: computedBatch,
      studentLevel: '',
    }));
    if (fieldErrors.studentProgram) {
      setFieldErrors((prev) => ({
        ...prev,
        studentProgram: '',
        studentDept: '',
        studentSpecialization: '',
        studentBatch: computedBatch ? '' : prev.studentBatch,
        studentLevel: '',
      }));
    }
  };

  // Handler when Student Department changes -> resets Specialization
  const handleStudentDeptChange = (newDept: string) => {
    setFormData((prev) => ({
      ...prev,
      studentDept: newDept,
      studentSpecialization: '',
    }));
    if (fieldErrors.studentDept) {
      setFieldErrors((prev) => ({
        ...prev,
        studentDept: '',
        studentSpecialization: '',
      }));
    }
  };

  // Handler when Faculty Department changes -> cascades to Program & Specialization
  const handleFacultyDeptChange = (newDept: string) => {
    setFormData((prev) => ({
      ...prev,
      facultyDept: newDept,
      facultyProgram: '',
      facultySpecialization: '',
    }));
    if (fieldErrors.facultyDept) {
      setFieldErrors((prev) => ({ ...prev, facultyDept: '' }));
    }
  };

  // Handler when Faculty Program changes
  const handleFacultyProgramChange = (newProgram: string) => {
    setFormData((prev) => ({
      ...prev,
      facultyProgram: newProgram,
    }));
    if (fieldErrors.facultyProgram) {
      setFieldErrors((prev) => ({ ...prev, facultyProgram: '' }));
    }
  };

  // Handler when Research Scholar Program changes
  const handleScholarProgramChange = (newProgram: string) => {
    setFormData((prev) => ({
      ...prev,
      researchProgram: newProgram,
      scholarDept: '',
      researchArea: '',
      researchSupervisor: '',
    }));
    if (fieldErrors.researchProgram) {
      setFieldErrors((prev) => ({ ...prev, researchProgram: '' }));
    }
  };

  // Handler when Research Scholar Department changes
  const handleScholarDeptChange = (newDept: string) => {
    setFormData((prev) => ({
      ...prev,
      scholarDept: newDept,
      researchArea: '',
      researchSupervisor: '',
    }));
    if (fieldErrors.scholarDept) {
      setFieldErrors((prev) => ({ ...prev, scholarDept: '' }));
    }
  };

  // Handler when Student Status changes -> resets address fields and errors
  const handleStudentStatusChange = (newStatus: string) => {
    setFormData((prev) => ({
      ...prev,
      studentStatus: newStatus,
      hostelName: '',
      hostelBlock: '',
      hostelRoomNo: '',
      hostelFloor: '',
      resHouseStreet: '',
      resCity: '',
      resState: '',
      resPincode: '',
      intlCampusRoom: '',
      intlCountry: '',
      intlCity: '',
      intlPermanentAddress: '',
      address: '',
    }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.studentStatus;
      delete copy.hostelName;
      delete copy.hostelRoomNo;
      delete copy.resHouseStreet;
      delete copy.resCity;
      delete copy.resState;
      delete copy.resPincode;
      delete copy.intlCampusRoom;
      delete copy.intlCountry;
      return copy;
    });
  };

  // Handler when Faculty Status changes -> resets address fields and errors
  const handleFacultyStatusChange = (newStatus: string) => {
    setFormData((prev) => ({
      ...prev,
      facultyStatus: newStatus,
      facultyQuartersType: '',
      facultyQuarterNo: '',
      facultyQuarterBlock: '',
      facultyQuarterLane: '',
      resHouseStreet: '',
      resCity: '',
      resState: '',
      resPincode: '',
      address: '',
    }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.facultyStatus;
      delete copy.facultyQuartersType;
      delete copy.facultyQuarterNo;
      delete copy.resHouseStreet;
      delete copy.resCity;
      delete copy.resState;
      delete copy.resPincode;
      return copy;
    });
  };

  // Determine active address mode dynamically based on Student Status or Faculty Status
  const activeAddressType = useMemo((): 'HOSTEL' | 'RESIDENTIAL' | 'FACULTY_QUARTERS' | 'INTERNATIONAL' | 'UNSELECTED' => {
    if (selectedRole === 'STUDENT') {
      if (!formData.studentStatus) return 'UNSELECTED';
      if (formData.studentStatus.includes('Hosteller') || formData.studentStatus.includes('Campus Resident')) {
        return 'HOSTEL';
      }
      if (formData.studentStatus.includes('Exchange') || formData.studentStatus.includes('International')) {
        return 'INTERNATIONAL';
      }
      return 'RESIDENTIAL'; // Day Scholar, Regular, Lateral Entry, Part-Time
    }

    if (selectedRole === 'FACULTY') {
      if (!formData.facultyStatus) return 'UNSELECTED';
      if (
        formData.facultyStatus.includes('Campus Resident') ||
        formData.facultyStatus.includes('Campus Quarters') ||
        formData.facultyStatus.includes('Guest House')
      ) {
        return 'FACULTY_QUARTERS';
      }
      return 'RESIDENTIAL'; // Off-Campus, Regular Duty, Sabbatical, Deputation, Emeritus
    }

    // Default for Research Scholar, Staff, and others
    return 'RESIDENTIAL';
  }, [selectedRole, formData.studentStatus, formData.facultyStatus]);

  // Synchronize dynamic address subfields into formData.address
  useEffect(() => {
    let computedAddress = '';
    if (activeAddressType === 'HOSTEL') {
      const parts = [
        formData.hostelName,
        formData.hostelBlock,
        formData.hostelFloor,
        formData.hostelRoomNo ? `Room ${formData.hostelRoomNo}` : '',
        'University Campus Hostel Zone',
      ].filter(Boolean);
      computedAddress = parts.join(', ');
    } else if (activeAddressType === 'FACULTY_QUARTERS') {
      const parts = [
        formData.facultyQuartersType,
        formData.facultyQuarterNo ? `Quarter/Flat No. ${formData.facultyQuarterNo}` : '',
        formData.facultyQuarterBlock,
        formData.facultyQuarterLane,
        'University Campus Residential Enclave',
      ].filter(Boolean);
      computedAddress = parts.join(', ');
    } else if (activeAddressType === 'INTERNATIONAL') {
      const parts = [
        formData.intlCampusRoom ? `Campus Room: ${formData.intlCampusRoom}` : '',
        formData.intlPermanentAddress,
        formData.intlCity,
        formData.intlCountry,
      ].filter(Boolean);
      computedAddress = parts.join(', ');
    } else if (activeAddressType === 'RESIDENTIAL') {
      const parts = [
        formData.resHouseStreet,
        formData.resCity,
        formData.resState,
        formData.resPincode ? `PIN - ${formData.resPincode}` : '',
      ].filter(Boolean);
      computedAddress = parts.join(', ');
    }

    if (computedAddress) {
      setFormData((prev) => ({ ...prev, address: computedAddress }));
    }
  }, [
    activeAddressType,
    formData.hostelName,
    formData.hostelBlock,
    formData.hostelFloor,
    formData.hostelRoomNo,
    formData.facultyQuartersType,
    formData.facultyQuarterNo,
    formData.facultyQuarterBlock,
    formData.facultyQuarterLane,
    formData.intlCampusRoom,
    formData.intlCountry,
    formData.intlCity,
    formData.intlPermanentAddress,
    formData.resHouseStreet,
    formData.resCity,
    formData.resState,
    formData.resPincode,
  ]);

  // Reset role-specific fields when role changes without pre-selecting defaults
  const handleRoleChange = (newRole: Role) => {
    setSelectedRole(newRole);
    setFormError(null);
    setFieldErrors({});

    setFormData((prev) => ({
      ...prev,
      // Reset Student fields
      studentId: '',
      studentProgram: '',
      studentDept: '',
      studentSpecialization: '',
      studentStartYear: '',
      studentBatch: '',
      studentLevel: '',
      studentStatus: '',

      // Reset Faculty fields
      facultyId: '',
      facultyDept: '',
      facultyProgram: '',
      facultySpecialization: '',
      facultyDesignation: '',
      facultyType: '',
      facultyJoiningYear: '',
      facultyStatus: '',

      // Reset Research Scholar fields
      scholarId: '',
      researchProgram: '',
      scholarDept: '',
      researchArea: '',
      researchSupervisor: '',
      customSupervisor: '',
      researchAdmissionYear: '',
      researchStatus: '',

      // Reset Staff fields
      staffId: '',
      staffDivision: '',
      staffDesignation: '',

      // Reset Dynamic Address fields
      hostelName: '',
      hostelBlock: '',
      hostelRoomNo: '',
      hostelFloor: '',
      resHouseStreet: '',
      resCity: '',
      resState: '',
      resPincode: '',
      facultyQuartersType: '',
      facultyQuarterNo: '',
      facultyQuarterBlock: '',
      facultyQuarterLane: '',
      intlCampusRoom: '',
      intlCountry: '',
      intlCity: '',
      intlPermanentAddress: '',
      address: '',
    }));
  };

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    const p = formData.password || '';
    const hasMinLen = p.length >= 8;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);

    let score = 0;
    if (hasMinLen) score++;
    if (hasUpper && hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    const isStrong = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial && score === 4;

    return {
      score, // 0 to 4
      hasMinLen,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isStrong,
      label:
        score === 0
          ? 'Too Short'
          : score === 1
          ? 'Weak (Insecure)'
          : score === 2
          ? 'Fair (Insecure)'
          : score === 3
          ? 'Good (Almost Ready)'
          : 'Strong & Secure ✓',
      color:
        score <= 1
          ? 'bg-rose-500 text-rose-700'
          : score === 2
          ? 'bg-amber-500 text-amber-700'
          : score === 3
          ? 'bg-blue-500 text-blue-700'
          : 'bg-emerald-500 text-emerald-700',
    };
  }, [formData.password]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSubmissionResult(null);
    setFormError(null);
    setFieldErrors({});
    onClose();
  };

  // Auto-format ID to uppercase and trim spaces
  const formatIdInput = (val: string) => {
    return val.toUpperCase().replace(/\s+/g, '');
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // 1. Name validation
    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Full name must be at least 3 characters.';
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Institutional email is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid institutional email address (e.g. name@college.edu).';
    }

    // 3. Phone number validation
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.phone = 'Please enter a valid 10 to 15 digit contact number.';
    }

    // 4. Role-specific ID & required fields validation
    if (selectedRole === 'STUDENT') {
      const cleanStudentId = formData.studentId.trim();
      if (!cleanStudentId) {
        errors.studentId = 'Roll No / Registration ID is required.';
      } else if (!/^[0-9]+$/.test(cleanStudentId)) {
        errors.studentId = 'Roll No / Registration ID must contain numbers only.';
      } else if (cleanStudentId.length < 4) {
        errors.studentId = 'Roll No must be at least 4 digits long (e.g. 20260042).';
      }

      if (!formData.studentProgram) {
        errors.studentProgram = 'Please select your Program / Course.';
      }
      if (!formData.studentDept) {
        errors.studentDept = 'Please select your Department.';
      }
      if (!formData.studentSpecialization) {
        errors.studentSpecialization = 'Please select your Specialization / Discipline.';
      }
      if (!formData.studentBatch) {
        errors.studentBatch = 'Please select your Academic Batch.';
      }
      if (!formData.studentLevel) {
        errors.studentLevel = 'Please select your Year / Semester.';
      }
      if (!formData.studentStatus) {
        errors.studentStatus = 'Please select your Student Status.';
      }
    } else if (selectedRole === 'FACULTY') {
      if (!formData.facultyId.trim()) {
        errors.facultyId = 'Faculty Employee ID is required.';
      } else if (formData.facultyId.trim().length < 3) {
        errors.facultyId = 'Faculty Employee ID must be at least 3 characters.';
      }
      if (!formData.facultyDesignation) {
        errors.facultyDesignation = 'Please select your Academic Designation.';
      }
      if (!formData.facultyDept) {
        errors.facultyDept = 'Please select your Department / Division.';
      }
      if (!formData.facultyProgram) {
        errors.facultyProgram = 'Please select your Program Affiliation.';
      }
      if (!formData.facultySpecialization) {
        errors.facultySpecialization = 'Please select your Specialization / Domain.';
      }
      if (!formData.facultyType) {
        errors.facultyType = 'Please select your Employment Type.';
      }
      if (!formData.facultyJoiningYear) {
        errors.facultyJoiningYear = 'Please select your Joining Year.';
      }
      if (!formData.facultyStatus) {
        errors.facultyStatus = 'Please select your Faculty Status.';
      }
    } else if (selectedRole === 'RESEARCH_SCHOLAR') {
      if (!formData.scholarId.trim()) {
        errors.scholarId = 'Scholar ID / Registration ID is required.';
      } else if (formData.scholarId.trim().length < 3) {
        errors.scholarId = 'Scholar ID must be at least 3 characters.';
      }
      if (!formData.researchProgram) {
        errors.researchProgram = 'Please select your Research Degree Program.';
      }
      if (!formData.scholarDept) {
        errors.scholarDept = 'Please select your Research Department.';
      }
      if (!formData.researchArea) {
        errors.researchArea = 'Please select your Research Area.';
      }
      if (!formData.researchSupervisor) {
        errors.researchSupervisor = 'Please select your Research Supervisor.';
      }
      if (
        formData.researchSupervisor === 'Other / External Research Supervisor' &&
        !formData.customSupervisor.trim()
      ) {
        errors.customSupervisor = 'Please enter the external supervisor name & institution.';
      }
      if (!formData.researchAdmissionYear) {
        errors.researchAdmissionYear = 'Please select your Admission Year.';
      }
      if (!formData.researchStatus) {
        errors.researchStatus = 'Please select your Research Academic Status.';
      }
    } else if (selectedRole === 'STAFF') {
      if (!formData.staffId.trim()) {
        errors.staffId = 'Library Staff Employee ID is required.';
      } else if (formData.staffId.trim().length < 3) {
        errors.staffId = 'Staff Employee ID must be at least 3 characters.';
      }
      if (!formData.staffDivision) {
        errors.staffDivision = 'Please select your Library Division.';
      }
      if (!formData.staffDesignation) {
        errors.staffDesignation = 'Please select your Staff Designation.';
      }
    }

    // 5. Password Validation (Must be Strong & Secure meeting all 4 criteria)
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (!passwordStrength.hasMinLen) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!passwordStrength.hasUpper || !passwordStrength.hasLower) {
      errors.password = 'Password must contain both uppercase and lowercase letters.';
    } else if (!passwordStrength.hasNumber) {
      errors.password = 'Password must contain at least one numerical digit (0-9).';
    } else if (!passwordStrength.hasSpecial) {
      errors.password = 'Password must contain at least one special character (e.g. !@#$%^&*).';
    } else if (!passwordStrength.isStrong) {
      errors.password = 'Password does not meet the Strong & Secure standard.';
    }

    // 6. Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please re-enter carefully.';
    }

    // 7. Gender validation
    if (!formData.gender) {
      errors.gender = 'Please select your gender.';
    }

    // 8. Dynamic Address Validation based on Active Address Mode
    if (activeAddressType === 'HOSTEL') {
      if (!formData.hostelName) {
        errors.hostelName = 'Please select your Hostel / Hall of Residence.';
      }
      if (!formData.hostelRoomNo.trim()) {
        errors.hostelRoomNo = 'Room / Bed number is required.';
      }
    } else if (activeAddressType === 'FACULTY_QUARTERS') {
      if (!formData.facultyQuartersType) {
        errors.facultyQuartersType = 'Please select Faculty Housing / Enclave type.';
      }
      if (!formData.facultyQuarterNo.trim()) {
        errors.facultyQuarterNo = 'Quarter / Flat number is required.';
      }
    } else if (activeAddressType === 'INTERNATIONAL') {
      if (!formData.intlCampusRoom.trim()) {
        errors.intlCampusRoom = 'Campus Room / International Hostel is required.';
      }
      if (!formData.intlCountry.trim()) {
        errors.intlCountry = 'Home Country is required.';
      }
    } else if (activeAddressType === 'RESIDENTIAL') {
      // Residential address is optional
    }

    // 9. Real-time duplicate checking against existing library snapshots
    const currentMembers = libraryStore.getMembers();
    const cleanEmail = formData.email.trim().toLowerCase();
    if (cleanEmail) {
      const existingEmail = currentMembers.find((m) => m.email.toLowerCase() === cleanEmail);
      if (existingEmail) {
        errors.email = `An account with email "${cleanEmail}" is already registered or pending.`;
      }
    }

    if (cleanPhone && cleanPhone.length >= 7) {
      const existingPhone = currentMembers.find((m) => {
        const p = (m.phone || '').replace(/[^0-9]/g, '');
        return p && (p === cleanPhone || p.endsWith(cleanPhone.slice(-10)) || cleanPhone.endsWith(p.slice(-10)));
      });
      if (existingPhone) {
        errors.phone = `Phone number is already associated with registered member: ${existingPhone.name}.`;
      }
    }

    const currentId =
      selectedRole === 'STUDENT'
        ? formData.studentId.trim().toUpperCase()
        : selectedRole === 'FACULTY'
        ? formData.facultyId.trim().toUpperCase()
        : selectedRole === 'RESEARCH_SCHOLAR'
        ? formData.scholarId.trim().toUpperCase()
        : formData.staffId.trim().toUpperCase();

    if (currentId) {
      const existingIdMember = currentMembers.find((m) => {
        const r = (m.rollNo || '').trim().toUpperCase();
        const s = (m.scholarId || '').trim().toUpperCase();
        return (r && r === currentId) || (s && s === currentId);
      });
      if (existingIdMember) {
        const idKey =
          selectedRole === 'STUDENT'
            ? 'studentId'
            : selectedRole === 'FACULTY'
            ? 'facultyId'
            : selectedRole === 'RESEARCH_SCHOLAR'
            ? 'scholarId'
            : 'staffId';
        errors[idKey] = `Institutional ID "${currentId}" is already registered (${existingIdMember.name}, ${existingIdMember.role}).`;
      }
    }

    setFieldErrors(errors);
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setFormError('Please resolve the highlighted validation errors before submitting.');
    } else {
      setFormError(null);
    }
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormError(null);

    // Prepare role-specific attributes payload
    let effectiveRollNo = '';
    let effectiveDepartment = '';
    let effectiveProgram = '';
    let effectiveBatch = '';
    let effectiveDesignation = '';
    let effectiveFacultyType = '';
    let effectiveScholarId = '';
    let effectiveResearchProgram = '';
    let effectiveSupervisor = '';
    let effectiveDivision = '';
    let effectiveLevel = '';

    if (selectedRole === 'STUDENT') {
      effectiveRollNo = formData.studentId.trim().toUpperCase();
      effectiveDepartment = formData.studentDept;
      effectiveProgram = formData.studentProgram;
      effectiveBatch = formData.studentBatch;
      effectiveLevel = formData.studentLevel;
    } else if (selectedRole === 'FACULTY') {
      effectiveRollNo = formData.facultyId.trim().toUpperCase();
      effectiveDepartment = formData.facultyDept;
      effectiveDesignation = formData.facultyDesignation;
      effectiveFacultyType = formData.facultyType;
      effectiveBatch = `${formData.facultyDesignation} • Joined ${String(formData.facultyJoiningYear).split(' (')[0]}`;
      effectiveProgram = formData.facultyProgram;
    } else if (selectedRole === 'RESEARCH_SCHOLAR') {
      effectiveRollNo = formData.scholarId.trim().toUpperCase();
      effectiveScholarId = formData.scholarId.trim().toUpperCase();
      effectiveDepartment = formData.scholarDept;
      effectiveResearchProgram = formData.researchProgram;
      effectiveSupervisor =
        formData.researchSupervisor === 'Other / External Research Supervisor'
          ? formData.customSupervisor.trim()
          : formData.researchSupervisor;
      effectiveProgram = formData.researchProgram;
      effectiveBatch = `${formData.researchStatus.split(' (')[0]} • Class of ${formData.researchAdmissionYear.split(' (')[0]}`;
    } else if (selectedRole === 'STAFF') {
      effectiveRollNo = formData.staffId.trim().toUpperCase();
      effectiveDivision = formData.staffDivision;
      effectiveDepartment = formData.staffDivision;
      effectiveDesignation = formData.staffDesignation;
      effectiveBatch = formData.staffDesignation;
      effectiveProgram = 'Library Administrative Services';
    }

    setTimeout(() => {
      const result = libraryStore.submitAccountRegistration({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: selectedRole,
        department: effectiveDepartment,
        phone: formData.phone.trim(),
        rollNo: effectiveRollNo,
        gender: (formData.gender || 'OTHER') as 'MALE' | 'FEMALE' | 'OTHER',
        program: effectiveProgram,
        academicBatch: effectiveBatch,
        studentSpecialization: formData.studentSpecialization || undefined,
        studentStatus: formData.studentStatus || undefined,
        address: formData.address.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        idProofType: formData.idProofType,
        idProofNumber: formData.idProofNumber.trim() || effectiveRollNo,
        designation: effectiveDesignation || undefined,
        facultyType: effectiveFacultyType || undefined,
        facultyProgram: formData.facultyProgram || undefined,
        facultySpecialization: formData.facultySpecialization || undefined,
        facultyJoiningYear: formData.facultyJoiningYear || undefined,
        facultyStatus: formData.facultyStatus || undefined,
        scholarId: effectiveScholarId || undefined,
        researchProgram: effectiveResearchProgram || undefined,
        researchSupervisor: effectiveSupervisor || undefined,
        researchArea: formData.researchArea || undefined,
        researchAdmissionYear: formData.researchAdmissionYear || undefined,
        researchStatus: formData.researchStatus || undefined,
        libraryDivision: effectiveDivision || undefined,
        level: effectiveLevel || undefined,
      });

      setIsSubmitting(false);

      if (result.success && result.member) {
        setSubmissionResult({
          success: true,
          appRef: result.member.memberCardNo || generateLibraryCardId(selectedRole),
          message: result.message,
          submittedName: result.member.name,
          submittedEmail: result.member.email,
          submittedRole: result.member.role,
        });
        if (onSuccess) onSuccess();
      } else {
        setFormError(result.message || 'Registration request could not be processed.');
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden space-y-0 my-auto max-h-[95vh] flex flex-col animate-scaleUp">
        {/* ============================================================= */}
        {/* MODAL HEADER                                                  */}
        {/* ============================================================= */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/20 shadow-inner">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg font-poppins tracking-tight">
                Library Account Registration
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Submit institutional membership application for Administrator approval
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* SUBMISSION SUCCESS & PENDING APPROVAL CONFIRMATION SCREEN   */}
        {/* ----------------------------------------------------------- */}
        {submissionResult ? (
          <div className="p-6 sm:p-8 space-y-5 overflow-y-auto text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center border-2 border-amber-300 shadow-lg shadow-amber-500/10">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> Account Status: Pending Approval
              </div>
              <h4 className="text-xl font-extrabold text-slate-900 font-poppins">
                Registration Application Submitted!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your application for <strong>{submissionResult.submittedName}</strong> ({submissionResult.submittedRole}) has been recorded and routed to the Central Library Administration for credential verification.
              </p>
            </div>

            {/* Application Dossier Box */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left space-y-2.5 text-xs max-w-md mx-auto">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Application Card Reference:</span>
                <span className="font-mono font-extrabold text-blue-700 text-sm tracking-wider">
                  {submissionResult.appRef}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Registered Email:</span>
                <span className="font-mono font-bold text-slate-800">{submissionResult.submittedEmail}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Assigned Role:</span>
                <span className="font-bold text-indigo-700">{submissionResult.submittedRole}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Review Desk:</span>
                <span className="font-bold text-slate-700">Central Library Admin Governance</span>
              </div>
            </div>

            {/* Approval Requirement Notice */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-left space-y-2 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" /> Important Access Policy & Notice:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11.5px] text-blue-800/90 leading-relaxed">
                <li>Your membership dossier is in the verification queue.</li>
                <li>You will <strong>not be able to log in</strong> to the Library Portal until the Administrator approves your application.</li>
                <li>Once approved, your card credentials and borrowing limits will be instantly activated.</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Understood & Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------- */
          /* REGISTRATION FORM                                           */
          /* ----------------------------------------------------------- */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs font-medium overflow-y-auto">
            {/* Top Form Alert Banner */}
            {formError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-xs animate-shake">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Validation Error</p>
                  <p className="text-[11px] text-rose-700">{formError}</p>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 1. MEMBERSHIP ROLE SELECTION                                  */}
            {/* ============================================================= */}
            <div className="space-y-2">
              <label className="block text-slate-800 font-bold text-xs">
                Select Membership Role *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: 'STUDENT' as Role,
                    label: 'Student',
                    icon: GraduationCap,
                    badge: 'UG / PG',
                    color: 'hover:border-blue-300',
                  },
                  {
                    id: 'FACULTY' as Role,
                    label: 'Faculty',
                    icon: Briefcase,
                    badge: 'Professors',
                    color: 'hover:border-purple-300',
                  },
                  {
                    id: 'RESEARCH_SCHOLAR' as Role,
                    label: 'Research Scholar',
                    icon: Sparkles,
                    badge: 'Ph.D. / PDF',
                    color: 'hover:border-cyan-300',
                  },
                  {
                    id: 'STAFF' as Role,
                    label: 'Library Staff',
                    icon: BookOpen,
                    badge: 'Administration',
                    color: 'hover:border-amber-300',
                  },
                ].map((roleOption) => {
                  const Icon = roleOption.icon;
                  const isSelected = selectedRole === roleOption.id;
                  return (
                    <button
                      key={roleOption.id}
                      type="button"
                      onClick={() => handleRoleChange(roleOption.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                          : `border-slate-200 bg-slate-50/50 text-slate-700 ${roleOption.color}`
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="font-bold text-xs mt-1 leading-tight">{roleOption.label}</span>
                      <span className="text-[10px] text-slate-500 leading-none">{roleOption.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ============================================================= */}
            {/* ============================================================= */}
            {/* 2. PERSONAL & CONTACT DETAILS                                 */}
            {/* ============================================================= */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-200/60 pb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Personal & Contact Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Full Legal Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                      }}
                      className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.name
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => {
                      setFormData({ ...formData, gender: e.target.value as any });
                      if (fieldErrors.gender) setFieldErrors({ ...fieldErrors, gender: '' });
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white ${
                      fieldErrors.gender
                        ? 'border-rose-300 ring-1 ring-rose-300'
                        : 'border-slate-200 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                  {fieldErrors.gender && (
                    <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.gender}</p>
                  )}
                </div>

                {/* Institutional Email */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Institutional Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                      }}
                      className={`w-full pl-10 pr-3 py-2.5 rounded-xl border font-mono text-[11.5px] text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.email
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                      }}
                      className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.phone
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* 3. DYNAMIC ROLE-SPECIFIC INSTITUTIONAL FIELDS                 */}
            {/* ============================================================= */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/70 space-y-3.5">
              <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>
                    {selectedRole === 'STUDENT'
                      ? 'Student Academic Enrollment Details'
                      : selectedRole === 'FACULTY'
                      ? 'Faculty Department & Academic Appointment'
                      : selectedRole === 'RESEARCH_SCHOLAR'
                      ? 'Doctoral Research & Supervision Details'
                      : 'Library Department & Operational Designation'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                  {selectedRole}
                </span>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* ROLE A: STUDENT FIELDS                                      */}
              {/* ----------------------------------------------------------- */}
              {selectedRole === 'STUDENT' && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Row 1: Roll No & Program / Course */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Roll No / Registration ID */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Roll No / Registration ID *</label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                          value={formData.studentId}
                          onChange={(e) => {
                            const numericOnly = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({ ...formData, studentId: numericOnly });
                            if (fieldErrors.studentId) setFieldErrors({ ...fieldErrors, studentId: '' });
                          }}
                          onKeyDown={(e) => {
                            if (
                              !/[0-9]/.test(e.key) &&
                              !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                              !e.ctrlKey &&
                              !e.metaKey
                            ) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl border font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                            fieldErrors.studentId
                              ? 'border-rose-300 ring-1 ring-rose-300'
                              : 'border-slate-200 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {fieldErrors.studentId && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentId}</p>
                      )}
                    </div>

                    {/* Program / Course */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Program / Course *</label>
                      <select
                        value={formData.studentProgram}
                        onChange={(e) => handleStudentProgramChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.studentProgram
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Program / Course</option>
                        {ROLE_DATASETS.STUDENT.programs.map((prog) => (
                          <option key={prog} value={prog}>
                            {prog}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.studentProgram && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentProgram}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Department & Specialization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Department (Dynamically filtered by Program) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Department *</label>
                      <select
                        value={formData.studentDept}
                        disabled={!formData.studentProgram}
                        onChange={(e) => handleStudentDeptChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.studentDept
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.studentProgram ? 'Select Department' : 'Select Program first'}
                        </option>
                        {availableStudentDepartments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.studentDept && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentDept}</p>
                      )}
                    </div>

                    {/* Specialization / Discipline (Dynamically filtered by Department) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Specialization / Discipline *</label>
                      <select
                        value={formData.studentSpecialization}
                        disabled={!formData.studentDept}
                        onChange={(e) => {
                          setFormData({ ...formData, studentSpecialization: e.target.value });
                          if (fieldErrors.studentSpecialization) setFieldErrors({ ...fieldErrors, studentSpecialization: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.studentSpecialization
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.studentDept ? 'Select Specialization' : 'Select Department first'}
                        </option>
                        {availableStudentSpecializations.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.studentSpecialization && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentSpecialization}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Admission Start Year & Academic Batch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Start / Admission Year */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-700 font-bold">Admission / Start Year</label>
                        {formData.studentProgram && (
                          <span className="text-[10px] text-blue-600 font-medium">
                            Duration: {PROGRAM_DURATION_MAP[formData.studentProgram]?.durationYears || 4} Yrs
                          </span>
                        )}
                      </div>
                      <select
                        value={formData.studentStartYear}
                        onChange={(e) => handleStudentStartYearChange(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-[11px]"
                      >
                        <option value="">Select Start Year (or type Batch manually)</option>
                        {STUDENT_START_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr} {formData.studentProgram ? `→ End Year ${yr + (PROGRAM_DURATION_MAP[formData.studentProgram]?.durationYears || 4)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Batch (Auto-computed from Course Duration & Fully Editable) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-700 font-bold">Academic Batch *</label>
                        {formData.studentStartYear && formData.studentProgram && (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Auto-computed (Editable)
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        list="student-batch-suggestions"
                        value={formData.studentBatch}
                        onChange={(e) => {
                          setFormData({ ...formData, studentBatch: e.target.value });
                          if (fieldErrors.studentBatch) setFieldErrors({ ...fieldErrors, studentBatch: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 font-medium ${
                          fieldErrors.studentBatch
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      <datalist id="student-batch-suggestions">
                        {availableStudentBatches.map((batch) => (
                          <option key={batch} value={batch} />
                        ))}
                      </datalist>
                      {fieldErrors.studentBatch && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentBatch}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Year / Semester & Student Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Year / Semester / Level (Dynamically filtered by Program) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Year / Semester / Level *</label>
                      <select
                        value={formData.studentLevel}
                        disabled={!formData.studentProgram}
                        onChange={(e) => {
                          setFormData({ ...formData, studentLevel: e.target.value });
                          if (fieldErrors.studentLevel) setFieldErrors({ ...fieldErrors, studentLevel: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.studentLevel
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.studentProgram ? 'Select Year / Semester' : 'Select Program first'}
                        </option>
                        {availableStudentLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.studentLevel && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentLevel}</p>
                      )}
                    </div>

                    {/* Student Status */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Student Status *</label>
                      <select
                        value={formData.studentStatus}
                        onChange={(e) => handleStudentStatusChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.studentStatus
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Student Status</option>
                        {STUDENT_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.studentStatus && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.studentStatus}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* ROLE B: FACULTY FIELDS                                      */}
              {/* ----------------------------------------------------------- */}
              {selectedRole === 'FACULTY' && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Row 1: Faculty ID & Designation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Faculty Employee ID */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">
                        {ROLE_DATASETS.FACULTY.idLabel}
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.facultyId}
                          onChange={(e) => {
                            setFormData({ ...formData, facultyId: formatIdInput(e.target.value) });
                            if (fieldErrors.facultyId) setFieldErrors({ ...fieldErrors, facultyId: '' });
                          }}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl border font-mono uppercase text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                            fieldErrors.facultyId
                              ? 'border-rose-300 ring-1 ring-rose-300'
                              : 'border-slate-200 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {fieldErrors.facultyId && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyId}</p>
                      )}
                    </div>

                    {/* Academic Designation */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Academic Designation *</label>
                      <select
                        value={formData.facultyDesignation}
                        onChange={(e) => {
                          setFormData({ ...formData, facultyDesignation: e.target.value });
                          if (fieldErrors.facultyDesignation) setFieldErrors({ ...fieldErrors, facultyDesignation: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.facultyDesignation
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Academic Designation</option>
                        {FACULTY_DESIGNATIONS.map((desig) => (
                          <option key={desig} value={desig}>
                            {desig}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyDesignation && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyDesignation}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Department / Division & Program / Course Affiliation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Department / Division */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Department / Division *</label>
                      <select
                        value={formData.facultyDept}
                        onChange={(e) => handleFacultyDeptChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.facultyDept
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Department / Division</option>
                        {ROLE_DATASETS.FACULTY.departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyDept && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyDept}</p>
                      )}
                    </div>

                    {/* Program / Course Affiliation (Dynamically filtered by Department) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Program / Course Affiliation *</label>
                      <select
                        value={formData.facultyProgram}
                        disabled={!formData.facultyDept}
                        onChange={(e) => handleFacultyProgramChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.facultyProgram
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.facultyDept ? 'Select Program Affiliation' : 'Select Department first'}
                        </option>
                        {availableFacultyPrograms.map((prog) => (
                          <option key={prog} value={prog}>
                            {prog}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyProgram && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyProgram}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Specialization / Domain & Employment Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Specialization / Academic Domain (Dynamically filtered by Department) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Specialization / Domain *</label>
                      <select
                        value={formData.facultySpecialization}
                        disabled={!formData.facultyDept}
                        onChange={(e) => {
                          setFormData({ ...formData, facultySpecialization: e.target.value });
                          if (fieldErrors.facultySpecialization) setFieldErrors({ ...fieldErrors, facultySpecialization: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.facultySpecialization
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.facultyDept ? 'Select Specialization / Domain' : 'Select Department first'}
                        </option>
                        {availableFacultySpecializations.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultySpecialization && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultySpecialization}</p>
                      )}
                    </div>

                    {/* Employment Type */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Employment Type *</label>
                      <select
                        value={formData.facultyType}
                        onChange={(e) => {
                          setFormData({ ...formData, facultyType: e.target.value });
                          if (fieldErrors.facultyType) setFieldErrors({ ...fieldErrors, facultyType: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.facultyType
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Employment Type</option>
                        {FACULTY_EMPLOYMENT_TYPES.map((ft) => (
                          <option key={ft} value={ft}>
                            {ft}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyType && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyType}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Joining Year & Faculty Duty Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Joining Year */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Joining Year *</label>
                      <select
                        value={formData.facultyJoiningYear}
                        onChange={(e) => {
                          setFormData({ ...formData, facultyJoiningYear: e.target.value });
                          if (fieldErrors.facultyJoiningYear) setFieldErrors({ ...fieldErrors, facultyJoiningYear: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.facultyJoiningYear
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Joining Year</option>
                        {FACULTY_JOINING_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyJoiningYear && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyJoiningYear}</p>
                      )}
                    </div>

                    {/* Faculty Duty Status */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Faculty Status *</label>
                      <select
                        value={formData.facultyStatus}
                        onChange={(e) => handleFacultyStatusChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.facultyStatus
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Faculty Status</option>
                        {FACULTY_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyStatus && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyStatus}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* ROLE C: RESEARCH SCHOLAR FIELDS                             */}
              {/* ----------------------------------------------------------- */}
              {selectedRole === 'RESEARCH_SCHOLAR' && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Row 1: ID & Program */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Scholar ID / Registration ID */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">
                        {ROLE_DATASETS.RESEARCH_SCHOLAR.idLabel}
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.scholarId}
                          onChange={(e) => {
                            setFormData({ ...formData, scholarId: formatIdInput(e.target.value) });
                            if (fieldErrors.scholarId) setFieldErrors({ ...fieldErrors, scholarId: '' });
                          }}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl border font-mono uppercase text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                            fieldErrors.scholarId
                              ? 'border-rose-300 ring-1 ring-rose-300'
                              : 'border-slate-200 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {fieldErrors.scholarId && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.scholarId}</p>
                      )}
                    </div>

                    {/* Research Program */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Research Program *</label>
                      <select
                        value={formData.researchProgram}
                        onChange={(e) => handleScholarProgramChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.researchProgram
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Research Degree Program</option>
                        {ROLE_DATASETS.RESEARCH_SCHOLAR.researchPrograms.map((rp) => (
                          <option key={rp} value={rp}>
                            {rp}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.researchProgram && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.researchProgram}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Department & Area */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Department (Dynamically filtered by Program) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Research Department *</label>
                      <select
                        value={formData.scholarDept}
                        disabled={!formData.researchProgram}
                        onChange={(e) => handleScholarDeptChange(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.scholarDept
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.researchProgram ? 'Select Research Department' : 'Select Program first'}
                        </option>
                        {availableScholarDepartments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.scholarDept && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.scholarDept}</p>
                      )}
                    </div>

                    {/* Research Area / Specialization (Dynamically filtered by Department) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Research Area / Specialization *</label>
                      <select
                        value={formData.researchArea}
                        disabled={!formData.scholarDept}
                        onChange={(e) => {
                          setFormData({ ...formData, researchArea: e.target.value });
                          if (fieldErrors.researchArea) setFieldErrors({ ...fieldErrors, researchArea: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.researchArea
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.scholarDept ? 'Select Research Area' : 'Select Department first'}
                        </option>
                        {availableResearchAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.researchArea && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.researchArea}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Supervisor & Admission Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Research Supervisor (Dynamically filtered by Department) */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Research Supervisor / Guide *</label>
                      <select
                        value={formData.researchSupervisor}
                        disabled={!formData.scholarDept}
                        onChange={(e) => {
                          setFormData({ ...formData, researchSupervisor: e.target.value });
                          if (fieldErrors.researchSupervisor) setFieldErrors({ ...fieldErrors, researchSupervisor: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          fieldErrors.researchSupervisor
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>
                          {formData.scholarDept ? 'Select Research Supervisor' : 'Select Department first'}
                        </option>
                        {availableSupervisors.map((sup) => (
                          <option key={sup} value={sup}>
                            {sup}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.researchSupervisor && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.researchSupervisor}</p>
                      )}
                    </div>

                    {/* Research Admission Year */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Research Admission Year *</label>
                      <select
                        value={formData.researchAdmissionYear}
                        onChange={(e) => {
                          setFormData({ ...formData, researchAdmissionYear: e.target.value });
                          if (fieldErrors.researchAdmissionYear) setFieldErrors({ ...fieldErrors, researchAdmissionYear: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.researchAdmissionYear
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Admission Year</option>
                        {RESEARCH_ADMISSION_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.researchAdmissionYear && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.researchAdmissionYear}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Academic Research Status */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Research Academic Status *</label>
                    <select
                      value={formData.researchStatus}
                      onChange={(e) => {
                        setFormData({ ...formData, researchStatus: e.target.value });
                        if (fieldErrors.researchStatus) setFieldErrors({ ...fieldErrors, researchStatus: '' });
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                        fieldErrors.researchStatus
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    >
                      <option value="" disabled>Select Candidacy Status</option>
                      {RESEARCH_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.researchStatus && (
                      <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.researchStatus}</p>
                    )}
                  </div>

                  {/* Conditional: External Supervisor */}
                  {formData.researchSupervisor === 'Other / External Research Supervisor' && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="block text-slate-700 font-bold">
                        External Supervisor Name & Institution *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customSupervisor}
                        onChange={(e) => {
                          setFormData({ ...formData, customSupervisor: e.target.value });
                          if (fieldErrors.customSupervisor) setFieldErrors({ ...fieldErrors, customSupervisor: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.customSupervisor
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      {fieldErrors.customSupervisor && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.customSupervisor}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* ROLE D: LIBRARY STAFF FIELDS                                */}
              {/* ----------------------------------------------------------- */}
              {selectedRole === 'STAFF' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Staff Employee ID */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">
                        {ROLE_DATASETS.STAFF.idLabel}
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.staffId}
                          onChange={(e) => {
                            setFormData({ ...formData, staffId: formatIdInput(e.target.value) });
                            if (fieldErrors.staffId) setFieldErrors({ ...fieldErrors, staffId: '' });
                          }}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl border font-mono uppercase text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                            fieldErrors.staffId
                              ? 'border-rose-300 ring-1 ring-rose-300'
                              : 'border-slate-200 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {fieldErrors.staffId && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.staffId}</p>
                      )}
                    </div>

                    {/* Library Division */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Library Division *</label>
                      <select
                        value={formData.staffDivision}
                        onChange={(e) => {
                          setFormData({ ...formData, staffDivision: e.target.value });
                          if (fieldErrors.staffDivision) setFieldErrors({ ...fieldErrors, staffDivision: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.staffDivision
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Library Division</option>
                        {ROLE_DATASETS.STAFF.divisions.map((div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.staffDivision && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.staffDivision}</p>
                      )}
                    </div>

                    {/* Designation */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Staff Designation *</label>
                      <select
                        value={formData.staffDesignation}
                        onChange={(e) => {
                          setFormData({ ...formData, staffDesignation: e.target.value });
                          if (fieldErrors.staffDesignation) setFieldErrors({ ...fieldErrors, staffDesignation: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.staffDesignation
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="" disabled>Select Staff Designation</option>
                        {ROLE_DATASETS.STAFF.designations.map((desig) => (
                          <option key={desig} value={desig}>
                            {desig}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.staffDesignation && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.staffDesignation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* 4. PASSWORD & CREDENTIAL SECURITY                             */}
            {/* ============================================================= */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Account Password & Access Security</span>
                </div>
                {passwordStrength.isStrong && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs">
                    ✓ Strong & Secure
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                      }}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.password
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : passwordStrength.isStrong
                          ? 'border-emerald-300 ring-1 ring-emerald-300 focus:ring-emerald-500/20'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                      }}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.confirmPassword
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : formData.confirmPassword && formData.password === formData.confirmPassword
                          ? 'border-emerald-300 ring-1 ring-emerald-300'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword ? (
                    <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.confirmPassword}</p>
                  ) : formData.confirmPassword && formData.password === formData.confirmPassword ? (
                    <p className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match.
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Password Strength Meter & Requirement Checklist */}
              {formData.password ? (
                <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600">Password Strength:</span>
                    <span className={`font-bold ${passwordStrength.color.replace('bg-', 'text-')}`}>
                      {passwordStrength.label}
                    </span>
                  </div>

                  {/* Visual Strength Bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.score >= 1 ? passwordStrength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.score >= 2 ? passwordStrength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.score >= 3 ? passwordStrength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.score >= 4 ? passwordStrength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-slate-500 pt-1">
                    <span className={`flex items-center gap-1 ${passwordStrength.hasMinLen ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <Check className={`w-3 h-3 ${passwordStrength.hasMinLen ? 'text-emerald-600 font-bold' : 'text-slate-300'}`} />
                      8+ Characters
                    </span>
                    <span className={`flex items-center gap-1 ${passwordStrength.hasUpper && passwordStrength.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <Check className={`w-3 h-3 ${passwordStrength.hasUpper && passwordStrength.hasLower ? 'text-emerald-600 font-bold' : 'text-slate-300'}`} />
                      Upper & Lowercase
                    </span>
                    <span className={`flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <Check className={`w-3 h-3 ${passwordStrength.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-300'}`} />
                      Number (0-9)
                    </span>
                    <span className={`flex items-center gap-1 ${passwordStrength.hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      <Check className={`w-3 h-3 ${passwordStrength.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-300'}`} />
                      Special Char (!@#$)
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ============================================================= */}
            {/* 5. DYNAMIC ADDRESS & RESIDENTIAL / HOSTEL ACCOMMODATION      */}
            {/* ============================================================= */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5 transition-all">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>
                    {activeAddressType === 'HOSTEL'
                      ? 'Hostel & Campus Accommodation Address'
                      : activeAddressType === 'FACULTY_QUARTERS'
                      ? 'University Campus Faculty Quarters Address'
                      : activeAddressType === 'INTERNATIONAL'
                      ? 'International Student Campus & Permanent Address'
                      : 'Residential & Postal Address'}{' '}
                    <span className="text-slate-400 font-medium text-[11px]">(Optional)</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Optional
                  </span>
                  {activeAddressType !== 'UNSELECTED' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {activeAddressType === 'HOSTEL'
                        ? '🏢 Campus Hostel'
                        : activeAddressType === 'FACULTY_QUARTERS'
                        ? '🏛️ Faculty Quarters'
                        : activeAddressType === 'INTERNATIONAL'
                        ? '🌍 International'
                        : '🏡 Residential'}
                    </span>
                  )}
                </div>
              </div>

              {/* A. When status is unselected for Student or Faculty */}
              {activeAddressType === 'UNSELECTED' ? (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-center space-y-1 animate-fadeIn">
                  <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    Please select your {selectedRole === 'STUDENT' ? 'Student Status' : 'Faculty Status'} above
                  </p>
                  <p className="text-[11px] text-amber-700">
                    The address section will automatically adapt to show relevant{' '}
                    <strong>Hostel/Campus Accommodation</strong> or <strong>Residential Address</strong> fields.
                  </p>
                </div>
              ) : activeAddressType === 'HOSTEL' ? (
                /* B. HOSTEL / CAMPUS ACCOMMODATION FIELDS (OPTIONAL) */
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Hostel Name */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Hostel / Hall of Residence</label>
                      <select
                        value={formData.hostelName}
                        onChange={(e) => {
                          setFormData({ ...formData, hostelName: e.target.value });
                          if (fieldErrors.hostelName) setFieldErrors({ ...fieldErrors, hostelName: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.hostelName
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="">Select Hostel / Hall of Residence</option>
                        {UNIVERSITY_HOSTEL_NAMES.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.hostelName && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.hostelName}</p>
                      )}
                    </div>

                    {/* Hostel Block / Wing */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Block / Wing</label>
                      <select
                        value={formData.hostelBlock}
                        onChange={(e) => setFormData({ ...formData, hostelBlock: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-[11px]"
                      >
                        <option value="">Select Block / Wing</option>
                        {HOSTEL_BLOCKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Room / Bed Number */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Room / Bed No.</label>
                      <input
                        type="text"
                        value={formData.hostelRoomNo}
                        onChange={(e) => {
                          setFormData({ ...formData, hostelRoomNo: e.target.value });
                          if (fieldErrors.hostelRoomNo) setFieldErrors({ ...fieldErrors, hostelRoomNo: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.hostelRoomNo
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      {fieldErrors.hostelRoomNo && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.hostelRoomNo}</p>
                      )}
                    </div>

                    {/* Floor */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Floor / Level</label>
                      <select
                        value={formData.hostelFloor}
                        onChange={(e) => setFormData({ ...formData, hostelFloor: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-[11px]"
                      >
                        <option value="">Select Floor</option>
                        {HOSTEL_FLOORS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              ) : activeAddressType === 'FACULTY_QUARTERS' ? (
                /* C. FACULTY CAMPUS QUARTERS FIELDS (OPTIONAL) */
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Faculty Quarters Type */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Campus Quarters / Enclave</label>
                      <select
                        value={formData.facultyQuartersType}
                        onChange={(e) => {
                          setFormData({ ...formData, facultyQuartersType: e.target.value });
                          if (fieldErrors.facultyQuartersType) setFieldErrors({ ...fieldErrors, facultyQuartersType: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.facultyQuartersType
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="">Select Quarters / Enclave Type</option>
                        {FACULTY_QUARTERS_TYPES.map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.facultyQuartersType && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyQuartersType}</p>
                      )}
                    </div>

                    {/* Quarter / Flat Number */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Quarter / Flat / House No.</label>
                      <input
                        type="text"
                        value={formData.facultyQuarterNo}
                        onChange={(e) => {
                          setFormData({ ...formData, facultyQuarterNo: e.target.value });
                          if (fieldErrors.facultyQuarterNo) setFieldErrors({ ...fieldErrors, facultyQuarterNo: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.facultyQuarterNo
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      {fieldErrors.facultyQuarterNo && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.facultyQuarterNo}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Block / Lane */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Block / Lane / Sector</label>
                      <input
                        type="text"
                        value={formData.facultyQuarterBlock}
                        onChange={(e) => setFormData({ ...formData, facultyQuarterBlock: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              ) : activeAddressType === 'INTERNATIONAL' ? (
                /* D. INTERNATIONAL STUDENT ACCOMMODATION FIELDS */
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Campus Accommodation / Room */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Campus Hostel / Guest House & Room</label>
                      <input
                        type="text"
                        value={formData.intlCampusRoom}
                        onChange={(e) => {
                          setFormData({ ...formData, intlCampusRoom: e.target.value });
                          if (fieldErrors.intlCampusRoom) setFieldErrors({ ...fieldErrors, intlCampusRoom: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.intlCampusRoom
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      {fieldErrors.intlCampusRoom && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.intlCampusRoom}</p>
                      )}
                    </div>

                    {/* Home Country */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Home Country</label>
                      <input
                        type="text"
                        value={formData.intlCountry}
                        onChange={(e) => {
                          setFormData({ ...formData, intlCountry: e.target.value });
                          if (fieldErrors.intlCountry) setFieldErrors({ ...fieldErrors, intlCountry: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.intlCountry
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      {fieldErrors.intlCountry && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.intlCountry}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Permanent Overseas Address */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Permanent Home Country Address</label>
                      <input
                        type="text"
                        value={formData.intlPermanentAddress}
                        onChange={(e) => setFormData({ ...formData, intlPermanentAddress: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">Emergency / Local Guardian Phone</label>
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* E. RESIDENTIAL / COMMUTER ADDRESS FIELDS (OPTIONAL) */
                <div className="space-y-3 animate-fadeIn">
                  {/* Street / House Address */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">House / Flat No., Building & Street Address</label>
                    <input
                      type="text"
                      value={formData.resHouseStreet}
                      onChange={(e) => {
                        setFormData({ ...formData, resHouseStreet: e.target.value });
                        if (fieldErrors.resHouseStreet) setFieldErrors({ ...fieldErrors, resHouseStreet: '' });
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.resHouseStreet
                          ? 'border-rose-300 ring-1 ring-rose-300'
                          : 'border-slate-200 focus:ring-blue-500/20'
                      }`}
                    />
                    {fieldErrors.resHouseStreet && (
                      <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.resHouseStreet}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* PIN Code */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-700 font-bold">PIN / Postal Code</label>
                        {isPincodeLoading && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Fetching...
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={formData.resPincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white font-mono focus:outline-none focus:ring-2 ${
                            fieldErrors.resPincode
                              ? 'border-rose-300 ring-1 ring-rose-300'
                              : 'border-slate-200 focus:ring-blue-500/20'
                          }`}
                        />
                        {isPincodeLoading && (
                          <div className="absolute right-3 top-3 pointer-events-none">
                            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      {fieldErrors.resPincode && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.resPincode}</p>
                      )}
                    </div>

                    {/* City / Town */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">City / Town</label>
                      <input
                        type="text"
                        value={formData.resCity}
                        onChange={(e) => {
                          setFormData({ ...formData, resCity: e.target.value });
                          if (fieldErrors.resCity) setFieldErrors({ ...fieldErrors, resCity: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.resCity
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      />
                      {fieldErrors.resCity && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.resCity}</p>
                      )}
                    </div>

                    {/* State / Province */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 font-bold">State / Province</label>
                      <select
                        value={formData.resState}
                        onChange={(e) => {
                          setFormData({ ...formData, resState: e.target.value });
                          if (fieldErrors.resState) setFieldErrors({ ...fieldErrors, resState: '' });
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 font-semibold focus:outline-none focus:ring-2 bg-white text-[11px] ${
                          fieldErrors.resState
                            ? 'border-rose-300 ring-1 ring-rose-300'
                            : 'border-slate-200 focus:ring-blue-500/20'
                        }`}
                      >
                        <option value="">Select State / UT</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.resState && (
                        <p className="text-[10.5px] text-rose-600 font-semibold">{fieldErrors.resState}</p>
                      )}
                    </div>
                  </div>

                  {pincodeSuccessMsg && (
                    <p className="text-[10.5px] text-emerald-600 font-medium flex items-center gap-1 animate-fadeIn">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      {pincodeSuccessMsg} (Editable if needed)
                    </p>
                  )}

                  {/* Emergency Contact */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Emergency Contact Phone</label>
                    <div className="relative">
                      <PhoneCall className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* 6. APPROVAL REQUIREMENT NOTICE CALLOUT                        */}
            {/* ============================================================= */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Admin approval required before account activation.</span>
            </div>

            {/* ============================================================= */}
            {/* 7. ACTION BUTTONS                                             */}
            {/* ============================================================= */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Submit for Admin Approval</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
