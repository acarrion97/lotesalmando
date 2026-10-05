import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";
import { useEmpresas } from "@/presentation/hooks/useEmpresas";
import { clearOfflinePersistence } from "@/infrastructure/offline/persistQueryClient";

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
  const queryClient = useQueryClient();

  // Cada usuario solo ve la empresa a la que pertenece. Un usuario sin empresa
  // asignada no ve ninguna, en lugar de ver las de otros.
  const empresas = useMemo(
    () =>
      isAuthenticated
        ? (empresasData ?? []).filter((e) => e.id_empresa === user?.id_empresa)
        : [],
    [isAuthenticated, empresasData, user?.id_empresa]
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
    const isSwitchingToAnotherEmpresa =
      empresaActual !== null && empresa !== null && empresa.id_empresa !== empresaActual.id_empresa;

    if (isSwitchingToAnotherEmpresa) {
      // offline/tenant-isolation: purge before the new empresa's queries
      // start populating the cache, so nothing from the previous tenant
      // lingers alongside it.
      void clearOfflinePersistence(queryClient);
    }

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
  }, [empresaActual, queryClient]);

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
