/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import TeamManagement from "../TeamManagement";

// ---------------- MOCKS ----------------

// Layout
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Badge
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => (
    <span data-testid="badge">{children}</span>
  ),
}));

// DataTable
jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ columns, data }: any) => (
    <div data-testid="data-table">
      {data.map((row: any) => (
        <div key={row.id} data-testid="row">
          {columns.map((col: any, colIndex: number) => (
            <div key={colIndex}>
              {col.render ? col.render(row) : row[col.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

// Pagination
jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: ({ onPageChange }: any) => (
    <button
      data-testid="pagination"
      onClick={() => onPageChange(2)}
    >
      Next
    </button>
  ),
}));

// ActionMenu
jest.mock("@/components/shared/ActionMenu", () => ({
  __esModule: true,
  default: ({ row, onEdit, onDeactivate, onDelete }: any) => (
    <div data-testid={`actions-${row.id}`}>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDeactivate}>Deactivate</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}));

// ManagementHeader
jest.mock("@/components/super-admin/ManagementHeader", () => ({
  __esModule: true,
  default: ({ onAdd }: any) => (
    <button data-testid="add-user" onClick={onAdd}>
      Add User
    </button>
  ),
}));

// TeamFormModal
jest.mock("@/components/shared/forms/TeamFormModal", () => ({
  __esModule: true,
  default: ({ open, onSubmit, mode }: any) =>
    open ? (
      <div data-testid={`team-form-${mode}`}>
        <button
          onClick={() =>
            onSubmit({
              name: "New User",
              email: "new@test.com",
              role: "Admin",
              status: "Active",
            })
          }
        >
          Submit
        </button>
      </div>
    ) : null,
}));

// ConfirmActionModal
jest.mock("@/components/shared/forms/ConfirmActionModal", () => ({
  __esModule: true,
  default: ({ open, onConfirm, title }: any) =>
    open ? (
      <div data-testid="confirm-modal">
        <div>{title}</div>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
}));

// useSortingPagination
jest.mock("@/hooks/useSortingPagination", () => ({
  useSortingPagination: (rows: any[]) => ({
    sortKey: "name",
    sortDirection: "asc",
    page: 1,
    setPage: jest.fn(),
    onSortChange: jest.fn(),
    paginated: rows,
    total: rows.length,
    totalPages: 1,
    start: 0,
  }),
}));

// ---------------- TESTS ----------------

describe("TeamManagement", () => {
  test("renders initial rows", () => {
    render(<TeamManagement />);

    expect(screen.getAllByTestId("row").length).toBe(8);
    expect(screen.getByText("Zoya Sheikh")).toBeInTheDocument();
  });

  test("opens add modal and adds new user", () => {
    render(<TeamManagement />);

    fireEvent.click(screen.getByTestId("add-user"));
    fireEvent.click(screen.getByText("Submit"));

    expect(screen.getByText("New User")).toBeInTheDocument();
  });

  test("opens edit modal and updates first user", () => {
    render(<TeamManagement />);

    const firstRow = screen.getAllByTestId("row")[0];
    const editButton = within(firstRow).getByText("Edit");

    fireEvent.click(editButton);
    fireEvent.click(screen.getByText("Submit"));

    expect(screen.getByText("New User")).toBeInTheDocument();
  });

  test("deactivates first user", () => {
    render(<TeamManagement />);

    const firstRow = screen.getAllByTestId("row")[0];
    const deactivateButton = within(firstRow).getByText("Deactivate");

    fireEvent.click(deactivateButton);
    fireEvent.click(screen.getByText("Confirm"));

    expect(screen.getAllByTestId("row").length).toBe(8);
  });

  test("deletes first user", () => {
    render(<TeamManagement />);

    const rowsBefore = screen.getAllByTestId("row").length;

    const firstRow = screen.getAllByTestId("row")[0];
    const deleteButton = within(firstRow).getByText("Delete");

    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByText("Confirm"));

    const rowsAfter = screen.getAllByTestId("row").length;

    expect(rowsAfter).toBe(rowsBefore - 1);
  });

  test("pagination changes page", () => {
    render(<TeamManagement />);

    fireEvent.click(screen.getByTestId("pagination"));

    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  test("renders status badges", () => {
    render(<TeamManagement />);

    expect(screen.getAllByTestId("badge").length).toBeGreaterThan(0);
  });
});
