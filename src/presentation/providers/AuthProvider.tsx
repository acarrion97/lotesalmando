import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { clearOfflinePersistence } from "@/infrastructure/offline/persistQueryClient";
import {
  guardarContextoAutenticacionOffline,
  leerContextoAutenticacionOffline,
} from "@/infrastructure/offline/offlineAuthContext";
import { getContainer } from "@/infrastructure/container";

interface AuthUser {
  id: string;
  email: string;
  nombres: string;
  id_usuario?: number;
  id_empresa?: number;
  /** estado_pago de la empresa ('pendiente' | 'pagado' | 'cancelado'). */
  estadoPago?: string | null;
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
 * ¿Tiene el usuario al menos un rol asignado (usuario_rol)? Se consulta
 * apenas se obtienen los datos de la sesión: sin roles la cuenta todavia
 * no puede operar y hay que llevarla a /registro/planes.
 * Devuelve null cuando no se pudo consultar (no hay id_usuario o fallo
 * transitorio) para no bloquear el acceso por un error de red.
 */
async function usuarioTieneRoles(idUsuario: number | undefined): Promise<boolean | null> {
  if (!idUsuario) return null;
  try {
    const roles = await getContainer().getRolesByUsuario.execute(idUsuario);
    return roles.length > 0;
  } catch {
    return null;
  }
}

/**
 * estado_pago de la empresa del usuario ('pendiente' | 'pagado' |
 * 'cancelado'). Mientras siga 'pendiente' (el webhook de Hotmart aun no
 * confirmo) la cuenta no entra a la app: va a /registro/planes.
 * Devuelve null si no hay empresa o fallo la consulta (no se bloquea).
 */
async function estadoPagoDeEmpresa(idEmpresa: number | undefined): Promise<string | null> {
  if (!idEmpresa) return null;
  try {
    const { data } = await supabase
      .from("empresa")
      .select("estado_pago")
      .eq("id_empresa", idEmpresa)
      .single();
    return data?.estado_pago ?? null;
  } catch {
    return null;
  }
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
  /** false = el usuario no tiene roles asignados; null = todavia no se verifico. */
  tieneRoles: boolean | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; tieneRoles?: boolean; estadoPago?: string | null }>;
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
    /** Codigo de partnership (vendedor de la plataforma), opcional. */
    codigoPartner?: string,
  ) => Promise<{ success: boolean; error?: string; idEmpresa?: number }>;
  cambiarPassword: (
    nuevaPassword: string,
  ) => Promise<{ success: boolean; error?: string; aviso?: string }>;
  /**
   * Reconsulta el estado_pago de la empresa (el webhook de Hotmart lo
   * cambia a 'pagado' por fuera de la app). Devuelve el estado nuevo y lo
   * guarda en la sesion, para que la pagina de planes se entere sin tener
   * que recargar.
   */
  refrescarEstadoPago: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tieneRoles, setTieneRoles] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const restaurarContextoOffline = async (authUserId: string): Promise<boolean> => {
      let contexto;
      try {
        contexto = await leerContextoAutenticacionOffline(authUserId);
      } catch (error) {
        console.error("No se pudo restaurar el contexto offline de autenticación.", error);
        return false;
      }
      if (!contexto) return false;

      setUser({
        id: contexto.userId,
        email: contexto.email,
        nombres: contexto.nombres,
        id_usuario: contexto.idUsuario,
        id_empresa: contexto.idEmpresa,
        estadoPago: contexto.estadoPago,
      });
      setTieneRoles(contexto.tieneRoles);
      return true;
    };

    const guardarContextoOffline = async (
      authUserId: string,
      email: string,
      nombres: string,
      idUsuario: number | undefined,
      idEmpresa: number | undefined,
      estadoPago: string | null,
      rolesOk: boolean | null,
    ) => {
      if (!idUsuario || !idEmpresa || estadoPago === null || rolesOk === null) return;

      try {
        await guardarContextoAutenticacionOffline({
          userId: authUserId,
          email,
          nombres,
          idUsuario,
          idEmpresa,
          estadoPago,
          tieneRoles: rolesOk,
          savedAt: Date.now(),
        });
      } catch (error) {
        console.error("No se pudo guardar el contexto offline de autenticación.", error);
      }
    };

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        if (!navigator.onLine && (await restaurarContextoOffline(session.user.id))) {
          setLoading(false);
          return;
        }

        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario, id_empresa, nombres, password_temporal_hasta")
          .eq("email", session.user.email)
          .single();

        if (!usuario && (await restaurarContextoOffline(session.user.id))) {
          setLoading(false);
          return;
        }

        // Contraseña temporal vencida: no se puede seguir con la sesión
        // aunque el token de GoTrue siga siendo válido.
        if (passwordExpirada(usuario?.password_temporal_hasta)) {
          await supabase.auth.signOut();
          setUser(null);
          setTieneRoles(null);
          setLoading(false);
          return;
        }

        // Restauracion de sesion (recargar la pagina, pestaña abierta de
        // ayer): se re-verifican roles y estado de pago, no solo al loguear.
        const [rolesOk, pago] = await Promise.all([
          usuarioTieneRoles(usuario?.id_usuario),
          estadoPagoDeEmpresa(usuario?.id_empresa),
        ]);
        setTieneRoles(rolesOk);

        const usuarioAutenticado: AuthUser = {
          id: session.user.id,
          email: session.user.email || "",
          nombres:
            usuario?.nombres || session.user.user_metadata?.nombres || session.user.email || "",
          id_usuario: usuario?.id_usuario,
          id_empresa: usuario?.id_empresa,
          estadoPago: pago,
        };
        setUser(usuarioAutenticado);
        await guardarContextoOffline(
          usuarioAutenticado.id,
          usuarioAutenticado.email,
          usuarioAutenticado.nombres,
          usuarioAutenticado.id_usuario,
          usuarioAutenticado.id_empresa,
          pago,
          rolesOk,
        );
      }
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (!navigator.onLine && (await restaurarContextoOffline(session.user.id))) return;

        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario, id_empresa, nombres, password_temporal_hasta")
          .eq("email", session.user.email)
          .single();

        if (!usuario && (await restaurarContextoOffline(session.user.id))) return;

        // Mismo vencimiento que en initAuth, aplicado a sesiones que ya
        // estaban abiertas (por ejemplo, la pestaña quedó de ayer).
        if (passwordExpirada(usuario?.password_temporal_hasta)) {
          await supabase.auth.signOut();
          setUser(null);
          setTieneRoles(null);
          return;
        }

        const [rolesOk, pago] = await Promise.all([
          usuarioTieneRoles(usuario?.id_usuario),
          estadoPagoDeEmpresa(usuario?.id_empresa),
        ]);
        setTieneRoles(rolesOk);

        const usuarioAutenticado: AuthUser = {
          id: session.user.id,
          email: session.user.email || "",
          nombres:
            usuario?.nombres || session.user.user_metadata?.nombres || session.user.email || "",
          id_usuario: usuario?.id_usuario,
          id_empresa: usuario?.id_empresa,
          estadoPago: pago,
        };
        setUser(usuarioAutenticado);
        await guardarContextoOffline(
          usuarioAutenticado.id,
          usuarioAutenticado.email,
          usuarioAutenticado.nombres,
          usuarioAutenticado.id_usuario,
          usuarioAutenticado.id_empresa,
          pago,
          rolesOk,
        );
      } else {
        setUser(null);
        setTieneRoles(null);
        if (event === "SIGNED_OUT") {
          void clearOfflinePersistence(queryClient).catch((error: unknown) => {
            console.error("No se pudo limpiar la caché offline al cerrar sesión.", error);
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

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

      let tieneRoles = false;
      if (usuario?.id_usuario) {
        try {
          const roles = await getContainer().getRolesByUsuario.execute(usuario.id_usuario);
          tieneRoles = roles.length > 0;
        } catch (error) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: `No se pudieron verificar los roles de tu cuenta. Intenta iniciar sesion de nuevo. ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      }

      const estadoPago = await estadoPagoDeEmpresa(usuario?.id_empresa);
      setTieneRoles(tieneRoles);

      setUser({
        id: data.user.id,
        email: data.user.email || "",
        nombres: usuario?.nombres || data.user.user_metadata?.nombres || data.user.email || "",
        id_usuario: usuario?.id_usuario,
        id_empresa: usuario?.id_empresa,
        estadoPago,
      });

      return { success: true, tieneRoles, estadoPago };
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

    const [rolesOk, estadoPago] = await Promise.all([
      usuarioTieneRoles(invitado.id_usuario),
      estadoPagoDeEmpresa(invitado.id_empresa),
    ]);
    setTieneRoles(rolesOk);

    setUser({
      id: data.user.id,
      email: data.user.email || "",
      nombres: invitado.nombres || nombres,
      id_usuario: invitado.id_usuario,
      id_empresa: invitado.id_empresa,
      estadoPago,
    });

    return { success: true };
  }, []);

  const registerNuevaEmpresa = useCallback(
    async (email: string, password: string, nombres: string, razonSocial: string, codigoPartner?: string) => {
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

      // Opcional: codigo de partnership (vendedor de la plataforma) que el
      // usuario puede ingresar al registrarse. Se valida ANTES de crear la
      // cuenta para no dejar usuarios huerfanos por un codigo mal escrito.
      // (La RPC existe desde la migracion 029: si no se corrio, solo falla
      // cuando alguien escribe un codigo.)
      let idPartner: number | null = null;
      const codigo = (codigoPartner ?? "").trim();
      if (codigo) {
        const { data: partnerId, error: partnerError } = await supabase.rpc("validar_codigo_partner", {
          p_codigo: codigo,
        });

        if (partnerError) {
          return {
            success: false,
            error:
              "No se pudo verificar el codigo de partnership. Intenta de nuevo en un momento, o dejalo vacio para continuar.",
          };
        }

        if (!partnerId) {
          return {
            success: false,
            error: `El codigo de partnership "${codigo.toUpperCase()}" no es valido. Corrigelo o dejalo vacio para continuar sin partner.`,
          };
        }

        idPartner = Number(partnerId);
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

      // estado_pago: el alta arranca 'pendiente' y el webhook de Hotmart
      // (api/hotmart-webhook.ts) la pasa a 'pagado' cuando confirma el pago.
      const { data: empresa, error: empresaError } = await supabase
        .from("empresa")
        .insert({
          razon_social: razonSocial,
          estado: "activo",
          id_partner: idPartner,
          estado_pago: "pendiente",
        })
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

      // Empresa recien creada: arranca con pago pendiente y sin roles
      // asignados, asi que tras elegir plan el guard la deja entrar cuando
      // el webhook confirme el pago y un admin le asigne roles.
      setTieneRoles(false);

      setUser({
        id: data.user.id,
        email: data.user.email || "",
        nombres,
        id_usuario: nuevoUsuario.id_usuario,
        id_empresa: nuevoUsuario.id_empresa,
        estadoPago: "pendiente",
      });

      return { success: true, idEmpresa: Number(empresa.id_empresa) };
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

  /**
   * El pago se confirma por webhook de Hotmart, fuera de la app. Al volver
   * a /registro/planes hay que reconsultar estado_pago para que la pagina
   * se entere del pago sin tener que cerrar y abrir sesion.
   */
  const refrescarEstadoPago = useCallback(async () => {
    const pago = await estadoPagoDeEmpresa(user?.id_empresa);
    setUser((u) => (u ? { ...u, estadoPago: pago } : u));
    return pago;
  }, [user?.id_empresa]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setTieneRoles(null);
      // Offline data must not survive the session that it belonged to.
      await clearOfflinePersistence(queryClient);
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        tieneRoles,
        login,
        register,
        registerNuevaEmpresa,
        cambiarPassword,
        refrescarEstadoPago,
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
