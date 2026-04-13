/**
 * @jest-environment jsdom
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { SidebarContext, useSidebar, type SidebarContextProps } from "../sidebar-context";

describe("SidebarContext", () => {
  test("useSidebar throws when used outside provider", () => {
    // Suppress console.error for the expected error
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSidebar())).toThrow(
      "useSidebar must be used within a SidebarProvider."
    );
    spy.mockRestore();
  });

  test("useSidebar returns context value from provider", () => {
    const mockSetOpen = jest.fn();
    const mockSetOpenMobile = jest.fn();
    const mockToggle = jest.fn();

    const value: SidebarContextProps = {
      state: "expanded",
      open: true,
      setOpen: mockSetOpen,
      openMobile: false,
      setOpenMobile: mockSetOpenMobile,
      isMobile: false,
      toggleSidebar: mockToggle,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.state).toBe("expanded");
    expect(result.current.open).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.openMobile).toBe(false);
  });

  test("toggleSidebar callback is callable", () => {
    const mockToggle = jest.fn();

    const value: SidebarContextProps = {
      state: "expanded",
      open: true,
      setOpen: jest.fn(),
      openMobile: false,
      setOpenMobile: jest.fn(),
      isMobile: false,
      toggleSidebar: mockToggle,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.toggleSidebar());
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  test("setOpen callback works", () => {
    const mockSetOpen = jest.fn();

    const value: SidebarContextProps = {
      state: "collapsed",
      open: false,
      setOpen: mockSetOpen,
      openMobile: false,
      setOpenMobile: jest.fn(),
      isMobile: false,
      toggleSidebar: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.setOpen(true));
    expect(mockSetOpen).toHaveBeenCalledWith(true);
  });
});
