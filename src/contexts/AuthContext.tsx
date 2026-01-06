import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types/project';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: User[] = [
  // Vendedores
  { id: '1', email: 'vendedor@empresa.com', nome: 'João Vendedor', role: 'vendedor' },
  { id: '5', email: 'victor.soares@emive.com.br', nome: 'Victor Soares', role: 'vendedor' },
  { id: '6', email: 'rayane.moura@emive.com.br', nome: 'Rayane Moura', role: 'vendedor' },
  { id: '7', email: 'gleyton.gurgel@emive.com.br', nome: 'Gleyton Gurgel', role: 'vendedor' },
  { id: '8', email: 'wilson.simao@emive.com.br', nome: 'Wilson Simão', role: 'vendedor' },
  // Projetistas
  { id: '2', email: 'projetos@empresa.com', nome: 'Maria Projetos', role: 'projetos' },
  { id: '4', email: 'henrique.macedo@emive.com.br', nome: 'Henrique Macedo', role: 'projetos' },
  { id: '9', email: 'stenio.santos@emive.com.br', nome: 'Stenio Santos', role: 'projetos' },
  // Admins
  { id: '3', email: 'admin@empresa.com', nome: 'Admin Sistema', role: 'admin' },
  { id: '10', email: 'hugo.santos@emive.com.br', nome: 'Hugo Santos', role: 'admin' },
  { id: '11', email: 'gustavo.morais@emive.com.br', nome: 'Gustavo Morais', role: 'admin' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('portaria_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Mock authentication - in production, this would call an API
    const foundUser = MOCK_USERS.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('portaria_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('portaria_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
