import { useContext } from 'react';
import { AuthContext } from '../contexts/authTypes';
import type { AuthContextType } from '../contexts/authTypes';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
