import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types/project';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; mustChangePassword?: boolean }>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  updateProfile: (data: { telefone?: string; filial?: string; foto?: string }) => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get users from localStorage or use defaults
const getStoredUsers = (): User[] => {
  const stored = localStorage.getItem('portaria_users');
  if (stored) {
    return JSON.parse(stored);
  }
  // Default users with initial password
  const defaultUsers: User[] = [
    // Vendedores
    { id: '1', email: 'vendedor@empresa.com', nome: 'João Vendedor', role: 'vendedor', password: '123456', mustChangePassword: true },
    { id: '5', email: 'victor.soares@emive.com.br', nome: 'Victor Soares', role: 'vendedor', password: '123456', mustChangePassword: true },
    { id: '6', email: 'rayane.moura@emive.com.br', nome: 'Rayane Moura', role: 'vendedor', password: '123456', mustChangePassword: true },
    { id: '7', email: 'gleyton.gurgel@emive.com.br', nome: 'Gleyton Gurgel', role: 'vendedor', password: '123456', mustChangePassword: true },
    { id: '8', email: 'wilson.simao@emive.com.br', nome: 'Wilson Simão', role: 'vendedor', password: '123456', mustChangePassword: true },
    // Projetistas
    { id: '2', email: 'projetos@empresa.com', nome: 'Maria Projetos', role: 'projetos', password: '123456', mustChangePassword: true },
    { id: '4', email: 'henrique.macedo@emive.com.br', nome: 'Henrique Macedo', role: 'projetos', password: '123456', mustChangePassword: true },
    { id: '9', email: 'stenio.santos@emive.com.br', nome: 'Stenio Santos', role: 'projetos', password: '123456', mustChangePassword: true },
    // Admins
    { id: '3', email: 'admin@empresa.com', nome: 'Admin Sistema', role: 'admin', password: '123456', mustChangePassword: true },
    { id: '10', email: 'hugo.santos@emive.com.br', nome: 'Hugo Santos', role: 'admin', password: '123456', mustChangePassword: true },
    { id: '11', email: 'gustavo.morais@emive.com.br', nome: 'Gustavo Morais', role: 'admin', password: '123456', mustChangePassword: true },
  ];
  localStorage.setItem('portaria_users', JSON.stringify(defaultUsers));
  return defaultUsers;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(getStoredUsers);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('portaria_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, password: string): Promise<{ success: boolean; mustChangePassword?: boolean }> => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      if (foundUser.password !== password) {
        return { success: false };
      }
      setUser(foundUser);
      localStorage.setItem('portaria_user', JSON.stringify(foundUser));
      return { success: true, mustChangePassword: foundUser.mustChangePassword };
    }
    return { success: false };
  };

  const changePassword = async (newPassword: string): Promise<boolean> => {
    if (!user) return false;
    
    const updatedUsers = users.map(u => 
      u.id === user.id 
        ? { ...u, password: newPassword, mustChangePassword: false }
        : u
    );
    
    const updatedUser = { ...user, password: newPassword, mustChangePassword: false };
    
    setUsers(updatedUsers);
    setUser(updatedUser);
    localStorage.setItem('portaria_users', JSON.stringify(updatedUsers));
    localStorage.setItem('portaria_user', JSON.stringify(updatedUser));
    
    return true;
  };

  const updateProfile = async (data: { telefone?: string; filial?: string; foto?: string }): Promise<boolean> => {
    if (!user) return false;
    
    const updatedUser = { ...user, ...data };
    const updatedUsers = users.map(u => 
      u.id === user.id ? updatedUser : u
    );
    
    setUsers(updatedUsers);
    setUser(updatedUser);
    localStorage.setItem('portaria_users', JSON.stringify(updatedUsers));
    localStorage.setItem('portaria_user', JSON.stringify(updatedUser));
    
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('portaria_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
