import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

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

export function EmpresaProvider({ children }: EmpresaProviderProps) {
  const [empresaActual, setEmpresaActualState] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const setEmpresaActual = useCallback((empresa: Empresa | null) => {
    setEmpresaActualState(empresa);
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
