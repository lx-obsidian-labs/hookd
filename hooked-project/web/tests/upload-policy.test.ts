import assert from "node:assert/strict";
import test from "node:test";
import { canUploadCategoryForRole } from "../lib/server/upload-policy";

test("upload policy allows common categories for users", () => {
  assert.equal(canUploadCategoryForRole("user", "profile-picture"), true);
  assert.equal(canUploadCategoryForRole("user", "saved-picture"), true);
});

test("upload policy blocks privileged categories for users", () => {
  assert.equal(canUploadCategoryForRole("user", "saved-video"), false);
  assert.equal(canUploadCategoryForRole("user", "fica-document"), false);
});

test("upload policy allows all configured categories for models", () => {
  assert.equal(canUploadCategoryForRole("model", "profile-picture"), true);
  assert.equal(canUploadCategoryForRole("model", "saved-picture"), true);
  assert.equal(canUploadCategoryForRole("model", "saved-video"), true);
  assert.equal(canUploadCategoryForRole("model", "fica-document"), true);
});
