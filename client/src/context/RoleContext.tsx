import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppRole = 'admin' | 'manager' | 'employee';

interface RoleContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
  mockUserId: string;
  setMockUserId: (id: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  // Read from localStorage or default
  const initialRole = (localStorage.getItem('mockRole') as AppRole) || 'admin';
  const initialUserId = localStorage.getItem('mockUserId') || 'emp-1';

  const [role, setRoleState] = useState<AppRole>(initialRole);
  const [mockUserId, setMockUserIdState] = useState<string>(initialUserId);

  const setRole = (newRole: AppRole) => {
    setRoleState(newRole);
    localStorage.setItem('mockRole', newRole);
  };

  const setMockUserId = (id: string) => {
    setMockUserIdState(id);
    localStorage.setItem('mockUserId', id);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, mockUserId, setMockUserId }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
