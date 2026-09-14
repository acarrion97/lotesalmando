import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/infrastructure/supabase/client";

interface AuthUser {
  id: string;
  email: string;
  nombres: string;
  id_usuario?: number;
  id_empresa?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nombres: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario, id_empresa, nombres")
          .eq("email", session.user.email)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email || "",
          nombres: usuario?.nombres || session.user.user_metadata?.nombres || session.user.email || "",
          id_usuario: usuario?.id_usuario,
          id_empresa: usuario?.id_empresa,
        });
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario, id_empresa, nombres")
          .eq("email", session.user.email)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email || "",
          nombres: usuario?.nombres || session.user.user_metadata?.nombres || session.user.email || "",
          id_usuario: usuario?.id_usuario,
          id_empresa: usuario?.id_empresa,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message === "Invalid login credentials" ? "Correo electronico o contrasena incorrectos" : error.message };
    }

    if (data.user) {
      const { data: usuario } = await supabase
        .from("usuario")
        .select("id_usuario, id_empresa, nombres")
        .eq("email", data.user.email)
        .single();

      setUser({
        id: data.user.id,
        email: data.user.email || "",
        nombres: usuario?.nombres || data.user.user_metadata?.nombres || data.user.email || "",
        id_usuario: usuario?.id_usuario,
        id_empresa: usuario?.id_empresa,
      });
    }

    return { success: true };
  }, []);

  const register = useCallback(async (email: string, password: string, nombres: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombres },
      },
    });

    if (error) {
      return { success: false, error: error.message === "User already registered" ? "Este correo electronico ya esta registrado" : error.message };
    }

    if (data.user) {
      // Esperar un momento para que el trigger cree el registro en usuario
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verificar si el usuario ya fue creado por el trigger
      const { data: existingUser } = await supabase
        .from("usuario")
        .select("id_usuario, id_empresa")
        .eq("email", data.user.email)
        .single();

      if (!existingUser) {
        // Si no existe, crearlo manualmente (empresa por defecto: 1)
        const { data: newUser } = await supabase
          .from("usuario")
          .insert({
            id_empresa: 1,
            nombres,
            email: data.user.email || "",
            estado: "activo",
          })
          .select("id_usuario, id_empresa")
          .single();

        setUser({
          id: data.user.id,
          email: data.user.email || "",
          nombres,
          id_usuario: newUser?.id_usuario,
          id_empresa: newUser?.id_empresa,
        });
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          nombres,
          id_usuario: existingUser.id_usuario,
          id_empresa: existingUser.id_empresa,
        });
      }
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
