import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { usePermisosCatalogo, useRoles } from "@/presentation/hooks";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { usePuede } from "@/presentation/hooks";
import {
  ACCIONES,
  moduloParaRecurso,
  nombrePermisoPara,
  normalizarRecurso,
  type AccionPermiso,
} from "@/presentation/permisos/constructorPermisos";
import type { Permiso } from "@/domain/rol/entities";

const { Text, Paragraph } = Typography;

interface RolFila {
  id_rol: number;
  nombre_rol: string;
}

export function RolesPermisosPage() {
  const container = getContainer();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: roles, isLoading: cargandoRoles } = useRoles();
  const { data: permisos, isLoading: cargandoPermisos } = usePermisosCatalogo();

  // Permisos de gestión que esta página respeta (ya no entra quien no deba,
  // porque la ruta está tras ver_roles, pero los botones también se ocultan).
  const puedeCrearRoles = usePuede("crear_roles");
  const puedeEditarRoles = usePuede("editar_roles");
  const puedeEliminarRoles = usePuede("eliminar_roles");
  const puedeCrearPermisos = usePuede("crear_permisos");
  const puedeEliminarPermisos = usePuede("eliminar_permisos");
  const puedeAsignar = usePuede("asignar_permisos");

  // ---- Estado: constructor de permisos ----
  const [recurso, setRecurso] = useState("");
  const [accionesMarcadas, setAccionesMarcadas] = useState<AccionPermiso[]>(["acceder"]);

  // ---- Estado: modales de roles ----
  const [rolModal, setRolModal] = useState<{ tipo: "crear" | "editar" | "eliminar" | null; rol?: RolFila }>({ tipo: null });
  const [nombreRol, setNombreRol] = useState("");

  // ---- Estado: matriz de permisos por rol ----
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [permisosDelRol, setPermisosDelRol] = useState<number[]>([]);
  const [cargandoAsignacion, setCargandoAsignacion] = useState(false);

  const recursoNormalizado = useMemo(() => normalizarRecurso(recurso), [recurso]);

  const permisosExistentes = useMemo(
    () => new Set((permisos ?? []).map((p) => p.nombre_permiso)),
    [permisos],
  );

  // Nombre de permiso que produciría cada acción con la palabra actual, y si
  // ya existe en el catálogo (para no duplicar).
  const previsualizacion = useMemo(() => {
    if (!recursoNormalizado) return [];
    return ACCIONES.filter((a) => accionesMarcadas.includes(a.accion)).map((a) => {
      const nombre = nombrePermisoPara(a.accion, recursoNormalizado);
      return { ...a, nombre, existe: permisosExistentes.has(nombre) };
    });
  }, [recursoNormalizado, accionesMarcadas, permisosExistentes]);

  const permisosNuevos = previsualizacion.filter((p) => !p.existe);

  const refrescarTodo = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["roles"] }),
      queryClient.invalidateQueries({ queryKey: ["permisos"] }),
      queryClient.invalidateQueries({ queryKey: ["permisos", "catalogo"] }),
    ]);
  };

  // ---- Acciones del constructor ----
  const handleCrearPermisos = async () => {
    if (!recursoNormalizado) {
      messageApi.error("Escribí la palabra del recurso (ej: proveedores).");
      return;
    }
    if (permisosNuevos.length === 0) {
      messageApi.info("No hay permisos nuevos: los seleccionados ya existen.");
      return;
    }
    try {
      const modulo = moduloParaRecurso(recursoNormalizado);
      for (const p of permisosNuevos) {
        await container.createPermiso.execute(p.nombre, modulo);
      }
      await refrescarTodo();
      messageApi.success(
        `${permisosNuevos.length} permiso(s) creado(s): ${permisosNuevos.map((p) => p.nombre).join(", ")}`,
      );
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudieron crear los permisos");
    }
  };

  // ---- Acciones de roles ----
  const abrirRolModal = (tipo: "crear" | "editar" | "eliminar", rol?: RolFila) => {
    setRolModal({ tipo, rol });
    setNombreRol(rol?.nombre_rol ?? "");
  };

  const cerrarRolModal = () => {
    setRolModal({ tipo: null });
    setNombreRol("");
  };

  const guardarRol = async () => {
    try {
      if (rolModal.tipo === "crear") {
        await container.createRol.execute(nombreRol);
        messageApi.success("Rol creado correctamente");
      } else if (rolModal.tipo === "editar" && rolModal.rol) {
        await container.updateRol.execute(rolModal.rol.id_rol, nombreRol);
        messageApi.success("Rol actualizado correctamente");
      }
      await refrescarTodo();
      cerrarRolModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo guardar el rol");
    }
  };

  const eliminarRol = async () => {
    if (!rolModal.rol) return;
    try {
      await container.deleteRol.execute(rolModal.rol.id_rol);
      if (rolSeleccionado === rolModal.rol.id_rol) {
        setRolSeleccionado(null);
        setPermisosDelRol([]);
      }
      await refrescarTodo();
      messageApi.success("Rol eliminado correctamente");
      cerrarRolModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el rol");
    }
  };

  // ---- Acciones de la matriz ----
  const seleccionarRol = async (idRol: number) => {
    setRolSeleccionado(idRol);
    setCargandoAsignacion(true);
    try {
      const ids = await container.getPermisoIdsByRol.execute(idRol);
      setPermisosDelRol(ids);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudieron cargar los permisos del rol");
    } finally {
      setCargandoAsignacion(false);
    }
  };

  const alternarPermiso = async (permiso: Permiso, checked: boolean) => {
    if (!rolSeleccionado) return;
    const anterior = permisosDelRol;
    // Actualización optimista para respuesta inmediata.
    setPermisosDelRol((prev) =>
      checked ? [...prev, permiso.id_permiso] : prev.filter((id) => id !== permiso.id_permiso),
    );
    try {
      if (checked) {
        await container.assignPermisoARol.execute(rolSeleccionado, permiso.id_permiso);
      } else {
        await container.removePermisoDeRol.execute(rolSeleccionado, permiso.id_permiso);
      }
      // Refrescar permisos de la sesión por si el usuario editó su propio rol.
      await queryClient.invalidateQueries({ queryKey: ["permisos"] });
    } catch (error) {
      setPermisosDelRol(anterior); // revertir
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar el permiso");
    }
  };

  const eliminarPermiso = async (permiso: Permiso) => {
    try {
      await container.deletePermiso.execute(permiso.id_permiso);
      // Quitarlo del estado local del rol si estaba asignado.
      setPermisosDelRol((prev) => prev.filter((id) => id !== permiso.id_permiso));
      await refrescarTodo();
      messageApi.success(`Permiso "${permiso.nombre_permiso}" eliminado`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el permiso");
    }
  };

  // Permisos agrupados por módulo para la matriz.
  const permisosPorModulo = useMemo(() => {
    const mapa = new Map<string, Permiso[]>();
    for (const p of permisos ?? []) {
      const modulo = p.modulo ?? "general";
      if (!mapa.has(modulo)) mapa.set(modulo, []);
      mapa.get(modulo)!.push(p);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permisos]);

  const rolActual = roles?.find((r) => r.id_rol === rolSeleccionado) ?? null;

  if (cargandoRoles || cargandoPermisos) {
    return (
      <div>
        {contextHolder}
        <PageToolbar title="Roles y Permisos" />
        <Card style={{ textAlign: "center", padding: 40 }}>
          <Spin />
          <div style={{ marginTop: 12, color: "#8c8c8c" }}>Cargando roles y permisos...</div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Roles y Permisos"
        subtitle="Definí qué ve y qué puede hacer cada rol. Los permisos siguen la convención acción_recurso."
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Convención de permisos"
        description="Cada permiso se nombra como acción_recurso. Al crear un permiso nuevo, escribí solo la palabra del recurso (ej: proveedores) y marcá con checks las acciones: Acceder (ver_), Crear (crear_), Modificar (editar_), Eliminar (eliminar_) o Autorizar (autorizar_)."
      />

      {/* ---------------- Constructor de permisos ---------------- */}
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined />
            Crear permisos nuevos
          </Space>
        }
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Text strong>Palabra del recurso</Text>
            <Input
              placeholder="ej: proveedores"
              value={recurso}
              onChange={(e) => setRecurso(e.target.value)}
              style={{ marginTop: 4 }}
              disabled={!puedeCrearPermisos}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Se normaliza a minúsculas y guiones bajos automáticamente.
            </Text>
          </Col>

          <Col xs={24} md={10}>
            <Text strong>Acciones (marcá con checks)</Text>
            <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {ACCIONES.map((a) => (
                <Checkbox
                  key={a.accion}
                  checked={accionesMarcadas.includes(a.accion)}
                  disabled={!puedeCrearPermisos}
                  onChange={(e) =>
                    setAccionesMarcadas((prev) =>
                      e.target.checked ? [...prev, a.accion] : prev.filter((x) => x !== a.accion),
                    )
                  }
                >
                  <Tooltip title={a.ayuda}>
                    <span>
                      {a.etiqueta} <Text type="secondary">({a.prefijo})</Text>
                    </span>
                  </Tooltip>
                </Checkbox>
              ))}
            </div>
          </Col>

          <Col xs={24} md={6}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCrearPermisos}
              disabled={!puedeCrearPermisos || permisosNuevos.length === 0}
              block
            >
              Crear {permisosNuevos.length > 0 ? `${permisosNuevos.length} permiso(s)` : "permisos"}
            </Button>
          </Col>
        </Row>

        {recursoNormalizado && (
          <>
            <Divider style={{ margin: "16px 0 8px" }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Vista previa:
            </Text>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {previsualizacion.length === 0 ? (
                <Text type="secondary">Marcá al menos una acción para ver el resultado.</Text>
              ) : (
                previsualizacion.map((p) => (
                  <Tag key={p.nombre} color={p.existe ? "default" : "green"}>
                    {p.nombre}
                    {p.existe ? " (ya existe)" : " (nuevo)"}
                  </Tag>
                ))
              )}
            </div>
          </>
        )}
      </Card>

      {/* ---------------- Roles + Matriz ---------------- */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                Roles
              </Space>
            }
            extra={
              puedeCrearRoles ? (
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => abrirRolModal("crear")}>
                  Nuevo rol
                </Button>
              ) : null
            }
            style={{ borderRadius: 12 }}
          >
            {(roles ?? []).length === 0 ? (
              <Empty description="No hay roles todavía" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(roles ?? []).map((rol: RolFila) => (
                  <div
                    key={rol.id_rol}
                    onClick={() => seleccionarRol(rol.id_rol)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border:
                        rolSeleccionado === rol.id_rol
                          ? "1px solid #1677ff"
                          : "1px solid #f0f0f0",
                      background: rolSeleccionado === rol.id_rol ? "#f0f5ff" : "transparent",
                    }}
                  >
                    <Space>
                      <Text strong>{rol.nombre_rol}</Text>
                      {rolSeleccionado === rol.id_rol && <Tag color="blue">seleccionado</Tag>}
                    </Space>
                    <Space onClick={(e) => e.stopPropagation()}>
                      {puedeEditarRoles && (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => abrirRolModal("editar", rol)}
                        >
                          Editar
                        </Button>
                      )}
                      {puedeEliminarRoles && (
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => abrirRolModal("eliminar", rol)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined />
                Permisos {rolActual ? `de "${rolActual.nombre_rol}"` : ""}
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {!rolSeleccionado ? (
              <Empty description="Seleccioná un rol a la izquierda para ver y asignar sus permisos" />
            ) : cargandoAsignacion ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin />
              </div>
            ) : permisosPorModulo.length === 0 ? (
              <Empty description="No hay permisos en el catálogo. Creá algunos arriba." />
            ) : (
              <div style={{ maxHeight: 480, overflow: "auto" }}>
                {permisosPorModulo.map(([modulo, lista]) => (
                  <div key={modulo} style={{ marginBottom: 16 }}>
                    <Text strong style={{ textTransform: "uppercase", fontSize: 12, color: "#8c8c8c" }}>
                      {modulo}
                    </Text>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                      {lista.map((p) => (
                        <Space key={p.id_permiso} size={4}>
                          <Checkbox
                            checked={permisosDelRol.includes(p.id_permiso)}
                            disabled={!puedeAsignar}
                            onChange={(e) => alternarPermiso(p, e.target.checked)}
                          >
                            {p.nombre_permiso}
                          </Checkbox>
                          {puedeEliminarPermisos && (
                            <Tooltip title="Eliminar permiso del catálogo">
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => eliminarPermiso(p)}
                              />
                            </Tooltip>
                          )}
                        </Space>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rolSeleccionado && !puedeAsignar && (
              <Alert
                type="warning"
                showIcon
                message="No tenés permiso para modificar la asignación de permisos."
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ---------------- Modal crear/editar rol ---------------- */}
      <Modal
        title={rolModal.tipo === "crear" ? "Nuevo rol" : "Editar rol"}
        open={rolModal.tipo === "crear" || rolModal.tipo === "editar"}
        onCancel={cerrarRolModal}
        onOk={guardarRol}
        okText={rolModal.tipo === "crear" ? "Crear" : "Guardar"}
        cancelText="Cancelar"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nombre del rol" required>
            <Input
              placeholder="ej: Supervisor"
              value={nombreRol}
              onChange={(e) => setNombreRol(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ---------------- Modal eliminar rol ---------------- */}
      <Modal
        title="Eliminar rol"
        open={rolModal.tipo === "eliminar"}
        onCancel={cerrarRolModal}
        onOk={eliminarRol}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <Paragraph style={{ marginTop: 16 }}>
          ¿Seguro que querés eliminar el rol <strong>{rolModal.rol?.nombre_rol}</strong>? Se quitarán
          también sus permisos asignados. Los usuarios que lo tengan quedarán sin ese rol.
        </Paragraph>
      </Modal>
    </div>
  );
}
