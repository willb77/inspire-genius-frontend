import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type Column } from "../DataTable";

/* ---------------------------------- */
/* MOCK TABLE COMPONENTS              */
/* ---------------------------------- */
jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, onClick }: any) => (
    <tr onClick={onClick}>{children}</tr>
  ),
  TableHead: ({ children, onClick }: any) => (
    <th onClick={onClick}>{children}</th>
  ),
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

/* ---------------------------------- */
/* TEST DATA                          */
/* ---------------------------------- */
type Row = {
  id: number;
  name: string;
  age: number;
};

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
  },
  {
    key: "age",
    header: "Age",
  },
  {
    key: "custom",
    header: "Custom",
    render: (row) => <span>Custom-{row.name}</span>,
  },
];

const data: Row[] = [
  { id: 1, name: "Alice", age: 25 },
  { id: 2, name: "Bob", age: 30 },
];

/* ---------------------------------- */
/* TESTS                              */
/* ---------------------------------- */
describe("DataTable", () => {
  it("should render table headers", () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("should render table rows and cells", () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("should render custom cell content using render function", () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText("Custom-Alice")).toBeInTheDocument();
    expect(screen.getByText("Custom-Bob")).toBeInTheDocument();
  });

  it("should show empty message when data is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No rows found"
      />
    );

    expect(screen.getByText("No rows found")).toBeInTheDocument();
  });

  it("should call onSortChange when sortable header is clicked", () => {
    const onSortChange = jest.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        onSortChange={onSortChange}
      />
    );

    fireEvent.click(screen.getByText("Name"));

    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("should not call onSortChange for non-sortable column", () => {
    const onSortChange = jest.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        onSortChange={onSortChange}
      />
    );

    fireEvent.click(screen.getByText("Age"));

    expect(onSortChange).not.toHaveBeenCalled();
  });

  it("should render sort indicator when column is sorted ascending", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        sortKey="name"
        sortDirection="asc"
      />
    );

    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("should render sort indicator when column is sorted descending", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        sortKey="name"
        sortDirection="desc"
      />
    );

    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("should call onRowClick when a row is clicked", () => {
    const onRowClick = jest.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        onRowClick={onRowClick}
      />
    );

    fireEvent.click(screen.getByText("Alice"));

    expect(onRowClick).toHaveBeenCalledWith(data[0], 0);
  });

  it("should render null fallback when cell value is undefined", () => {
    const faultyData = [{ id: 1, name: undefined, age: 20 }] as any;

    render(<DataTable columns={columns} data={faultyData} />);

    // No crash = fallback branch executed
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
