import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ManagerSelect, OrgMoveSelect, RoleSelect } from "../OrgMemberEditors";
import { NONE_VALUE } from "../orgMemberEditors.constants";

// Radix Select does not open in jsdom. This stand-in renders every item as a
// button that picks it, inside a group named by the trigger's aria-label.
jest.mock("@/components/ui/select", () => {
  const Ctx = React.createContext<{ pick: (v: string) => void; value?: string }>({ pick: () => {} });
  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange: (v: string) => void;
    }) => (
      <Ctx.Provider value={{ pick: onValueChange, value }}>
        <div role="group" data-value={value}>
          {children}
        </div>
      </Ctx.Provider>
    ),
    SelectTrigger: ({ "aria-label": label }: { "aria-label"?: string }) => <span>{label}</span>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const ctx = React.useContext(Ctx);
      return (
        <button type="button" data-value={value} onClick={() => ctx.pick(value)}>
          {children}
        </button>
      );
    },
  };
});

const people = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cara" },
];

describe("ManagerSelect", () => {
  it("never offers the member as their own manager", () => {
    render(
      <ManagerSelect memberId="a" memberName="Alice" managerId={null} managerName={null} candidates={people} onPick={jest.fn()} />
    );
    expect(screen.queryByRole("button", { name: "Alice" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bob" })).toBeInTheDocument();
  });

  it("picks a manager by id and name", () => {
    const onPick = jest.fn();
    render(
      <ManagerSelect memberId="a" memberName="Alice" managerId={null} managerName={null} candidates={people} onPick={onPick} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Cara" }));
    expect(onPick).toHaveBeenCalledWith("c", "Cara");
  });

  it("clears with None", () => {
    const onPick = jest.fn();
    render(
      <ManagerSelect memberId="a" memberName="Alice" managerId="b" managerName="Bob" candidates={people} onPick={onPick} />
    );
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(onPick).toHaveBeenCalledWith(null, "None");
  });

  it("does nothing when the current value is picked again", () => {
    const onPick = jest.fn();
    render(
      <ManagerSelect memberId="a" memberName="Alice" managerId="b" managerName="Bob" candidates={people} onPick={onPick} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Bob" }));
    expect(onPick).not.toHaveBeenCalled();
  });

  it("does not claim None when the backend did not report the line", () => {
    render(
      <ManagerSelect memberId="a" memberName="Alice" managerId={undefined} managerName={undefined} candidates={people} onPick={jest.fn()} />
    );
    expect(screen.getByText("Not available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "None" })).not.toBeInTheDocument();
  });

  it("still shows a current manager who is not in the list", () => {
    render(
      <ManagerSelect memberId="a" memberName="Alice" managerId="z" managerName="Zed Elsewhere" candidates={people} onPick={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Zed Elsewhere" })).toBeInTheDocument();
  });
});

describe("RoleSelect", () => {
  it("offers the six roles and picks one", () => {
    const onPick = jest.fn();
    render(<RoleSelect memberName="Alice" role="user" onPick={onPick} />);
    const group = screen.getByRole("group");
    expect(within(group).getAllByRole("button")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Manager" }));
    expect(onPick).toHaveBeenCalledWith("manager");
  });
});

describe("OrgMoveSelect", () => {
  const orgs = [
    { id: "o1", name: "Here" },
    { id: "o2", name: "There" },
  ];

  it("moves to another organization", () => {
    const onPick = jest.fn();
    render(<OrgMoveSelect memberName="Alice" currentOrgId="o1" orgs={orgs} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "There" }));
    expect(onPick).toHaveBeenCalledWith("o2", "There");
  });

  it("removes from the organization", () => {
    const onPick = jest.fn();
    render(<OrgMoveSelect memberName="Alice" currentOrgId="o1" orgs={orgs} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from organization" }));
    expect(onPick).toHaveBeenCalledWith(null, "No organization");
    expect(NONE_VALUE).toBe("__none__");
  });
});
