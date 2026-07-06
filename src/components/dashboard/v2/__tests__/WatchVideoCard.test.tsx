import { fireEvent, render, screen } from "@testing-library/react"

import { WatchVideoCard, type DashboardVideo } from "../WatchVideoCard"

const videos: DashboardVideo[] = [
  { id: "v1", title: "Getting started with coaching", duration: "3:12" },
  { id: "v2", title: "Understanding your PRISM report", duration: "5:40" },
  { id: "v3", title: "Setting effective goals", duration: "4:05" },
  { id: "v4", title: "Working with Meridian", duration: "2:48" },
]

describe("WatchVideoCard", () => {
  it("renders all four video titles", () => {
    render(<WatchVideoCard videos={videos} onSelect={jest.fn()} />)

    // The selected video's title appears in both the preview and its thumbnail,
    // so assert at least one occurrence per title.
    videos.forEach((video) => {
      expect(screen.getAllByText(video.title).length).toBeGreaterThanOrEqual(1)
    })
  })

  it("selects the second thumbnail and calls onSelect with that video", () => {
    const onSelect = jest.fn()
    render(<WatchVideoCard videos={videos} onSelect={onSelect} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: /understanding your prism report/i,
      })
    )

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(videos[1])
  })

  it("renders an empty state when there are no videos", () => {
    render(<WatchVideoCard videos={[]} />)

    expect(screen.getByText(/no videos available yet/i)).toBeInTheDocument()
  })
})
