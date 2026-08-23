import { expect, test } from "vitest";

test("the Vitest environment is jsdom with jest-dom matchers", () => {
  expect(document).toBeDefined();
  const el = document.createElement("span");
  el.textContent = "hello";
  expect(el).toHaveTextContent("hello");
});