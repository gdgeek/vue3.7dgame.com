# Requirements Document

## Introduction

This specification addresses the migration of API endpoint paths to include the `/v1` version prefix. The system previously included `/v1` in the base API URL environment variable (e.g., `https://api.voxel.cn/v1`), but this has been changed to remove the version suffix from the base URL (now `https://api.voxel.cn`). To maintain API versioning, the `/v1` prefix must now be added to each individual API endpoint path.

## Glossary

- **API_Endpoint**: An individual API request URL path defined in the TypeScript API service files
- **Base_URL**: The root API server URL configured in environment variables (VITE_APP_API_URL)
- **Version_Prefix**: The `/v1` string that must be prepended to all API endpoint paths
- **API_Service_File**: TypeScript files in the `src/api/v1/` directory that define API request functions
- **Environment_Config**: Configuration files (`.env.staging`, `.env.development`, `.env.production`) that define environment variables

## Requirements

### Requirement 1: Environment Configuration Update

**User Story:** As a developer, I want the staging environment to have the correct API URL configuration, so that the application can connect to the API server properly.

#### Acceptance Criteria

1. WHEN the `.env.staging` file is read, THE System SHALL include a `VITE_APP_API_URL` variable
2. THE `VITE_APP_API_URL` variable in `.env.staging` SHALL be set to `{scheme}//api.{domain}` (without `/v1` suffix)
3. THE `.env.staging` file SHALL maintain all existing environment variables unchanged

### Requirement 2: API Endpoint Path Migration

**User Story:** As a developer, I want all API endpoint paths to include the `/v1` version prefix, so that API requests are routed to the correct versioned endpoints.

#### Acceptance Criteria

1. WHEN an API request is made from any API_Service_File, THE System SHALL prepend `/v1` to the endpoint path
2. FOR ALL API_Service_Files in `src/api/v1/` directory, THE System SHALL update url paths to include `/v1` prefix
3. WHEN an endpoint path is `/auth/login`, THE System SHALL transform it to `/v1/auth/login`
4. WHEN an endpoint path is `/user/info`, THE System SHALL transform it to `/v1/user/info`
5. WHEN an endpoint path is `/email/send-verification`, THE System SHALL transform it to `/v1/email/send-verification`
6. FOR ALL endpoint paths that already start with `/`, THE System SHALL insert `v1` after the leading slash
7. THE System SHALL preserve all other aspects of the API request configuration (method, data, headers, etc.)

### Requirement 3: Comprehensive File Coverage

**User Story:** As a developer, I want all API service files to be updated consistently, so that no API requests fail due to missing version prefixes.

#### Acceptance Criteria

1. THE System SHALL update all TypeScript files in `src/api/v1/` directory
2. THE System SHALL update all TypeScript files in `src/api/v1/resources/` subdirectory
3. THE System SHALL update all TypeScript files in `src/api/v1/types/` subdirectory
4. WHEN a file contains multiple API endpoint definitions, THE System SHALL update all endpoints in that file
5. THE System SHALL maintain the original file structure and formatting

### Requirement 4: Path Transformation Consistency

**User Story:** As a developer, I want the path transformation to be applied consistently, so that all API requests follow the same URL pattern.

#### Acceptance Criteria

1. WHEN an endpoint path starts with `/`, THE System SHALL produce a path starting with `/v1/`
2. THE System SHALL NOT create double slashes (e.g., `/v1//auth/login`)
3. THE System SHALL NOT modify paths that already contain `/v1/` prefix
4. THE System SHALL preserve query string parameters and path variables unchanged
5. THE System SHALL preserve template literals and dynamic path segments unchanged

### Requirement 5: Code Quality Preservation

**User Story:** As a developer, I want the migration to preserve code quality, so that the codebase remains maintainable and error-free.

#### Acceptance Criteria

1. WHEN files are updated, THE System SHALL preserve TypeScript type annotations
2. WHEN files are updated, THE System SHALL preserve import statements
3. WHEN files are updated, THE System SHALL preserve code comments
4. WHEN files are updated, THE System SHALL preserve function signatures and export statements
5. THE System SHALL NOT introduce TypeScript compilation errors
