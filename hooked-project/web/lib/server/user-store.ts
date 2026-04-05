import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { readStoreValue, writeStoreValue } from "@/lib/server/kv-store";

type AccountRole = "user" | "model";

type StoredUser = {
  id: string;
  email: string;
  phone?: string;
  isPhoneVerified?: boolean;
  accountStatus?: "pending_verification" | "active" | "limited" | "under_review" | "banned" | "suspended";
  onboardingStep?: "account_created" | "age_confirmed" | "profile_basic" | "photo_added" | "ready";
  photoModerationStatus?: "none" | "pending" | "approved" | "rejected";
  displayName: string;
  firstName: string;
  surname: string;
  username: string;
  role: AccountRole;
  age: number;
  city: string;
  gender: string;
  lookingFor: string[];
  interestedInHookups: boolean;
  profilePictureUrl: string;
  description: string;
  nicheTags: string[];
  fica: {
    status: "pending" | "submitted" | "verified" | "rejected";
    legalNameEncrypted?: string;
    idNumberEncrypted?: string;
    legalName?: string;
    idNumber?: string;
    documentUrl: string;
    submittedAt: string | null;
  };
  savedPics: string[];
  savedVideos: string[];
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastPasswordChangeAt: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecretEncrypted?: string;
  twoFactorPendingSecretEncrypted?: string;
  backupCodesHashes?: string[];
  readMarkers?: Record<string, string>;
  ageVerified: boolean;
  ageVerifiedAt: string | null;
  createdAt: string;
  passwordHash: string;
  passwordSalt: string;
};

export type PublicUser = Omit<StoredUser, "passwordHash" | "passwordSalt" | "backupCodesHashes">;
export type FicaStatus = StoredUser["fica"]["status"];
const MAX_LOGIN_FAILURES = 10;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function resolveAccountStatus(user: StoredUser) {
  if (user.fica.status === "rejected") {
    return "under_review" as const;
  }
  if (!user.ageVerified) {
    return "pending_verification" as const;
  }
  if (user.photoModerationStatus === "rejected") {
    return "under_review" as const;
  }
  if (!user.profilePictureUrl || user.photoModerationStatus !== "approved" || user.fica.status !== "verified") {
    return "limited" as const;
  }
  return "active" as const;
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) {
    return `+${digits.replace(/\D/g, "")}`;
  }
  return `+${digits.slice(1).replace(/\D/g, "")}`;
}

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  );
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function hashBackupCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function resolveEncryptionKey() {
  const seed = process.env.FICA_ENCRYPTION_KEY ?? "dev-fica-encryption-key";
  if (process.env.NODE_ENV === "production") {
    if (!process.env.FICA_ENCRYPTION_KEY || process.env.FICA_ENCRYPTION_KEY === "dev-fica-encryption-key") {
      throw new Error("FICA_ENCRYPTION_KEY must be configured in production.");
    }
  }
  return createHash("sha256").update(seed).digest();
}

