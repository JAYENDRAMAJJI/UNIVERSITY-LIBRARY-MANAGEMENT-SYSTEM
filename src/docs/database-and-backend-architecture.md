# Enterprise College Library Management System - Database & Spring Boot Backend Architecture

This document specifies the relational database schema (MySQL) and Spring Boot 3 / JPA backend specification for the Enterprise College Library Management System.

---

## 1. Database Relational ER Diagram & Tables (MySQL DDL)

```sql
-- Disable foreign key checks for table creation
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'STAFF', 'FACULTY', 'STUDENT') NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'INACTIVE') DEFAULT 'ACTIVE',
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Library Members Profile
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    member_card_no VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(50),
    max_allowed_books INT DEFAULT 5,
    max_loan_days INT DEFAULT 14,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_member_card (member_card_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Categories Master Data
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Authors Master Data
CREATE TABLE IF NOT EXISTS authors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    biography TEXT,
    email VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Publishers Master Data
CREATE TABLE IF NOT EXISTS publishers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    contact_person VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Books Master Catalog
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    publisher_id VARCHAR(36) NOT NULL,
    edition VARCHAR(50),
    publishing_year INT,
    language VARCHAR(50) DEFAULT 'English',
    price DECIMAL(10,2),
    description TEXT,
    cover_url VARCHAR(500),
    total_copies INT DEFAULT 0,
    available_copies INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_book_of_month BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (author_id) REFERENCES authors(id),
    FOREIGN KEY (publisher_id) REFERENCES publishers(id),
    INDEX idx_book_isbn (isbn),
    INDEX idx_book_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Physical Book Copies & Rack Location
CREATE TABLE IF NOT EXISTS book_copies (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    accession_no VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    rack_number VARCHAR(20) NOT NULL,
    shelf_number VARCHAR(20) NOT NULL,
    status ENUM('AVAILABLE', 'ISSUED', 'RESERVED', 'MAINTENANCE', 'LOST', 'DISPOSED') DEFAULT 'AVAILABLE',
    `condition` ENUM('NEW', 'GOOD', 'DAMAGED', 'LOST') DEFAULT 'GOOD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_copy_accession (accession_no),
    INDEX idx_copy_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Circulation Transactions (Issue / Return / Renewal)
CREATE TABLE IF NOT EXISTS issue_transactions (
    id VARCHAR(36) PRIMARY KEY,
    book_copy_id VARCHAR(36) NOT NULL,
    member_id VARCHAR(36) NOT NULL,
    issued_by_user_id VARCHAR(36) NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NULL,
    renewal_count INT DEFAULT 0,
    max_renewals INT DEFAULT 2,
    status ENUM('ISSUED', 'RETURNED', 'OVERDUE', 'LOST', 'RENEWED') DEFAULT 'ISSUED',
    notes TEXT,
    FOREIGN KEY (book_copy_id) REFERENCES book_copies(id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (issued_by_user_id) REFERENCES users(id),
    INDEX idx_tx_status (status),
    INDEX idx_tx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Reservations Queue
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(36) PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL,
    member_id VARCHAR(36) NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP NULL,
    queue_position INT DEFAULT 1,
    status ENUM('PENDING', 'APPROVED', 'FULFILLED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING',
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    INDEX idx_res_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Fine Ledger & Receipts
CREATE TABLE IF NOT EXISTS fine_records (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    member_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    reason ENUM('OVERDUE', 'DAMAGED', 'LOST') NOT NULL,
    status ENUM('UNPAID', 'PAID', 'WAIVED') DEFAULT 'UNPAID',
    receipt_no VARCHAR(50) UNIQUE,
    paid_date TIMESTAMP NULL,
    waived_by_user_id VARCHAR(36),
    waive_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES issue_transactions(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Digital Resources Library
CREATE TABLE IF NOT EXISTS digital_resources (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    resource_type ENUM('EBOOK', 'JOURNAL', 'RESEARCH_PAPER', 'QUESTION_PAPER', 'SYLLABUS') NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    author_name VARCHAR(150),
    file_url VARCHAR(500) NOT NULL,
    file_size_mb DECIMAL(5,2),
    download_count INT DEFAULT 0,
    uploaded_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Audit Trail & Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

---

## 2. Spring Boot REST Controllers Specification

- `POST /api/v1/auth/login`: Authenticate and issue JWT token.
- `GET /api/v1/books`: Search and paginated list of catalog books.
- `POST /api/v1/books`: Create new book with copy accessions.
- `POST /api/v1/circulation/issue`: Issue book copy to member. Validates active fine and loan limits.
- `POST /api/v1/circulation/return`: Process book copy return. Calculates overdue fines automatically.
- `POST /api/v1/circulation/renew`: Renew issued book. Checks max renewals and reservation hold.
- `POST /api/v1/fines/{id}/pay`: Collect fine and generate printable receipt.
- `POST /api/v1/fines/{id}/waive`: Waive fine with librarian approval note.
- `GET /api/v1/reports/summary`: Analytics dashboard metrics and borrowing statistics.
