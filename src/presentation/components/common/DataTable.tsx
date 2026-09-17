import { Card, Table } from "antd";
import type { TableProps } from "antd";

const DEFAULT_PAGE_SIZE = 10;

export interface DataTableProps<T extends object> extends Omit<TableProps<T>, "pagination"> {
  /** Wrap the table in a Card. Defaults to true. */
  card?: boolean;
  /** Same shape as antd's Table pagination prop; `false` disables it. Defaults to a 10/page setup with a total counter. */
  pagination?: TableProps<T>["pagination"];
}

/**
 * Generic, reusable table for module list pages.
 *
 * Defaults `scroll.x` to "max-content" so columns stay legible and scroll
 * horizontally on narrow viewports instead of being squeezed by antd's
 * layout (the cause of the mobile rendering bug on list pages). All other
 * antd Table props pass through unchanged, so callers keep full control
 * over columns, selection, expandable rows, etc.
 */
export function DataTable<T extends object>({
  card = true,
  pagination,
  scroll,
  size = "middle",
  ...rest
}: DataTableProps<T>) {
  const table = (
    <Table<T>
      size={size}
      scroll={{ x: "max-content", ...scroll }}
      pagination={
        pagination === false
          ? false
          : {
              pageSize: DEFAULT_PAGE_SIZE,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} registros`,
              ...pagination,
            }
      }
      {...rest}
    />
  );

  return card ? <Card>{table}</Card> : table;
}
