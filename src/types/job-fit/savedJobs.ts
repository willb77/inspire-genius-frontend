/** JF-7 — one job the person saved to Favorites (`/v1/agents/saved-jobs`). */
export type SavedJob = {
  jobId: string
  roleTitle: string | null
  savedAt: string | null
}

export type SaveJobIn = {
  jobId: string
  roleTitle?: string | null
}

export type SaveJobOut = {
  savedJob: SavedJob
  /** false when the job was already a favorite. */
  created: boolean
}