function encryptSensitive(value: string) {
  const key = resolveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSensitive(payload: string) {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = payload.split(":");
  if (version !== "v1" || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error("Unsupported encrypted payload format.");
  }
  const key = resolveEncryptionKey();
  const iv = Buffer.from(ivEncoded, "base64");
  const tag = Buffer.from(tagEncoded, "base64");
  const encrypted = Buffer.from(encryptedEncoded, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function maskIdentity(value: string) {
  if (!value) {
    return "";
  }
  if (value.length <= 2) {
    return `${value[0]}*`;
  }
  return `${value[0]}${"*".repeat(Math.max(1, value.length - 2))}${value[value.length - 1]}`;
}

function base32Encode(input: Buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string) {
  const cleaned = input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = alphabet.indexOf(char);
    if (index === -1) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secretBase32: string, epochMs = Date.now(), stepSeconds = 30) {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(epochMs / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function verifyTotp(secretBase32: string, code: string) {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }
  const now = Date.now();
  const windows = [-30_000, 0, 30_000];
  return windows.some((offset) => generateTotpCode(secretBase32, now + offset) === normalized);
}

function generateBackupCode() {
  const raw = randomBytes(4).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

function sanitizeUser(user: StoredUser): PublicUser {
  let legalNameRaw = user.fica.legalName ?? "";
  let idNumberRaw = user.fica.idNumber ?? "";
  try {
    if (user.fica.legalNameEncrypted) {
      legalNameRaw = decryptSensitive(user.fica.legalNameEncrypted);
    }
    if (user.fica.idNumberEncrypted) {
      idNumberRaw = decryptSensitive(user.fica.idNumberEncrypted);
    }
  } catch {
    legalNameRaw = "redacted";
    idNumberRaw = "redacted";
  }

  const { passwordHash, passwordSalt, ...rest } = user;
  void passwordHash;
  void passwordSalt;
  return {
    ...rest,
    fica: {
      ...rest.fica,
      legalName: maskIdentity(legalNameRaw),
      idNumber: maskIdentity(idNumberRaw),
      legalNameEncrypted: undefined,
      idNumberEncrypted: undefined,
    },
  };
}

async function readUsers(): Promise<StoredUser[]> {
  const users = await readStoreValue<StoredUser[]>("users", []);
  return Array.isArray(users) ? users : [];
}

async function writeUsers(users: StoredUser[]) {
  await writeStoreValue("users", users);
}

export async function registerUser(input: {
  email: string;
  phone?: string;
  password: string;
  displayName: string;
  firstName: string;
  surname: string;
  username: string;
  role: AccountRole;
  age: number;
  city: string;
  gender: string;
  lookingFor: string[];
  interestedInHookups: boolean;
  profilePictureUrl: string;
  description: string;
  nicheTags: string[];
  savedPics: string[];
  savedVideos: string[];
  ficaLegalName: string;
  ficaIdNumber: string;
  ficaDocumentUrl: string;
  ficaConsent: boolean;
}) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone ?? "");
  const displayName = input.displayName.trim();
  const firstName = input.firstName.trim() || "Hooked";
  const surname = input.surname.trim() || "Member";
  let username = input.username.trim().toLowerCase();
  const city = input.city.trim() || "Unknown";
  const gender = input.gender.trim() || "Undisclosed";
  const lookingFor = input.lookingFor.map((item) => item.trim()).filter(Boolean);
  const profilePictureUrl = input.profilePictureUrl.trim();
  const description = input.description.trim();
  const nicheTags = input.nicheTags.map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 12);
  const savedPics = input.savedPics.map((item) => item.trim()).filter(Boolean).slice(0, 50);
  const savedVideos = input.savedVideos.map((item) => item.trim()).filter(Boolean).slice(0, 50);
  const ficaLegalName = input.ficaLegalName.trim();
  const ficaIdNumber = input.ficaIdNumber.trim();
  const ficaDocumentUrl = input.ficaDocumentUrl.trim();
  const password = input.password.trim();
  const hasFicaSubmission = Boolean(
    input.ficaConsent || ficaLegalName || ficaIdNumber || ficaDocumentUrl,
  );

  if (!email) {
    return { ok: false as const, message: "Email is required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, message: "Invalid email address." };
  }
  if (phone && !/^\+\d{8,15}$/.test(phone)) {
    return { ok: false as const, message: "Phone must be in international format." };
  }
  if (displayName && (displayName.length < 2 || displayName.length > 40)) {
    return { ok: false as const, message: "Display name must be between 2 and 40 characters." };
  }
  if (firstName.length < 2 || firstName.length > 40 || surname.length < 2 || surname.length > 40) {
    return { ok: false as const, message: "First name and surname must be between 2 and 40 characters." };
  }
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return {
      ok: false as const,
      message: "Username must be 3-24 chars and use only lowercase letters, numbers, and underscores.",
    };
  }
  if (!Number.isFinite(input.age) || input.age < 18 || input.age > 99) {
    return { ok: false as const, message: "Age must be between 18 and 99." };
  }
  if (city.length < 2 || city.length > 64) {
    return { ok: false as const, message: "City must be between 2 and 64 characters." };
  }
  if (!isStrongPassword(password)) {
    return {
      ok: false as const,
      message: "Password must include uppercase, lowercase, number, and symbol (8+ chars).",
    };
  }
  if (description && (description.length < 12 || description.length > 500)) {
    return {
      ok: false as const,
      message: "Description must be between 12 and 500 characters.",
    };
  }
  if (hasFicaSubmission) {
    if (!input.ficaConsent) {
      return {
        ok: false as const,
        message: "FICA consent is required before submitting verification documents.",
      };
    }
    if (!ficaLegalName || ficaLegalName.length < 4) {
      return { ok: false as const, message: "FICA legal name is required." };
    }
    if (!ficaIdNumber || ficaIdNumber.length < 6) {
      return { ok: false as const, message: "FICA ID number is required." };
    }
    if (!ficaDocumentUrl || (!/^https?:\/\//.test(ficaDocumentUrl) && !/^\/uploads\//.test(ficaDocumentUrl))) {
      return {
        ok: false as const,
        message: "FICA document upload is required.",
      };
    }
  }
  if (profilePictureUrl && !/^https?:\/\//.test(profilePictureUrl)) {
    return {
      ok: false as const,
      message: "Profile picture must be a valid URL (http or https).",
    };
  }
  if (savedPics.some((url) => !/^https?:\/\//.test(url))) {
    return { ok: false as const, message: "Saved pictures must be valid URLs." };
  }
  if (savedVideos.some((url) => !/^https?:\/\//.test(url))) {
    return { ok: false as const, message: "Saved videos must be valid URLs." };
  }

  const users = await readUsers();
  if (!username) {
    const base = (displayName || email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 16);
    username = `${base || "user"}_${String(Date.now()).slice(-4)}`;
  }
  if (users.some((user) => user.email === email)) {
    return { ok: false as const, message: "An account with this email already exists." };
  }
  if (phone && users.some((user) => user.phone === phone)) {
    return { ok: false as const, message: "An account with this phone already exists." };
  }
  if (users.some((user) => user.username === username)) {
    return { ok: false as const, message: "This username is already taken." };
  }

  const normalizedDisplayName = displayName || `${firstName} ${surname}`.trim();
  const resolvedLookingFor = lookingFor.length ? lookingFor : ["Dating"];
  const resolvedDescription = description || "New member. Completing profile setup.";

  const salt = randomUUID();
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: `acct-${randomUUID()}`,
    email,
    phone,
    isPhoneVerified: Boolean(phone),
    accountStatus: "pending_verification",
    onboardingStep: "account_created",
    displayName: normalizedDisplayName,
    firstName,
    surname,
    username,
    role: input.role,
    age: input.age,
    city,
    gender,
    lookingFor: resolvedLookingFor,
    interestedInHookups: Boolean(input.interestedInHookups),
    profilePictureUrl,
    photoModerationStatus: profilePictureUrl ? "pending" : "none",
    description: resolvedDescription,
    nicheTags,
    fica: {
      status: hasFicaSubmission ? "submitted" : "pending",
      legalNameEncrypted: ficaLegalName ? encryptSensitive(ficaLegalName) : undefined,
      idNumberEncrypted: ficaIdNumber ? encryptSensitive(ficaIdNumber) : undefined,
      documentUrl: ficaDocumentUrl,
      submittedAt: hasFicaSubmission ? now : null,
    },
    savedPics,
    savedVideos,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: now,
    lastPasswordChangeAt: now,
    twoFactorEnabled: false,
    backupCodesHashes: [],
    readMarkers: {},
    ageVerified: false,
    ageVerifiedAt: null,
    createdAt: now,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
  };

  users.push(user);
  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(user) };
}

export async function loginUser(input: {
  email: string;
  password: string;
  role: AccountRole;
  otpCode?: string;
}) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const users = await readUsers();
  const user = users.find((item) => item.email === email);

  if (!user) {
    return { ok: false as const, message: "No account found for this email." };
  }
  if (user.role !== input.role) {
    return {
      ok: false as const,
      message:
        user.role === "model"
          ? "This email is a model account. Switch to model login."
          : "This email is a user account. Switch to user login.",
    };
  }

  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    return {
      ok: false as const,
      message: "Too many failed attempts. Account is temporarily locked.",
    };
  }

  const currentFailedCount = user.failedLoginCount ?? 0;

  const attemptedHash = hashPassword(password, user.passwordSalt);
  const attemptedBuffer = Buffer.from(attemptedHash, "hex");
  const expectedBuffer = Buffer.from(user.passwordHash, "hex");
  const isValid =
    attemptedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(attemptedBuffer, expectedBuffer);

  if (!isValid) {
    const nextFailedCount = currentFailedCount + 1;
    const lockedUntil =
      nextFailedCount >= MAX_LOGIN_FAILURES
        ? new Date(Date.now() + LOGIN_LOCK_MS).toISOString()
        : null;
    users[indexOfUser(users, user)] = {
      ...user,
      failedLoginCount: nextFailedCount,
      lockedUntil,
    };
    await writeUsers(users);
    return { ok: false as const, message: "Incorrect password." };
  }

  if (user.role === "model" && !user.twoFactorEnabled) {
    return {
      ok: false as const,
      message: "Model accounts must enable 2FA in Profile > Security before signing in again.",
    };
  }

  if (user.twoFactorEnabled) {
    const encryptedSecret = user.twoFactorSecretEncrypted;
    if (!encryptedSecret) {
      return { ok: false as const, message: "Two-factor setup is corrupted. Contact support." };
    }
    let secret = "";
    try {
      secret = decryptSensitive(encryptedSecret);
    } catch {
      return { ok: false as const, message: "Two-factor setup is invalid. Contact support." };
    }
    const otpValid = verifyTotp(secret, input.otpCode ?? "");
    const backupCodesHashes = user.backupCodesHashes ?? [];
    const backupHash = hashBackupCode(input.otpCode ?? "");
    const backupIndex = backupCodesHashes.findIndex((item) => item === backupHash);

    if (!otpValid && backupIndex === -1) {
      return { ok: false as const, message: "Invalid 2FA or backup code." };
    }

    if (backupIndex !== -1) {
      const updatedCodes = backupCodesHashes.filter((_, index) => index !== backupIndex);
      users[indexOfUser(users, user)] = {
        ...users[indexOfUser(users, user)],
        backupCodesHashes: updatedCodes,
      };
      await writeUsers(users);
    }
  }

  const now = new Date().toISOString();
  users[indexOfUser(users, user)] = {
    ...user,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: now,
  };
  await writeUsers(users);

  return { ok: true as const, user: sanitizeUser(users[indexOfUser(users, user)]) };
}

export async function getUserByPhone(phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  if (!phone) {
    return { ok: false as const, message: "Phone number required." };
  }
  const users = await readUsers();
  const user = users.find((item) => item.phone === phone);
  if (!user) {
    return { ok: false as const, message: "No phone account." };
  }
  return { ok: true as const, user: sanitizeUser(user) };
}

export async function createPhoneUser(phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  if (!phone || !/^\+\d{8,15}$/.test(phone)) {
    return { ok: false as const, message: "Invalid phone number." };
  }

  const users = await readUsers();
  const existing = users.find((item) => item.phone === phone);
  if (existing) {
    return { ok: true as const, user: sanitizeUser(existing) };
  }

  const now = new Date().toISOString();
  const suffix = phone.slice(-4);
  const salt = randomUUID();
  const generatedPassword = randomUUID();
  const user: StoredUser = {
    id: `acct-${randomUUID()}`,
    email: `${suffix}.${Date.now()}@phone.local`,
    phone,
    isPhoneVerified: true,
    accountStatus: "pending_verification",
    onboardingStep: "account_created",
    displayName: `User ${suffix}`,
    firstName: "Hooked",
    surname: "Member",
    username: `user_${suffix}_${String(Date.now()).slice(-4)}`,
    role: "user",
    age: 18,
    city: "Unknown",
    gender: "Undisclosed",
    lookingFor: ["Dating"],
    interestedInHookups: false,
    profilePictureUrl: "",
    photoModerationStatus: "none",
    description: "New account created via phone login.",
    nicheTags: [],
    fica: {
      status: "pending",
      documentUrl: "",
      submittedAt: null,
    },
    savedPics: [],
    savedVideos: [],
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: now,
    lastPasswordChangeAt: null,
    twoFactorEnabled: false,
    backupCodesHashes: [],
    readMarkers: {},
    ageVerified: false,
    ageVerifiedAt: null,
    createdAt: now,
    passwordSalt: salt,
    passwordHash: hashPassword(generatedPassword, salt),
  };

  users.push(user);
  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(user) };
}

