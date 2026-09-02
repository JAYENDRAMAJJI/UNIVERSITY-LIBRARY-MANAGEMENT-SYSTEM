# 📚 University Library Management System (Enterprise Portal)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

An enterprise-grade, responsive **University Library Management System & Digital Learning Microsite** built with React 19, TypeScript, Vite, and Tailwind CSS. Designed for higher education institutions to digitize cataloging, circulation, digital asset repositories, institutional clearance certifications (NDC), fine accounting, member management, and official university document downloads.

---

## 🌟 Quick Demo Credentials

Try out the application with built-in test accounts across different user roles:

| Role | Email | Password | Access Level & Capabilities |
| :--- | :--- | :--- | :--- |
| 👨‍💼 **Head Admin / Librarian** | `admin@university.edu` | `admin123` | Full Circulation, Inventory, No Due Clearance Desk, Official Forms Admin, Digital Hub, Calendar Management |
| 🧑‍🏫 **Faculty Member** | `faculty@university.edu` | `faculty123` | High Loan Quota (10 Books / 30 Days), Online Time Extensions & Renewals, Digital Library, No Due Desk |
| 🎓 **Student** | `student@university.edu` | `student123` | Catalog Search, Book Reservations, Time Extensions, Borrow History, No Due Clearance Application, Downloads |

---

## 🔥 Key Features & Capabilities

### 🔐 1. Role-Based Access Control (RBAC) & Authentication
- Protected routes and customized dashboards for **Admin**, **Faculty**, and **Student** roles.
- Interactive Account Registration and Login with role selector.
- Member RFID Smart Card generation and digital barcode IDs with instant profile management.

### 📚 2. Book Search & Catalog Management
- **Multi-criteria Filtering**: Search by Title, Author, ISBN, Category, Department, Availability, and physical Rack/Shelf location.
- **Barcode & QR Code Scanner Integration**: Scan physical barcodes/QR codes using the device camera or interactive barcode scanner modal.
- **Book Badges**: Highlight *Featured Books*, *New Arrivals*, and *Book of the Month*.

### 🔄 3. Circulation Management Engine
- **Book Issue Desk**: Issue books by Accession Number / Barcode to verified students or faculty with automated eligibility verification.
- **Book Return Desk**: Process book returns with real-time overdue fine calculation, damage/loss flags, and automated copy status updates (`AVAILABLE`, `ISSUED`, `RESERVED`, `LOST`).
- **Book Time Extensions Desk**: Self-service student/faculty time extension applications with academic reasons. Librarians review, approve, or un-approve/revoke extensions.
- **Return Protection Safeguard**: Blocks premature book return if a member has a pending time extension request awaiting librarian review.
- **Reservation Queue**: Priority-based booking list for high-demand titles.
- **Unified Borrowing History Desk**: Search instantly by borrower name, library card ID, book title, accession number, barcode, or librarian with CSV/Excel export.

### 🎖️ 4. Official Authorized Circulation Seals
- **Vector Security Seal Engine**: Circular rubber-stamp style security seals with concentric rings, circular curvature typography (`CENTRAL UNIVERSITY LIBRARY • AUTHORIZED CIRCULATION DESK`), verification badges, dynamic dates, and authentication codes.
- **Embedded Across All Circulation Slips**:
  - *Printable Book Loan Circulation Slips*
  - *Official Fine Payment & Assessment Receipts*
  - *Book Return & Overdue Slips*
  - *Official A4 Institutional No-Due Clearance Certificates*

### 📜 5. Institutional No Due Clearance Desk (NDC)
- **Student Clearance Workflow**: Students and faculty can apply online for their official University No Due Certificate.
- **Strict Compliance Verification**: System validates **0 active book loans** and **₹0.00 outstanding fines** before permitting application submission or certificate issuance.
- **Admin Clearance Desk (`/admin/no-due`)**: Chief Librarian verifies returns, clears fine liabilities, and approves clearance applications.
- **Official Signed Certificate Generator**: Generates and prints authorized institutional No Due Certificates with university seals, verification QR codes, and registrar signatures.

### 📅 6. University Academic & Operating Hours Calendar
- **Interactive University Calendar**: Real-time monthly calendar with gazetted national holidays, examination sessions, declared working days, and special library reading hours.
- **Telemetry Metric Cards**: Clean telemetry overview showing total academic events, upcoming gazetted holidays, declared working days, and special research schedules.
- **Direct Month/Year Navigation**: Jump directly to any month and year with standalone Today reset.

