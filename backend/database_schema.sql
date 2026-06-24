-- =====================================================
-- SmartReports - MySQL Database Schema for phpMyAdmin
-- =====================================================
-- Run this script in phpMyAdmin SQL tab after creating
-- a database named: SmartReports
-- =====================================================

CREATE DATABASE IF NOT EXISTS SmartReports CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE SmartReports;

-- =====================================================
-- Table: Departments
-- =====================================================
CREATE TABLE IF NOT EXISTS Departments (
  Id        CHAR(36)     NOT NULL DEFAULT (UUID()),
  Name      VARCHAR(150) NOT NULL,
  CreatedAt DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: UsersProfile
-- =====================================================
CREATE TABLE IF NOT EXISTS UsersProfile (
  UserId                CHAR(36)     NOT NULL DEFAULT (UUID()),
  FullName              VARCHAR(200) NOT NULL,
  Phone                 VARCHAR(50)  NOT NULL DEFAULT '',
  Role                  VARCHAR(20)  NOT NULL DEFAULT 'user',
  -- Role values: 'admin', 'manager', 'employee', 'user'
  DepartmentId          CHAR(36)     NULL,
  IsActive              TINYINT(1)   NOT NULL DEFAULT 1,
  CreatedAt             DATETIME     NOT NULL DEFAULT NOW(),
  Email                 VARCHAR(150) NOT NULL,
  NationalId            VARCHAR(50)  NULL,
  PasswordHash          VARCHAR(255) NOT NULL DEFAULT '',
  NotificationsEnabled  TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (UserId),
  UNIQUE KEY uq_email (Email),
  CONSTRAINT fk_user_dept FOREIGN KEY (DepartmentId) REFERENCES Departments(Id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: Reports
-- =====================================================
CREATE TABLE IF NOT EXISTS Reports (
  Id            CHAR(36)      NOT NULL DEFAULT (UUID()),
  UserId        CHAR(36)      NOT NULL,
  DepartmentId  CHAR(36)      NOT NULL,
  Description   TEXT          NOT NULL,
  LocationLat   DOUBLE        NULL,
  LocationLng   DOUBLE        NULL,
  Status        VARCHAR(20)   NOT NULL DEFAULT 'new',
  -- Status values: 'new', 'in_progress', 'accepted', 'rejected'
  CreatedAt     DATETIME      NOT NULL DEFAULT NOW(),
  UpdatedAt     DATETIME      NULL,
  UpdatedBy     CHAR(36)      NULL,
  PRIMARY KEY (Id),
  KEY idx_reports_dept (DepartmentId),
  KEY idx_reports_user (UserId),
  CONSTRAINT fk_report_user  FOREIGN KEY (UserId)       REFERENCES UsersProfile(UserId) ON DELETE CASCADE,
  CONSTRAINT fk_report_dept  FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: Media
-- =====================================================
CREATE TABLE IF NOT EXISTS Media (
  Id        CHAR(36)    NOT NULL DEFAULT (UUID()),
  ReportId  CHAR(36)    NOT NULL,
  Type      VARCHAR(20) NOT NULL,
  -- Type values: 'image', 'video'
  FileUrl   TEXT        NOT NULL,
  CreatedAt DATETIME    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (Id),
  CONSTRAINT fk_media_report FOREIGN KEY (ReportId) REFERENCES Reports(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: ReportStatusHistory
-- =====================================================
CREATE TABLE IF NOT EXISTS ReportStatusHistory (
  Id          CHAR(36)    NOT NULL DEFAULT (UUID()),
  ReportId    CHAR(36)    NOT NULL,
  ChangedBy   CHAR(36)    NULL,
  FromStatus  VARCHAR(20) NOT NULL DEFAULT '',
  ToStatus    VARCHAR(20) NOT NULL DEFAULT '',
  Note        TEXT        NULL,
  ChangedAt   DATETIME    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (Id),
  KEY idx_history_report (ReportId),
  CONSTRAINT fk_history_report    FOREIGN KEY (ReportId)  REFERENCES Reports(Id)      ON DELETE CASCADE,
  CONSTRAINT fk_history_changedby FOREIGN KEY (ChangedBy) REFERENCES UsersProfile(UserId) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: Notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS Notifications (
  Id        CHAR(36)     NOT NULL DEFAULT (UUID()),
  UserId    CHAR(36)     NOT NULL,
  ReportId  CHAR(36)     NULL,
  Type      VARCHAR(30)  NOT NULL DEFAULT 'info',
  Title     VARCHAR(150) NOT NULL DEFAULT '',
  Message   TEXT         NOT NULL,
  IsRead    TINYINT(1)   NOT NULL DEFAULT 0,
  CreatedAt DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (Id),
  KEY idx_notif_user (UserId),
  CONSTRAINT fk_notif_user   FOREIGN KEY (UserId)   REFERENCES UsersProfile(UserId) ON DELETE CASCADE,
  CONSTRAINT fk_notif_report FOREIGN KEY (ReportId) REFERENCES Reports(Id)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: PasswordResetTokens
-- =====================================================
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  Id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  UserId     CHAR(36)     NOT NULL,
  TokenHash  VARCHAR(255) NOT NULL,
  ExpiresAt  DATETIME     NOT NULL,
  CreatedAt  DATETIME     NOT NULL DEFAULT NOW(),
  UsedAt     DATETIME     NULL,
  PRIMARY KEY (Id),
  KEY idx_reset_user (UserId),
  CONSTRAINT fk_reset_user FOREIGN KEY (UserId) REFERENCES UsersProfile(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Sample: Insert admin account
-- Password = "admin123" (bcrypt hash below)
-- Change the password after first login!
-- =====================================================
INSERT IGNORE INTO UsersProfile
  (UserId, FullName, Phone, Role, DepartmentId, IsActive, CreatedAt, Email, NationalId, PasswordHash, NotificationsEnabled)
VALUES
  (UUID(), 'Admin', '0500000000', 'admin', NULL, 1, NOW(), 'admin@smartreports.com', NULL,
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVs83aXgFa', 1);
-- Above hash = "admin123" (bcrypt rounds=10)
