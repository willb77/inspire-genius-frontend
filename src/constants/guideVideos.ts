/**
 * The My Workspace tour (4:13), narrated: Home and the seven sidebar pages.
 *
 * A durable object URL on the public demo bucket the Home videos already play
 * from: no auth, no expiry. It is offered in two places — the header pill on
 * the user's other pages, and inside Home's own Videos dropdown — so the URL
 * lives here, once.
 *
 * Re-recorded 2026-08-26 and replaced 2026-10-02 by `IG_My_Workspace.mp4`, each
 * time as a NEW key rather than an overwrite: that bucket is served straight
 * from S3 with `max-age=86400` and no CloudFront in front, so an overwrite has
 * no invalidation path. `My_Workspace_Orientation.mp4` stays in the bucket
 * untouched.
 */
export const WORKSPACE_GUIDE_VIDEO_URL =
  "https://ig-demo-public-videos.s3.amazonaws.com/IG_My_Workspace.mp4";