### 📥 7. Official Forms & University Downloads Center
- **Librarian Management Portal (`/admin/downloads`)**: Upload, edit, categorize, and archive official university library forms, policies, and academic schedules.
- **Real-Time Dynamic Synchronization**: Public Download Center (`/downloads`) dynamically displays all active forms managed by the librarian.
- **Authentic Multi-Page PDF Engine**: Standardized official university document generation:
  - *Library Membership Registration Form*
  - *Book Procurement Suggestion Form*
  - *No Dues Clearance Certificate Form*
  - *University Library Rules & Regulations*
  - *Digital Lab & Workstation Code of Conduct*
  - *Overdue Fine & Penalty Guidelines*
  - *University Academic Calendar 2026-2027*
  - *End Semester Exam Timetable & Guidelines*
  - *Library Catalog & Circulation User Manual*

### 💻 8. Digital Resource Hub & Learning Repositories
- Access 20+ digital resource categories: IEEE Xplore, ACM, SpringerLink, ScienceDirect, NPTEL, SWAYAM, NDLI, daily e-newspapers, question banks, and faculty research thesis.
- **Custom File Storage**: IndexedDB + synchronous memory cache store for heavy PDF documents and files.
- **Daily Newspaper Feeds**: Automatic live synchronization of daily e-paper editions with semester targeting.
- **Interactive PDF Viewer**: Embedded viewer with high-definition rendering and cross-browser download support.

### 💰 9. Standardized Fine & Fee Accounting
- **Standard Overdue Rate**: Automated calculation at **₹5.00 / day** per volume past the official due date across all accounts and transactions.
- **Unified Terminology**: Standardized as **`Overdue Fine (Late Return)`**, **`Book Damage Penalty`**, and **`Book Replacement Cost`**.
- **Fine Ledger & Settlement**: Settle dues via UPI QR Scanner or Cash, generate printable signed receipts (`receipt_no`), or record waiver justifications with admin authorization.

### 🕒 10. Attendance & Visitor Traffic Tracker
- Real-time digital check-in / check-out tracker for library visitors, study rooms, and digital multimedia labs.
- Live stay duration tracking and auto-checkout timers aligned with institutional operating hours.

---

## 🛠️ Tech Stack & Architecture

### **Frontend Stack**
- **Core Library**: [React 19](https://react.dev/) with Functional Components & Hooks
- **Language**: [TypeScript 5.8](https://www.typescriptlang.org/) for strict type safety
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS Design Tokens
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Storage**: IndexedDB API + LocalStorage with automated payload sanitization and migration hooks

### **Backend Architecture & Database Schema (MySQL Specs)**
The repository includes backend specifications in [`src/docs/database-and-backend-architecture.md`](src/docs/database-and-backend-architecture.md):
- **14 Relational Tables**: `users`, `members`, `categories`, `authors`, `publishers`, `books`, `book_copies`, `issue_transactions`, `reservations`, `fine_records`, `digital_resources`, `official_documents`, `no_due_applications`, `audit_logs`.
- **Spring Boot REST Specification**: Prepared endpoints for production integration (`/api/v1/circulation/issue`, `/api/v1/circulation/return`, `/api/v1/no-due/apply`, etc.).

---

## 📂 Project Directory Structure

```
library-microsite/
├── .env.example                # Sample environment variables
├── .gitignore                  # Git ignore rules
├── index.html                  # HTML entry point
├── metadata.json               # Application metadata
├── package.json                # Project dependencies and scripts
├── README.md                   # Project documentation
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
└── src/
    ├── App.tsx                 # Main application routes & setup
    ├── main.tsx                # React root renderer
    ├── index.css               # Global styles & design system
    ├── components/             # Reusable UI Components
    │   ├── admin/              # Admin modals, tables & Calendar section
    │   ├── common/             # Barcode Scanner, No Due Modal, Circulation Seal
    │   ├── guards/             # ProtectedRoute & RoleRoute guards
    │   └── layout/             # Navbar, Footer, Sidebar, Breadcrumbs
    ├── context/                # AuthContext (State Management)
    ├── docs/                   # DB Architecture & Admin Feature Docs
    ├── pages/                  # Public & Member Pages
    │   ├── admin/              # Admin Desks (Books, Issue, Return, Renew, Fines, No Due, Downloads)
    │   ├── auth/               # Login & Access Denied Pages
    │   └── dashboards/         # Admin, Faculty, and Student Dashboards
    ├── services/               # libraryStore (Observable State & Storage Engine)
    ├── types/                  # TypeScript Data Models & Interfaces
    └── utils/                  # Barcode/QR, PDF Generators, Digital Storage, Excel Exports
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js installed on your machine:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 2. Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JAYENDRAMAJJI/UNIVERSITY-LIBRARY-MANAGEMENT-SYSTEM.git
   cd UNIVERSITY-LIBRARY-MANAGEMENT-SYSTEM
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to: `http://127.0.0.1:5173`

4. **Build for production deployment:**
   ```bash
   npm run build
   ```
   The production-optimized static bundle will be generated in the `dist/` directory.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

---

Developed for **University Library Management System**.
