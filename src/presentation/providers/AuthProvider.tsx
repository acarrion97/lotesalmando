import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { clearOfflinePersistence } from "@/infrastructure/offline/persistQueryClient";

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

/**
 * Vencio la contraseña temporal (la que otorga el panel al crear la
 * cuenta: usuario del correo + "*", ver passwordDeEmail)? La fecha vive
 * en usuario.password_temporal_hasta (migración 022) y se compara contra
 * el reloj del dispositivo. NULL = el usuario ya definió la suya.
 */
function passwordExpirada(hasta: string | null | undefined): boolean {
  if (!hasta) return false;
  const limite = new Date(hasta).getTime();
  return Number.isFinite(limite) && Date.now() > limite;
}

/**
 * Mensajes amigables para los errores de signUp() de Supabase Auth.
 * `email_address_invalid`: desde 2025 Auth valida que el dominio del
 * correo exista (DNS) y rechaza dominios inventados como `@epruebas.com`
 * aunque el formato sea correcto (ver supabase/auth#2252).
 */
function mensajeErrorSignUp(error: { message: string; code?: string }): string {
  if (error.code === "email_address_invalid" || error.message.includes("is invalid")) {
    return "El correo electronico no es valido porque el dominio no existe. Usa un correo con dominio real (por ejemplo, tu@gmail.com).";
  }
  if (error.code === "email_rate_limit_exceeded" || error.message.toLowerCase().includes("rate limit")) {
    return "El servicio de correo de Supabase esta limitado (2 correos por hora). Desactiva 'Confirm email' en Authentication > Providers > Email o configura un SMTP propio en el panel de Supabase, y vuelve a intentar.";
  }
  if (error.message === "User already registered") {
    return "Este correo electronico ya esta registrado";
  }
  return error.message;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    nombres: string,
  ) => Promise<{ success: boolean; error?: string }>;
  registerNuevaEmpresa: (
    email: string,
    password: string,
    nombres: string,
    razonSocial: string,
  ) => Promise<{ success: boolean; error?: string }>;
  cambiarPassword: (
    nuevaPassword: string,
  ) => Promise<{ success: boolean; error?: string; aviso?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario, id_empresa, nombres, password_temporal_hasta")
          .eq("email", session.user.email)
          .single();

        // Contraseña temporal vencida: no se puede seguir con la sesión
        // aunque el token de GoTrue siga siendo válido.
        if (passwordExpirada(usuario?.password_temporal_hasta)) {
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          id: session.user.id,
          email: session.user.email || "",
          nombres:
            usuario?.nombres || session.user.user_metadata?.nombres || session.user.email || "",
          id_usuario: usuario?.id_usuario,
          id_empresa: usuario?.id_empresa,
        });
      }
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario, id_empresa, nombres, password_temporal_hasta")
          .eq("email", session.user.email)
          .single();

        // Mismo vencimiento que en initAuth, aplicado a sesiones que ya
        // estaban abiertas (por ejemplo, la pestaña quedó de ayer).
        if (passwordExpirada(usuario?.password_temporal_hasta)) {
          await supabase.auth.signOut();
          setUser(null);
          return;
        }

        setUser({
          id: session.user.id,
          email: session.user.email || "",
          nombres:
            usuario?.nombres || session.user.user_metadata?.nombres || session.user.email || "",
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
      return {
        success: false,
        error:
          error.message === "Invalid login credentials"
            ? "Correo electronico o contrasena incorrectos"
            : error.message,
      };
    }

    if (data.user) {
      const { data: usuario } = await supabase
        .from("usuario")
        .select("id_usuario, id_empresa, nombres, password_temporal_hasta")
        .eq("email", data.user.email)
        .single();

      // GoTrue aceptó la contraseña temporal, pero si ya venció (24h) la
      // app no deja pasar: se cierra la sesión recién abierta y se pide
      // restablecer la contraseña.
      if (passwordExpirada(usuario?.password_temporal_hasta)) {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            "Tu contraseña temporal venció (24 horas). Restablecela desde 'Olvidé mi contraseña' para volver a entrar.",
        };
      }

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
    const { data: invitado, error: invitadoError } = await supabase
      .rpc("usuario_invitado", { p_email: email })
      .maybeSingle<UsuarioInvitado>();

    if (invitadoError) {
      return {
        success: false,
        error: "No se pudo verificar tu invitacion. Intenta de nuevo en un momento.",
      };
    }

    if (!invitado) {
      return {
        success: false,
        error:
          "Tu empresa todavia no te invito. Si queres crear tu propia empresa, usa la opcion 'Crea tu empresa'.",
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
      return {
        success: false,
        error: mensajeErrorSignUp(error),
      };
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
      const { data: existente, error: existenteError } = await supabase
        .rpc("usuario_invitado", { p_email: email })
        .maybeSingle<UsuarioInvitado>();

      if (existenteError) {
        return {
          success: false,
          error: "No se pudo verificar el correo. Intenta de nuevo en un momento.",
        };
      }

      if (existente) {
        return {
          success: false,
          error:
            "Ya existe una cuenta con este correo. Si tu empresa ya te invito, inicia sesion o registrate normalmente.",
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
        return {
          success: false,
          error: mensajeErrorSignUp(error),
        };
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
          error:
            "Tu cuenta necesita confirmacion por correo antes de crear la empresa. Confirma tu correo y pedile a un administrador que te cree la empresa manualmente, o desactiva 'Confirm email' en Supabase para usar este flujo de punta a punta.",
        };
      }

      // supabase-js puede tardar un instante en propagar la sesion nueva de
      // signUp() a las siguientes peticiones .from(...). Forzarla con
      // setSession() antes de insertar evita que el insert de abajo corra
      // como anon y lo rechace RLS.
      const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (setSessionError) {
        return {
          success: false,
          error: `No se pudo establecer la sesion: ${setSessionError.message}`,
        };
      }

      // Diagnostico: confirma que el cliente realmente tiene la sesion
      // activa justo antes del insert, para no seguir adivinando si el
      // problema es de RLS o de propagacion de sesion.
      const { data: sessionCheck } = await supabase.auth.getSession();
      const diag = `sesion=${sessionCheck.session ? "si" : "no"} setSessionUser=${setSessionData.user?.id ?? "null"} getSessionUser=${sessionCheck.session?.user?.id ?? "null"}`;

      const { data: empresa, error: empresaError } = await supabase
        .from("empresa")
        .insert({ razon_social: razonSocial, estado: "activo" })
        .select("id_empresa")
        .single();

      if (empresaError || !empresa) {
        return {
          success: false,
          error: `No se pudo crear la empresa: ${empresaError?.message ?? "error desconocido"} [${diag}]`,
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
    [],
  );

  /**
   * El usuario define su propia contraseña: se guarda en Supabase Auth y
   * se borra el sello de vencimiento (RPC password_definitiva) para que
   * deje de correr el reloj de 24h.
   */
  const cambiarPassword = useCallback(async (nuevaPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
    if (error) {
      return { success: false, error: error.message };
    }

    // Si el sello no se puede borrar no se corta el flujo: la contraseña
    // ya quedó guardada en Supabase Auth. Se avisa igual, porque sin ese
    // aviso el reloj de 24h seguiría corriendo y el usuario se encontraría
    // con el vencimiento más adelante.
    const { error: selloError } = await supabase.rpc("password_definitiva");
    if (selloError) {
      return {
        success: true,
        aviso: `La contraseña se guardó, pero no se pudo quitar el vencimiento de 24 h (${selloError.message}). Si se te vence, repetí el proceso desde "Olvidé mi contraseña".`,
      };
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    // offline/tenant-isolation: nothing this device cached offline should
    // survive past the session it belonged to.
    await clearOfflinePersistence(queryClient);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        registerNuevaEmpresa,
        cambiarPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
