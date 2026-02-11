import { render, screen, fireEvent } from "@testing-library/react";
import CoachesInfoStep from "../CoachesInfo";
import type { UseFormReturn } from "react-hook-form";

/* ---------------------------------- */
/* MOCK ICON                          */
/* ---------------------------------- */
jest.mock("lucide-react", () => ({
  X: () => <span data-testid="close-icon">X</span>,
}));

/* ---------------------------------- */
/* MOCK UI COMPONENTS                 */
/* ---------------------------------- */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/form", () => ({
  FormLabel: ({ children }: any) => <label>{children}</label>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: any) => (
    <button
      data-testid="select-generic"
      onClick={() => onValueChange("value-1")}
    >
      {children}
    </button>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/multi-select", () => ({
  __esModule: true,
  default: ({ onChange, placeholder }: any) => (
    <button data-testid="tone-select" onClick={() => onChange(["tone-1"])}>
      {placeholder}
    </button>
  ),
}));

/* ---------------------------------- */
/* MOCK DATA HOOKS                    */
/* ---------------------------------- */
jest.mock("@/hooks/coaches/useTones", () => ({
  useTones: () => ({
    data: { data: [{ id: "t1", name: "Friendly" }] },
  }),
}));

jest.mock("@/hooks/coaches/useAccents", () => ({
  useAccents: () => ({
    data: { data: [{ id: "a1", name: "US" }] },
  }),
}));

jest.mock("@/hooks/coaches/useGenders", () => ({
  useGenders: () => ({
    data: { data: [{ id: "g1", name: "Male" }] },
  }),
}));

jest.mock("@/hooks/coaches/useAgents", () => ({
  useAgents: () => ({
    data: {
      data: {
        agents: [
          { id: "agent-1", name: "Coach One" },
          { id: "agent-2", name: "Coach Two" },
        ],
      },
    },
  }),
}));

/* ---------------------------------- */
/* MOCK FORM                          */
/* ---------------------------------- */
const mockSetValue = jest.fn();
const mockWatch = jest.fn();

const mockForm = {
  watch: mockWatch,
  setValue: mockSetValue,
} as unknown as UseFormReturn<any>;

/* ---------------------------------- */
/* TESTS                              */
/* ---------------------------------- */
describe("CoachesInfoStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render empty state when no coaches added", () => {
    mockWatch.mockReturnValue([]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    expect(screen.getByText("No coaches added yet.")).toBeInTheDocument();
  });

  it("should render organization-level title", () => {
    mockWatch.mockReturnValue([]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    expect(
      screen.getByText("Assign Coaches to Organization"),
    ).toBeInTheDocument();
  });

  it("should render business-level title", () => {
    mockWatch.mockReturnValue([]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel={false}
      />,
    );

    expect(
      screen.getByText("Assign Organization Coaches to Business"),
    ).toBeInTheDocument();
  });

  it("should render added coach and allow deletion", () => {
    mockWatch.mockReturnValue([
      {
        id: "1",
        agentId: "agent-1",
        toneIds: [],
        accentId: "",
        genderId: "",
      },
    ]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    expect(screen.getByDisplayValue("Coach One")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-icon"));

    expect(mockSetValue).toHaveBeenCalled();
  });

  it("should hide tone/accent/gender fields when not organization level", () => {
    mockWatch.mockReturnValue([
      {
        id: "1",
        agentId: "agent-1",
      },
    ]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel={false}
      />,
    );

    expect(screen.queryByText("Select tones")).not.toBeInTheDocument();
    expect(screen.queryByText("Gender")).not.toBeInTheDocument();
    expect(screen.queryByText("Accent")).not.toBeInTheDocument();
  });

  it("should extract options from nested API response", () => {
    mockWatch.mockReturnValue([
      {
        id: "1",
        agentId: "agent-1",
        toneIds: [],
        accentId: "",
        genderId: "",
      },
    ]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    // tone options come from extractOptions
    expect(screen.getByText("Select tones")).toBeInTheDocument();
  });

  it("should show all agents added message when no available agents", () => {
    mockWatch.mockReturnValue([
      {
        id: "1",
        agentId: "agent-1",
      },
      {
        id: "2",
        agentId: "agent-2",
      },
    ]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    expect(screen.getByText("All agents added")).toBeInTheDocument();
  });

  it("should update coach toneIds", () => {
    mockWatch.mockReturnValue([
      {
        id: "1",
        agentId: "agent-1",
        toneIds: [],
        accentId: "",
        genderId: "",
      },
    ]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    fireEvent.click(screen.getByTestId("tone-select"));

    expect(mockSetValue).toHaveBeenCalledWith(
      "coaches",
      expect.arrayContaining([
        expect.objectContaining({
          toneIds: ["tone-1"],
        }),
      ]),
    );
  });

  it("should update coach gender and accent", () => {
    mockWatch.mockReturnValue([
      {
        id: "1",
        agentId: "agent-1",
        toneIds: [],
        accentId: "",
        genderId: "",
      },
    ]);

    render(
      <CoachesInfoStep
        form={mockForm}
        isAddCoachOpen={false}
        setIsAddCoachOpen={jest.fn()}
        isOrganizationLevel
      />,
    );

    const selects = screen.getAllByTestId("select-generic");

    fireEvent.click(selects[0]);
    fireEvent.click(selects[1]);

    expect(mockSetValue).toHaveBeenCalled();
  });
});
