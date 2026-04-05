export type UploadCategory = "profile-picture" | "saved-picture" | "saved-video" | "fica-document";
export type UploadRole = "user" | "model";

const categoryRoles: Record<UploadCategory, ReadonlyArray<UploadRole>> = {
  "profile-picture": ["user", "model"],
  "saved-picture": ["user", "model"],
  "saved-video": ["model"],
  "fica-document": ["model"],
};

export function canUploadCategoryForRole(role: UploadRole, category: UploadCategory) {
  return categoryRoles[category].includes(role);
}
