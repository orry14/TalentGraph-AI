import React from 'react';
import { AppRole, useRole } from '../context/RoleContext';

interface RequireRoleProps {
  roles: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children, fallback = null }) => {
  const { role } = useRole();

  if (!roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
