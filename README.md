# 📚 University Library Management System (Microsite)

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

An enterprise-grade, responsive **University Library Management System & Microsite** built with React 19, TypeScript, Vite, and Tailwind CSS. Designed for higher education institutions to digitize cataloging, circulation, digital asset delivery, fine accounting, member management, and administrative reporting.

---

## 🌟 Quick Demo Credentials

Try out the application with built-in test accounts across different user roles:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| 👨‍💼 **Head Admin / Librarian** | `admin@university.edu` | `admin123` | Full Administrative & System Control |
| 🧑‍🏫 **Faculty Member** | `faculty@university.edu` | `faculty123` | High Loan Limit, Extended Due Days, Digital Resources |
| 🎓 **Student** | `student@university.edu` | `student123` | Catalog Search, Book Reservations, Profile & Borrow History |

---

## 🔥 Key Features & Capabilities

### 🔐 1. Role-Based Access Control (RBAC) & Authentication
- Protected routes and dynamic dashboards for **Admin**, **Faculty**, and **Student** roles.
- Interactive Account Registration and Login with role selector.
- Member ID and digital Library Card generation.

### 📚 2. Book Search & Catalog Management
- **Multi-criteria Filtering**: Search by Title, Author, ISBN, Category, Department, Availability, and Rack/Shelf physical location.
- **Barcode & QR Code Scanner Integration**: Scan physical barcodes/QR codes using device camera or barcode reader modal.
- **Book Badges**: Highlight *Featured Books*, *New Arrivals*, and *Book of the Month*.

### 🔄 3. Circulation Management Engine
- **Book Issue Desk**: Issue books by Accession Number / Barcode to verified students or faculty. Automatic eligibility check for active fines or max book limits.
- **Book Return Desk**: Process book returns with real-time overdue fine calculation, damage/loss flags, and automated copy status update (`AVAILABLE`, `ISSUED`, `RESERVED`, `LOST`).
- **Book Renewals**: Extend due dates easily unless reserved by another member.
- **Reservation Queue**: Priority-based booking list for high-demand titles.

### 💰 4. Fine & Fee Accounting
- Automatic overdue fine calculation based on university policies (e.g., ₹5/day after due date).
- **Fine Ledger**: Collect payments, issue printable receipts (`receipt_no`), or record waiver reasons with librarian approval.
- Detailed fine transaction history for each member.

### 💻 5. Digital Library & Open Access Hub
- Access e-books, research journals, previous year question papers, syllabus copies, and lecture notes.
- Direct PDF downloads with download tracking and category filtering.

### 📊 6. Admin Analytics & Reporting Dashboard
- Interactive statistical widgets: Total Books, Available vs. Issued Copies, Overdue Count, Fine Collection, Daily Visitors.
- Tabular reports with filtering and export capabilities (CSV/PDF output ready).
- Member Management: Activate, suspend, or update student and faculty profiles.
- Book Master Data: Categorization, Authors, Publishers, and Physical Rack/Shelf allocations.

### 🕒 7. Attendance & Traffic Tracker
- Real-time digital check-in / check-out tracker for library visitors and study room users.

---

## 🛠️ Tech Stack & Architecture

### **Frontend Stack**
- **Core Library**: [React 19](https://react.dev/) with Functional Components & Hooks
- **Language**: [TypeScript 5.8](https://www.typescriptlang.org/) for strict type safety
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS Design Tokens
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router v7 / v8](https://reactrouter.com/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)

### **Backend Architecture & Database Schema (MySQL Specs)**
The repository includes complete backend specifications in [`src/docs/database-and-backend-architecture.md`](src/docs/database-and-backend-architecture.md):
- **12 Relational Tables**: `users`, `members`, `categories`, `authors`, `publishers`, `books`, `book_copies`, `issue_transactions`, `reservations`, `fine_records`, `digital_resources`, `audit_logs`.
- **Spring Boot REST Specification**: Prepared endpoints for production integration (`/api/v1/circulation/issue`, `/api/v1/circulation/return`, etc.).

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
    │   ├── admin/              # Admin-specific modals & tables
    │   ├── common/             # Barcode Scanner, Register Modal
    │   ├── guards/             # ProtectedRoute & RoleRoute guards
    │   └── layout/             # Navbar, Footer, Sidebar, Breadcrumbs
    ├── context/                # AuthContext (State Management)
    ├── docs/                   # DB Architecture & Admin Feature Docs
    ├── pages/                  # Public & Member Pages
    │   ├── admin/              # Admin Operation Pages (Books, Issue, Return, Fines, Users)
    │   ├── auth/               # Login & Access Denied Pages
    │   └── dashboards/         # Admin, Faculty, and Student Dashboards
    ├── services/               # Data Store & Mock API Services
    ├── types/                  # TypeScript Data Models & Interfaces
    └── utils/                  # Barcode & QR Code Generators
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
