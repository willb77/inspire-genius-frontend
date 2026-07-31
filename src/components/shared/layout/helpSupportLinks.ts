/**
 * Static locations of the Coach Workbench user-guide assets. They are served
 * from the frontend's own origin (deployed to the S3 asset bucket behind
 * CloudFront under /docs/guides/), so relative URLs resolve on whichever host
 * the app runs on — dev.inspiresgenius.com, stable.inspiresgenius.com, or local.
 */
export const GUIDE_LINKS = {
  /** The clickable HTML version of the Word guide. */
  html: "/docs/guides/honor-coach-workbench-user-guide.html",
  /** The PowerPoint deck. */
  pptx: "/docs/guides/Honor_Coach_Workbench_User_Guide.pptx",
  /** The Word (.docx) version. */
  docx: "/docs/guides/Honor_Coach_Workbench_User_Guide.docx",
} as const;