export async function getOrCreateEmailMagicUser(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, message: "Invalid email address." };
  }

  const users = await readUsers();
  const existing = users.find((item) => item.email === email);
  if (existing) {
    return { ok: true as const, created: false as const, user: sanitizeUser(existing) };
  }

  const localPart = email.split("@")[0] ?? "member";
  const base = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 16) || "member";
  const now = new Date().toISOString();
  const salt = randomUUID();
  const generatedPassword = randomUUID();

  const user: StoredUser = {
    id: `acct-${randomUUID()}`,
    email,
    isPhoneVerified: false,
    accountStatus: "pending_verification",
    onboardingStep: "account_created",
    displayName: localPart.slice(0, 30) || "New Member",
    firstName: "Hooked",
    surname: "Member",
    username: `${base}_${String(Date.now()).slice(-4)}`,
    role: "user",
    age: 18,
    city: "Unknown",
    gender: "Undisclosed",
    lookingFor: ["Dating"],
    interestedInHookups: false,
    profilePictureUrl: "",
    photoModerationStatus: "none",
    description: "New account created via magic link.",
    nicheTags: [],
    fica: {
      status: "pending",
      documentUrl: "",
      submittedAt: null,
    },
    savedPics: [],
    savedVideos: [],
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: now,
    lastPasswordChangeAt: null,
    twoFactorEnabled: false,
    backupCodesHashes: [],
    readMarkers: {},
    ageVerified: false,
    ageVerifiedAt: null,
    createdAt: now,
    passwordSalt: salt,
    passwordHash: hashPassword(generatedPassword, salt),
  };

  users.push(user);
  await writeUsers(users);
  return { ok: true as const, created: true as const, user: sanitizeUser(user) };
}

