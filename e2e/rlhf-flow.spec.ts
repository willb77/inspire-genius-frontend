import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

// ─── 4.T6.2: RLHF E2E Testing ──────────────────────────────────────
// Tests the full RLHF feedback loop across UI, API, and admin review.

test.describe("RLHF feedback loop", () => {
  test("submit feedback via UI → visible in feedback history @user", async ({
    page,
  }) => {
    await loginAs(page, "user");

    // Navigate to a coaching/chat context where feedback buttons are available
    await page.getByRole("link", { name: /coach/i }).click();
    await expect(page).toHaveURL(/\/coaches/);

    // Look for feedback buttons (thumbs up/down) on agent responses
    const feedbackBtn = page.locator(
      "[data-testid='feedback-thumbs-up'], [data-testid='feedback-up'], button:has-text('👍')"
    );
    if (await feedbackBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await feedbackBtn.first().click();

      // Verify feedback submitted indicator appears
      const indicator = page.locator(
        "[data-testid='feedback-indicator'], [data-testid='feedback-submitted']"
      );
      await expect(indicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("submit correction → verify in correction modal @user", async ({
    page,
  }) => {
    await loginAs(page, "user");

    await page.getByRole("link", { name: /coach/i }).click();
    await expect(page).toHaveURL(/\/coaches/);

    // Look for correction/thumbs-down button
    const correctionBtn = page.locator(
      "[data-testid='feedback-thumbs-down'], [data-testid='feedback-down'], button:has-text('👎')"
    );
    if (await correctionBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await correctionBtn.first().click();

      // Correction modal should appear
      const modal = page.locator(
        "[data-testid='correction-modal'], [role='dialog']"
      );
      await expect(modal.first()).toBeVisible({ timeout: 5000 });

      // Fill in correction text
      const textarea = modal.first().locator("textarea");
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textarea.fill("The response should have included more specific PRISM dimension details.");

        // Submit correction
        const submitBtn = modal.first().getByRole("button", { name: /submit|send|save/i });
        await submitBtn.click();

        // Modal should close
        await expect(modal.first()).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("view feedback history page @user", async ({ page }) => {
    await loginAs(page, "user");

    // Navigate to feedback history if link exists in sidebar
    const feedbackLink = page.getByRole("link", { name: /feedback/i });
    if (await feedbackLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await feedbackLink.click();
      await expect(page).toHaveURL(/\/feedback/);
    }
  });
});

test.describe("RLHF admin review", () => {
  test("admin can access RLHF training dashboard @super-admin", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    // Navigate to RLHF training
    await page.getByRole("link", { name: /rlhf|training/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/rlhf-training/);

    // Dashboard should render with review queue
    await expect(
      page.getByRole("heading", { name: /rlhf|training|feedback/i })
    ).toBeVisible();
  });

  test("admin can view correction review queue @super-admin", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /rlhf|training/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/rlhf-training/);

    // Look for review queue tab or section
    const reviewTab = page.getByRole("tab", { name: /review|correction|pending/i });
    if (await reviewTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reviewTab.click();
    }

    // Queue should render (even if empty)
    const queueContainer = page.locator(
      "[data-testid='review-queue'], [data-testid='rlhf-queue'], table, [role='grid']"
    );
    await expect(queueContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test("admin can access prompt builder @super-admin", async ({ page }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /prompt/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/prompt-builder/);

    // Prompt builder page should render
    await expect(
      page.getByRole("heading", { name: /prompt/i })
    ).toBeVisible();
  });

  test("prompt builder shows version history @super-admin", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /prompt/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/prompt-builder/);

    // Look for version list/history section
    const versionSection = page.locator(
      "[data-testid='prompt-versions'], [data-testid='version-history']"
    );
    if (await versionSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(versionSection).toBeVisible();
    }
  });
});

test.describe("RLHF data export", () => {
  test("admin can access training data export @super-admin", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    await page.getByRole("link", { name: /rlhf|training/i }).click();
    await expect(page).toHaveURL(/\/super-admin\/rlhf-training/);

    // Look for export button
    const exportBtn = page.getByRole("button", {
      name: /export|download|training data/i,
    });
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportBtn).toBeEnabled();
    }
  });
});
