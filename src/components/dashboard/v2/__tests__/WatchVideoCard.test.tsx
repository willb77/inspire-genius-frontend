import { fireEvent, render, screen } from "@testing-library/react"

import { WatchVideoCard, type DashboardVideo } from "../WatchVideoCard"

const videos: DashboardVideo[] = [
  {
    id: "v1",
    title: "Getting started with coaching",
    src: "https://example.com/a.mp4",
    duration: "3:12",
  },
  {
    id: "v2",
    title: "Understanding your PRISM report",
    src: "https://example.com/b.mp4",
    duration: "5:40",
  },
  {
    id: "v3",
    title: "Setting effective goals",
    src: "https://example.com/c.mp4",
    duration: "4:05",
  },
  {
    id: "v4",
    title: "Working with Meridian",
    src: "https://example.com/d.mp4",
    duration: "2:48",
  },
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

  it("renders a video player for the first video's src by default", () => {
    const { container } = render(
      <WatchVideoCard videos={videos} onSelect={jest.fn()} />
    )

    const video = container.querySelector("video")
    expect(video).not.toBeNull()
    expect(video?.getAttribute("src")).toBe(videos[0].src)
  })

  it("selects the second thumbnail, calls onSelect, and swaps the video src", () => {
    const onSelect = jest.fn()
    const { container } = render(
      <WatchVideoCard videos={videos} onSelect={onSelect} />
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: /understanding your prism report/i,
      })
    )

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(videos[1])

    const video = container.querySelector("video")
    expect(video?.getAttribute("src")).toBe(videos[1].src)
  })

  it("renders a thumbnail for every video (no 4-item cap)", () => {
    const fiveVideos: DashboardVideo[] = [
      ...videos,
      {
        id: "v5",
        title: "People in Transition",
        src: "https://example.com/e.mp4",
      },
    ]

    render(<WatchVideoCard videos={fiveVideos} onSelect={jest.fn()} />)

    // A thumbnail is rendered per video as a button; the 5th must be present.
    expect(
      screen.getByRole("button", { name: /people in transition/i })
    ).toBeInTheDocument()
  })

  it("renders an empty state when there are no videos", () => {
    render(<WatchVideoCard videos={[]} />)

    expect(screen.getByText(/no videos available yet/i)).toBeInTheDocument()
  })
})
