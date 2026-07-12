# Workforce Intelligence Platform

## Role-Based Access Control (RBAC)

The platform supports a 3-tier Role-Based Access Control system for the ideation phase, utilizing a mocked authentication flow via the `x-mock-role` HTTP header.

### Roles and Permissions

1. **Admin (`admin`)**
   - **Access**: Full system access.
   - **Capabilities**: Can view and manage all employees across the organization, access all projects, run global analytics, manage the recruitment pipeline, and reset the database. They have visibility into all Single Points of Failure (SPOF) and organizational flight risks.

2. **Manager (`manager`)**
   - **Access**: Team/Department scoped access.
   - **Capabilities**: Can view employees within their own department (or direct reports). They have access to the Project Staffing Engine to assemble teams, view promotion readiness for their reports, and view project health reports. Cannot access global analytics or reset the database.

3. **Employee (`employee`)**
   - **Access**: Personal scoped access.
   - **Capabilities**: Can only access their own profile. They can view their personal AI-generated Learning Roadmaps and their own Promotion Readiness Index. They do not have access to the staffing engine, recruitment dashboard, or other employees' data.

### Ideation Mock Setup

To test the roles, a dropdown selector is available in the bottom-left profile section of the sidebar. Changing the role dynamically updates the available navigation items (frontend protection) and updates the custom `x-mock-role` header sent to all `/api/*` endpoints (backend protection).