export async function markUserAgeVerified(accountId: string) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    ageVerified: true,
    ageVerifiedAt: now,
    onboardingStep: users[index].onboardingStep === "account_created" ? "age_confirmed" : users[index].onboardingStep,
  };
  users[index].accountStatus = resolveAccountStatus(users[index]);
  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function updateBasicProfileForAccount(input: {
  accountId: string;
  displayName: string;
  gender: string;
  lookingFor: string[];
  city: string;
  profilePictureUrl: string;
}) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const displayName = input.displayName.trim();
  if (!displayName || displayName.length < 2 || displayName.length > 40) {
    return { ok: false as const, message: "Display name must be between 2 and 40 characters." };
  }

  const gender = input.gender.trim();
  const city = input.city.trim();
  const profilePictureUrl = input.profilePictureUrl.trim();
  const lookingFor = input.lookingFor.map((item) => item.trim()).filter(Boolean);

  const nextStep = profilePictureUrl ? "photo_added" : "profile_basic";
  const nextPhotoStatus = profilePictureUrl ? "pending" : users[index].photoModerationStatus ?? "none";
  users[index] = {
    ...users[index],
    displayName,
    gender: gender || users[index].gender,
    city: city || users[index].city,
    profilePictureUrl: profilePictureUrl || users[index].profilePictureUrl,
    lookingFor: lookingFor.length ? lookingFor : users[index].lookingFor,
    onboardingStep: nextStep,
    accountStatus: users[index].accountStatus === "pending_verification" ? "limited" : users[index].accountStatus,
    photoModerationStatus: nextPhotoStatus,
  };

  await writeUsers(users);
  return { ok: true as const, onboardingStep: nextStep, user: sanitizeUser(users[index]) };
}

