import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { useEmpresas } from "@/presentation/hooks/useEmpresas";

interface Empresa {
  id_empresa: number;
  razon_social: string;
  ruc: string;
  estado: string;
}

interface EmpresaContextValue {
  empresaActual: Empresa | null;
  setEmpresaActual: (empresa: Empresa | null) => void;
  empresas: Empresa[];
  setEmpresas: (empresas: Empresa[]) => void;
}

const EmpresaContext = createContext<EmpresaContextValue | undefined>(undefined);

interface EmpresaProviderProps {
  children: ReactNode;
}

function getStoredEmpresaId(): number | null {
  try {
    const stored = localStorage.getItem("lotesalmando-empresa-id");
    return stored ? Number(stored) : null;
  } catch {
    return null;
  }
}

export function EmpresaProvider({ children }: EmpresaProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { data: empresasData } = useEmpresas({ enabled: isAuthenticated });
  const [manualEmpresaId, setManualEmpresaId] = useState<number | null>(null);

  const empresas = useMemo(
    () => (isAuthenticated ? (empresasData ?? []) : []),
    [isAuthenticated, empresasData]
  );

  const empresaActual = useMemo(() => {
    if (empresas.length === 0) return null;

    const manual = manualEmpresaId ? empresas.find((e) => e.id_empresa === manualEmpresaId) : undefined;
    if (manual) return manual;

    const storedId = getStoredEmpresaId();
    const fromStorage = storedId ? empresas.find((e) => e.id_empresa === storedId) : undefined;
    const fromUser = user?.id_empresa
      ? empresas.find((e) => e.id_empresa === user.id_empresa)
      : undefined;
    const fallback = empresas.length === 1 ? empresas[0] : undefined;

    return fromStorage ?? fromUser ?? fallback ?? null;
  }, [empresas, manualEmpresaId, user]);

  const setEmpresaActual = useCallback((empresa: Empresa | null) => {
    setManualEmpresaId(empresa ? empresa.id_empresa : null);
    try {
      if (empresa) {
        localStorage.setItem("lotesalmando-empresa-id", String(empresa.id_empresa));
      } else {
        localStorage.removeItem("lotesalmando-empresa-id");
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setEmpresas = useCallback((_empresas: Empresa[]) => {
    // no-op: the empresas list is derived from useEmpresas(); kept for interface compatibility
  }, []);

  const value = useMemo(
    () => ({
      empresaActual,
      setEmpresaActual,
      empresas,
      setEmpresas,
    }),
    [empresaActual, setEmpresaActual, empresas, setEmpresas]
  );

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa(): EmpresaContextValue {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error("useEmpresa must be used within an EmpresaProvider");
  }
  return context;
}
