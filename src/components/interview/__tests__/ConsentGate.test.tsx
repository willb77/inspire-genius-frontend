/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ConsentGate from "../ConsentGate"

describe("ConsentGate", () => {
  it("defaults to no_audio and cannot proceed until acknowledged", async () => {
    const user = userEvent.setup()
    const onProceed = jest.fn()

    render(<ConsentGate onProceed={onProceed} />)

    // Default mode is the privacy-conscious "no audio" option.
    expect(screen.getByRole("radio", { name: /no audio \(default\)/i })).toBeChecked()
    expect(screen.getByRole("radio", { name: /audio, with consent/i })).not.toBeChecked()

    const proceedButton = screen.getByRole("button", { name: /acknowledge & continue/i })
    expect(proceedButton).toBeDisabled()

    await user.click(proceedButton)
    expect(onProceed).not.toHaveBeenCalled()

    // Acknowledging unblocks it.
    await user.click(screen.getByRole("checkbox"))
    expect(proceedButton).toBeEnabled()

    await user.click(proceedButton)
    expect(onProceed).toHaveBeenCalledWith({ captured: true, mode: "no_audio", method: "in_app_ack" })
  })

  it("only proceeds in audio mode after explicit selection AND acknowledgement", async () => {
    const user = userEvent.setup()
    const onProceed = jest.fn()

    render(<ConsentGate onProceed={onProceed} />)

    const audioRadio = screen.getByRole("radio", { name: /audio, with consent/i })
    const proceedButton = screen.getByRole("button", { name: /acknowledge & continue/i })

    // Selecting audio mode alone still doesn't unlock proceeding.
    await user.click(audioRadio)
    expect(audioRadio).toBeChecked()
    expect(proceedButton).toBeDisabled()

    await user.click(proceedButton)
    expect(onProceed).not.toHaveBeenCalled()

    // Only after the explicit acknowledgement checkbox does it unlock, and the
    // emitted consent reflects the audio mode that was explicitly selected.
    await user.click(screen.getByRole("checkbox"))
    await user.click(proceedButton)

    expect(onProceed).toHaveBeenCalledWith({ captured: true, mode: "audio", method: "in_app_ack" })
  })
})