export async function listUsersForModeration() {
  const users = await readUsers();
  const items = users
    .map((user) => sanitizeUser(user))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ok: true as const, items };
}

export async function updateUserFicaStatus(input: {
  accountId: string;
  status: FicaStatus;
}) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  users[index] = {
    ...users[index],
    fica: {
      ...users[index].fica,
      status: input.status,
    },
  };

  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function updateUserClassification(input: {
  accountId: string;
  nicheTags: string[];
  description: string;
}) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const nicheTags = input.nicheTags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const description = input.description.trim().slice(0, 500);
  if (!description || description.length < 12) {
    return { ok: false as const, message: "Description must be at least 12 characters." };
  }

  users[index] = {
    ...users[index],
    nicheTags,
    description,
  };

  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function unlockUserAccount(accountId: string) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  users[index] = {
    ...users[index],
    failedLoginCount: 0,
    lockedUntil: null,
  };
  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function submitFicaForUser(input: {
  accountId: string;
  legalName: string;
  idNumber: string;
  documentUrl: string;
  consent: boolean;
}) {
  const legalName = input.legalName.trim();
  const idNumber = input.idNumber.trim();
  const documentUrl = input.documentUrl.trim();

  if (!input.consent) {
    return { ok: false as const, message: "FICA consent is required." };
  }
  if (!legalName || legalName.length < 4) {
    return { ok: false as const, message: "Legal name is required." };
  }
  if (!idNumber || idNumber.length < 6) {
    return { ok: false as const, message: "ID or passport number is required." };
  }
  if (!documentUrl || (!/^https?:\/\//.test(documentUrl) && !/^\/uploads\//.test(documentUrl))) {
    return { ok: false as const, message: "Uploaded document URL is required." };
  }

  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  users[index] = {
    ...users[index],
    fica: {
      ...users[index].fica,
      status: "submitted",
      legalNameEncrypted: encryptSensitive(legalName),
      idNumberEncrypted: encryptSensitive(idNumber),
      documentUrl,
      submittedAt: new Date().toISOString(),
    },
  };

  users[index].accountStatus = resolveAccountStatus(users[index]);

  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function changeUserPassword(input: {
  accountId: string;
  currentPassword: string;
  nextPassword: string;
}) {
  const currentPassword = input.currentPassword.trim();
  const nextPassword = input.nextPassword.trim();

  if (!currentPassword || !nextPassword) {
    return { ok: false as const, message: "Current and new password are required." };
  }
  if (!isStrongPassword(nextPassword)) {
    return {
      ok: false as const,
      message: "New password must include uppercase, lowercase, number, and symbol (8+ chars).",
    };
  }
  if (currentPassword === nextPassword) {
    return { ok: false as const, message: "New password must be different." };
  }

  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const user = users[index];
  const currentHash = hashPassword(currentPassword, user.passwordSalt);
  const currentBuffer = Buffer.from(currentHash, "hex");
  const expectedBuffer = Buffer.from(user.passwordHash, "hex");
  const matches =
    currentBuffer.length === expectedBuffer.length && timingSafeEqual(currentBuffer, expectedBuffer);

  if (!matches) {
    return { ok: false as const, message: "Current password is incorrect." };
  }

  const nextSalt = randomUUID();
  users[index] = {
    ...user,
    passwordSalt: nextSalt,
    passwordHash: hashPassword(nextPassword, nextSalt),
    lastPasswordChangeAt: new Date().toISOString(),
    failedLoginCount: 0,
    lockedUntil: null,
  };

  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function listPublicCreators(limit = 30) {
  const users = await readUsers();
  return users
    .filter((user) => {
      if (user.role !== "model") {
        return false;
      }
      if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
        return false;
      }
      return user.photoModerationStatus === "approved";
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(200, limit)))
    .map((user) => sanitizeUser(user))
    .map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      city: user.city,
      profilePictureUrl: user.profilePictureUrl || "/profile-default.svg",
      interestedInHookups: user.interestedInHookups,
      nicheTags: user.nicheTags,
      lookingFor: user.lookingFor,
      createdAt: user.createdAt,
    }));
}

