import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const baseProps = {
  title: "Confirm action",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmModal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(<ConfirmModal {...baseProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the title when open is true", () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
  });

  it("renders the message paragraph when message prop is provided", () => {
    render(<ConfirmModal {...baseProps} open={true} message="Are you sure?" />);
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("does not render a message paragraph when message is absent", () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("defaults confirm label to Confirm", () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("uses a custom confirmLabel", () => {
    render(<ConfirmModal {...baseProps} open={true} confirmLabel="Delete" />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("defaults cancel label to Cancel", () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("uses a custom cancelLabel", () => {
    render(<ConfirmModal {...baseProps} open={true} cancelLabel="Go back" />);
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });

  it("confirm button has red styling when destructive", () => {
    render(<ConfirmModal {...baseProps} open={true} destructive />);
    const btn = screen.getByRole("button", { name: "Confirm" });
    expect(btn.className).toMatch(/red/);
  });

  it("confirm button has blue styling when not destructive", () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    const btn = screen.getByRole("button", { name: "Confirm" });
    expect(btn.className).toMatch(/blue/);
  });

  it("shows Loading... and disables both buttons when loading", () => {
    render(<ConfirmModal {...baseProps} open={true} loading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...baseProps} open={true} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...baseProps} open={true} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...baseProps} open={true} onCancel={onCancel} />);
    // The backdrop is the outermost div (fixed overlay)
    const backdrop = screen.getByText("Confirm action").closest('[class*="fixed"]')!;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not call onCancel when modal content area is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...baseProps} open={true} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
