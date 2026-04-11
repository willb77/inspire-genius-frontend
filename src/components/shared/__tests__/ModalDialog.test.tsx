import { render, screen, fireEvent } from "@testing-library/react";
import ModalDialog from "../ModalDialog";

describe("ModalDialog", () => {
  it("renders title and children when open", () => {
    render(
      <ModalDialog open onOpenChange={jest.fn()} title="Test Modal">
        <p>Modal body content</p>
      </ModalDialog>
    );
    expect(screen.getAllByText("Test Modal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <ModalDialog open onOpenChange={jest.fn()} title="T" description="A description">
        <div />
      </ModalDialog>
    );
    expect(screen.getByText("A description")).toBeInTheDocument();
  });

  it("renders close button by default", () => {
    render(
      <ModalDialog open onOpenChange={jest.fn()} title="T">
        <div />
      </ModalDialog>
    );
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("hides close button when showClose is false", () => {
    render(
      <ModalDialog open onOpenChange={jest.fn()} title="T" showClose={false}>
        <div />
      </ModalDialog>
    );
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <ModalDialog
        open
        onOpenChange={jest.fn()}
        title="T"
        footer={<button>Save</button>}
      >
        <div />
      </ModalDialog>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <ModalDialog open={false} onOpenChange={jest.fn()} title="Hidden">
        <p>Hidden content</p>
      </ModalDialog>
    );
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });
});
