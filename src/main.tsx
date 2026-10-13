import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/presentation/theme/theme-provider";
import { EmpresaProvider } from "@/presentation/providers/EmpresaProvider";
import { AuthProvider } from "@/presentation/providers/AuthProvider";
import { PermisoProvider } from "@/presentation/providers/PermisoProvider";
import { setupOfflinePersistence } from "@/infrastructure/offline/persistQueryClient";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

setupOfflinePersistence(queryClient);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <EmpresaProvider>
            <PermisoProvider>
              <App />
            </PermisoProvider>
          </EmpresaProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
