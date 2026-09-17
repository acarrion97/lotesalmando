import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/infrastructure/supabase/client";

interface AuthUser {
  id: string;
  email: string;
  nombres: string;
  id_usuario?: number;
  id_empresa?: number;
}

interface UsuarioInvitado {
  nombres: string;
  id_usuario: number;
  id_empresa: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nombres: string) => Promise<{ success: boolean; error?: string }>;
  registerNuevaEmpresa: (
    email: string,
    password: string,
    nombres: string,
    razonSocial: string
  ) => Promise<{ success: boolean; error?: string }>;
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
    // El registro abierto requiere invitacion previa: un admin da de alta
    // la fila `usuario` desde UsuariosPage antes de que la persona se
    // registre. Se chequea ANTES de crear la cuenta de Supabase Auth para
    // no dejar cuentas huerfanas sin empresa si no estaba invitada. Usa
    // el RPC `usuario_invitado` (no una consulta directa a `usuario`)
    // porque en este punto todavia no hay sesion (rol anon) y las
    // politicas RLS de `usuario` solo permiten lectura a `authenticated`.
    const { data: invitado, error: invitadoError } = await supabase.rpc("usuario_invitado", { p_email: email }).maybeSingle<UsuarioInvitado>();

    if (invitadoError) {
      return { success: false, error: "No se pudo verificar tu invitacion. Intenta de nuevo en un momento." };
    }

    if (!invitado) {
      return {
        success: false,
        error: "Tu empresa todavia no te invito. Si queres crear tu propia empresa, usa la opcion 'Crea tu empresa'.",
      };
    }

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

    // Supabase no rechaza signUp() con un email ya registrado (para evitar
    // que se pueda "probar" si un email existe): devuelve un `user` sin
    // `identities` y sin sesion real. Sin este chequeo, cualquiera podria
    // "loguearse" visualmente como el dueno de un email ya invitado sin
    // conocer su contrasena real.
    if (!data.user || (data.user.identities?.length ?? 1) === 0) {
      return { success: false, error: "Este correo electronico ya esta registrado" };
    }

    // Si el proyecto tiene "Confirm email" activado, signUp() no devuelve
    // sesion hasta que la persona confirme por correo. Sin este chequeo se
    // mostraria como logueado sin serlo de verdad (mismo tipo de bug que el
    // caso de arriba).
    if (!data.session) {
      return {
        success: false,
        error: "Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesion.",
      };
    }

    setUser({
      id: data.user.id,
      email: data.user.email || "",
      nombres: invitado.nombres || nombres,
      id_usuario: invitado.id_usuario,
      id_empresa: invitado.id_empresa,
    });

    return { success: true };
  }, []);

  const registerNuevaEmpresa = useCallback(
    async (email: string, password: string, nombres: string, razonSocial: string) => {
      const { data: existente, error: existenteError } = await supabase.rpc("usuario_invitado", { p_email: email }).maybeSingle<UsuarioInvitado>();

      if (existenteError) {
        return { success: false, error: "No se pudo verificar el correo. Intenta de nuevo en un momento." };
      }

      if (existente) {
        return {
          success: false,
          error: "Ya existe una cuenta con este correo. Si tu empresa ya te invito, inicia sesion o registrate normalmente.",
        };
      }

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

      // Mismo caso que en register(): un email ya registrado no siempre
      // produce un `error` en signUp() - a veces devuelve un `user` sin
      // `identities` y sin sesion real. Sin este chequeo se crearia una
      // empresa nueva huerfana para un email que en realidad ya tiene cuenta.
      if (!data.user || (data.user.identities?.length ?? 1) === 0) {
        return { success: false, error: "Este correo electronico ya esta registrado" };
      }

      // Si "Confirm email" esta activo en el proyecto, todavia no hay sesion
      // real aca - las politicas RLS de `empresa`/`usuario` (006) exigen rol
      // `authenticated`, asi que crear la empresa ahora fallaria igual. Se
      // corta antes de intentarlo con un mensaje claro.
      if (!data.session) {
        return {
          success: false,
          error: "Tu cuenta necesita confirmacion por correo antes de crear la empresa. Confirma tu correo y pedile a un administrador que te cree la empresa manualmente, o desactiva 'Confirm email' en Supabase para usar este flujo de punta a punta.",
        };
      }

      // supabase-js puede tardar un instante en propagar la sesion nueva de
      // signUp() a las siguientes peticiones .from(...). Forzarla con
      // setSession() antes de insertar evita que el insert de abajo corra
      // como anon y lo rechace RLS.
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      const { data: empresa, error: empresaError } = await supabase
        .from("empresa")
        .insert({ razon_social: razonSocial, estado: "activo" })
        .select("id_empresa")
        .single();

      if (empresaError || !empresa) {
        return {
          success: false,
          error: `No se pudo crear la empresa: ${empresaError?.message ?? "error desconocido"}`,
        };
      }

      const { data: nuevoUsuario, error: usuarioError } = await supabase
        .from("usuario")
        .insert({ id_empresa: empresa.id_empresa, nombres, email, estado: "activo" })
        .select("id_usuario, id_empresa")
        .single();

      if (usuarioError || !nuevoUsuario) {
        return {
          success: false,
          error: `La empresa se creo pero no se pudo vincular tu usuario: ${usuarioError?.message ?? "error desconocido"}`,
        };
      }

      setUser({
        id: data.user.id,
        email: data.user.email || "",
        nombres,
        id_usuario: nuevoUsuario.id_usuario,
        id_empresa: nuevoUsuario.id_empresa,
      });

      return { success: true };
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, registerNuevaEmpresa, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