export async function getSecuritySnapshotForAccount(accountId: string) {
  const users = await readUsers();
  const user = users.find((item) => item.id === accountId);
  if (!user) {
    return { ok: false as const, message: "Account not found." };
  }

  return {
    ok: true as const,
    security: {
      accountId: user.id,
      ageVerified: user.ageVerified,
      ficaStatus: user.fica.status,
      twoFactorEnabled: user.twoFactorEnabled,
      backupCodesRemaining: (user.backupCodesHashes ?? []).length,
      failedLoginCount: user.failedLoginCount,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
      lastPasswordChangeAt: user.lastPasswordChangeAt,
      accountStatus: user.accountStatus ?? "pending_verification",
      onboardingStep: user.onboardingStep ?? "account_created",
      photoModerationStatus: user.photoModerationStatus ?? "none",
    },
  };
}

export async function getAccountProfileForAuthorization(accountId: string) {
  const users = await readUsers();
  const user = users.find((item) => item.id === accountId);
  if (!user) {
    return { ok: false as const, message: "Account not found." };
  }

  return {
    ok: true as const,
    profile: {
      accountId: user.id,
      role: user.role,
      ageVerified: user.ageVerified,
      ficaStatus: user.fica.status,
    },
  };
}

export async function updatePhotoModerationStatus(input: {
  accountId: string;
  status: "none" | "pending" | "approved" | "rejected";
}) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  users[index] = {
    ...users[index],
    photoModerationStatus: input.status,
  };
  users[index].accountStatus = resolveAccountStatus(users[index]);

  await writeUsers(users);
  return { ok: true as const, user: sanitizeUser(users[index]) };
}

