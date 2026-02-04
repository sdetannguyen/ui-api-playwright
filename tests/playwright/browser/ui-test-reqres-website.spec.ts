import { expect, test } from "@playwright/test";
import { ReqresHomePage } from "../../../pages/ReqresHomePage";

/**
 * Steps
 * 1. Access https://reqres.in/
 * 2. Select 'Single user' tab
 * 3. Get the ui response ouput
 */
test("Verify single user session", async ({ page }) => {
  const homePage = new ReqresHomePage(page);

  await homePage.goto();
});

test("This is a failed test", async () => {
  expect(false).toBe(true);
});
