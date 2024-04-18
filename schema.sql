SELECT 'CREATE DATABASE auth_database' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_database')\gexec

\c auth_database

CREATE TABLE IF NOT EXISTS Users (
  ID BIGSERIAL PRIMARY KEY, -- Refer to this as User ID (UID)
  Username TEXT UNIQUE,
  Email TEXT,
  Password TEXT,
  SuperAdmin BOOLEAN, -- Super admins should generally get all priviledges on connected projects,
  Token TEXT -- Password without being a password.
);

CREATE TABLE IF NOT EXISTS Projects (
  ID BIGSERIAL PRIMARY KEY, -- Refer to this as Project ID (PID)
  Name TEXT UNIQUE,
  Open BOOLEAN,   -- Whether or not anyone can just add themselves to this, or if
                 -- 'advanced' registration is required.
  Public BOOLEAN, -- Whether or not everybody can see the project.
  URL TEXT,
  Description TEXT
);

-- This only works if SkyAuth is the only login method for
-- projects. If the project supports other authentication
-- then this is useless for that project.
CREATE TABLE IF NOT EXISTS Authorizations (
  UserID BIGINT NOT NULL, -- UID
  ProjectID BIGINT NOT NULL, -- PID
  Allowed INT NOT NULL DEFAULT 0, -- This will be an enum.
              -- 0: Undecided/Default
              -- 1: Approved
              -- 2: Awaiting Approval (Treat as denied!)
              -- 3: Denied
  PRIMARY KEY (UserID, ProjectID)
);

-- Allow other projects to get details about a key with a generic endpoint taking a key.
CREATE TABLE IF NOT EXISTS APIKeys (
  UserID BIGINT NOT NULL, -- UID
  ProjectID BIGINT NOT NULL, -- PID,
  KeyName TEXT,
  KeyID TEXT PRIMARY KEY, -- This is the funny 128 character random string.
  Data BYTEA -- Encoded data to go with the string. Encoded/decoded as necessary in API endpoints.
);