export async function getDashboardSnapshotForAccount(accountId: string) {
  const users = await readUsers();
  const user = users.find((item) => item.id === accountId);
  if (!user) {
    return { ok: false as const, message: "Account not found." };
  }

  const userForView = sanitizeUser(user);
  const suggestions = users
    .filter((item) => item.id !== accountId)
    .filter((item) => item.role === "model")
    .filter((item) => item.photoModerationStatus === "approved")
    .slice(0, 8)
    .map((item) => sanitizeUser(item))
    .map((item) => ({
      id: item.id,
      displayName: item.displayName,
      city: item.city,
      profilePictureUrl: item.profilePictureUrl || "/profile-default.svg",
      verified: item.ageVerified,
      interests: item.lookingFor.slice(0, 3),
    }));

  const profileChecks = [
    Boolean(userForView.displayName?.trim()),
    Boolean(userForView.city?.trim() && userForView.city !== "Unknown"),
    Boolean(userForView.description?.trim() && userForView.description !== "New member. Completing profile setup."),
    Boolean(userForView.lookingFor?.length),
    Boolean(userForView.profilePictureUrl),
    userForView.photoModerationStatus === "approved",
    Boolean(userForView.ageVerified),
    userForView.fica.status === "verified",
  ];
  const profileCompletion = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);

  return {
    ok: true as const,
    dashboard: {
      user: {
        id: userForView.id,
        displayName: userForView.displayName,
        avatar: userForView.profilePictureUrl || "/profile-default.svg",
        profileCompletion,
      },
      stats: {
        newLikes: 0,
        newMatches: 0,
        unreadMessages: 0,
        profileViews: 0,
      },
      suggestions,
      recentMatches: [] as Array<{ id: string; displayName: string; createdAt: string }>,
      recentMessages: [] as Array<{ id: string; displayName: string; body: string; createdAt: string }>,
      verification: {
        phone: Boolean(userForView.phone && userForView.isPhoneVerified),
        email: Boolean(userForView.email),
        age: userForView.ageVerified,
        fica: userForView.fica.status,
        photo: userForView.photoModerationStatus ?? "none",
      },
      privacy: {
        incognito: false,
        showDistance: true,
        showOnlineStatus: true,
      },
      subscription: {
        plan: "free",
      },
      status: {
        accountStatus: userForView.accountStatus ?? "pending_verification",
        onboardingStep: userForView.onboardingStep ?? "account_created",
      },
    },
  };
}

