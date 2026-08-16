import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

function Table({ className = "", children, ...props }: TableProps) {
  return (
    <table className={`mk-table ${className}`} {...props}>
      {children}
    </table>
  );
}

interface TrProps extends HTMLAttributes<HTMLTableRowElement> {}

function Tr({ className = "", children, ...props }: TrProps) {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  );
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {}

function Th({ className = "", children, ...props }: ThProps) {
  return (
    <th className={`mk-table-th ${className}`} {...props}>
      {children}
    </th>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {}

function Td({ className = "", children, ...props }: TdProps) {
  return (
    <td className={`mk-table-td ${className}`} {...props}>
      {children}
    </td>
  );
}

export { Table, Tr, Th, Td };
export type { TableProps, TrProps, ThProps, TdProps };
