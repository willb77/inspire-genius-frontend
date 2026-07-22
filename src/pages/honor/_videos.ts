/**
 * Honor video library. All movies are hosted on the shared public-videos CDN /
 * bucket (referenced by absolute URL, so one asset serves every environment).
 * Not bundled with the app. Add a new entry here to surface it in the dashboard
 * "Videos" dropdown.
 */
import { PRISM_OVERVIEW_VIDEO_URL } from "./_media"

export type HonorVideo = {
  id: string
  title: string
  blurb: string
  url: string
}

export const HONOR_VIDEOS: HonorVideo[] = [
  {
    id: "prism-overview",
    title: "PRISM Overview",
    blurb: "An overview of PRISM Brain Mapping and what the report tells you.",
    url: PRISM_OVERVIEW_VIDEO_URL,
  },
  {
    id: "prism-survey-intro",
    title: "PRISM Survey — Introduction",
    blurb: "What the PRISM survey is and how a Fellow completes it.",
    url: "https://dj7od5nj42063.cloudfront.net/demo/PRISM_Survey_Intro.mp4",
  },
  {
    id: "neuroscience-of-behavior",
    title: "The Neuroscience of Behavior",
    blurb: "The brain science behind behavioral preferences.",
    url: "https://ig-demo-public-videos.s3.amazonaws.com/IG_Neuroscience_of_Behavior_Narrated.mp4",
  },
  {
    id: "brain-map-quiz",
    title: "Brain Map Quiz",
    blurb: "A quick, interactive look at reading a brain map.",
    url: "https://ig-demo-public-videos.s3.amazonaws.com/IG-BrainMap_quiz.mp4",
  },
  {
    id: "journey-map-demos",
    title: "Journey Map Demos",
    blurb: "How a Fellow's journey maps across the program.",
    url: "https://ig-demo-public-videos.s3.amazonaws.com/Journey_Map_Demos.mp4",
  },
  {
    id: "people-in-transition",
    title: "People in Transition",
    blurb: "Supporting service members through career transition.",
    url: "https://dj7od5nj42063.cloudfront.net/demo/People_in_Transition.mp4",
  },
]