export async function setTwoFactorEnabled(input: { accountId: string; enabled: boolean }) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  users[index] = {
    ...users[index],
    twoFactorEnabled: input.enabled,
  };
  await writeUsers(users);

  return {
    ok: true as const,
    twoFactorEnabled: users[index].twoFactorEnabled,
  };
}

export async function beginTwoFactorSetup(accountId: string) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const user = users[index];
  const secret = base32Encode(randomBytes(20));
  users[index] = {
    ...user,
    twoFactorPendingSecretEncrypted: encryptSensitive(secret),
  };
  await writeUsers(users);

  const issuer = encodeURIComponent("Hookchat");
  const label = encodeURIComponent(`${user.email}`);
  const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  return { ok: true as const, secret, otpauthUrl };
}

export async function completeTwoFactorSetup(accountId: string, code: string) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const pendingEncrypted = users[index].twoFactorPendingSecretEncrypted;
  if (!pendingEncrypted) {
    return { ok: false as const, message: "Start 2FA setup first." };
  }

  let secret = "";
  try {
    secret = decryptSensitive(pendingEncrypted);
  } catch {
    return { ok: false as const, message: "Pending 2FA secret is invalid." };
  }

  if (!verifyTotp(secret, code)) {
    return { ok: false as const, message: "Invalid verification code." };
  }

  users[index] = {
    ...users[index],
    twoFactorEnabled: true,
    twoFactorSecretEncrypted: encryptSensitive(secret),
    twoFactorPendingSecretEncrypted: undefined,
    backupCodesHashes: users[index].backupCodesHashes ?? [],
  };
  await writeUsers(users);
  return { ok: true as const };
}

export async function disableTwoFactor(accountId: string) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  users[index] = {
    ...users[index],
    twoFactorEnabled: false,
    twoFactorSecretEncrypted: undefined,
    twoFactorPendingSecretEncrypted: undefined,
    backupCodesHashes: [],
  };
  await writeUsers(users);
  return { ok: true as const };
}

export async function generateBackupCodes(accountId: string) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const user = users[index];
  if (!user.twoFactorEnabled) {
    return { ok: false as const, message: "Enable 2FA before generating backup codes." };
  }

  const codes = Array.from({ length: 8 }, () => generateBackupCode());
  users[index] = {
    ...user,
    backupCodesHashes: codes.map((code) => hashBackupCode(code)),
  };
  await writeUsers(users);

  return { ok: true as const, codes };
}

export async function getReadMarkersForAccount(accountId: string) {
  const users = await readUsers();
  const user = users.find((item) => item.id === accountId);
  if (!user) {
    return { ok: false as const, message: "Account not found." };
  }

  return { ok: true as const, readMarkers: user.readMarkers ?? {} };
}

export async function setReadMarkerForAccount(input: {
  accountId: string;
  matchId: string;
  readAt?: string;
}) {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === input.accountId);
  if (index === -1) {
    return { ok: false as const, message: "Account not found." };
  }

  const matchId = input.matchId.trim();
  if (!matchId) {
    return { ok: false as const, message: "matchId is required." };
  }

  const readAt = input.readAt?.trim() || new Date().toISOString();
  if (Number.isNaN(new Date(readAt).getTime())) {
    return { ok: false as const, message: "Invalid readAt timestamp." };
  }

  const current = users[index].readMarkers ?? {};
  const existing = current[matchId] ?? "";
  if (existing >= readAt) {
    return { ok: true as const, readAt: existing, idempotent: true as const };
  }

  users[index] = {
    ...users[index],
    readMarkers: {
      ...current,
      [matchId]: readAt,
    },
  };
  await writeUsers(users);

  return { ok: true as const, readAt, idempotent: false as const };
}

function indexOfUser(users: StoredUser[], user: StoredUser) {
  return users.findIndex((item) => item.id === user.id);
}
