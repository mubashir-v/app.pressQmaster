# Organization settings — API contract (v1)

Contract for the **org settings** page against `api.pressQmaster` under `/v1`. Matches the current server implementation.

## Base URL and headers

- **JSON prefix:** `/v1`
- **Authentication (required):**

  ```http
  Authorization: Bearer <Firebase ID token>
  ```

- **Active organization (required for org-scoped routes below):**

  ```http
  X-Organization-Id: <organizationId>
  ```

  Header name is case-insensitive (e.g. `X-Organization-Id` is fine).

- **JSON bodies:** `Content-Type: application/json` where applicable.

---

## Shared types

### Organization address

Stored as a single subdocument; response may be `null` if unset.

```ts
type OrganizationAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};
```

### Organization (API shape)

```ts
type Organization = {
  id: string;
  name: string;
  slug: string | null;
  isActive: boolean;
  address: OrganizationAddress | null;
};
```

### Membership (inside session)

```ts
type MembershipWithOrganization = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  slug: string | null;
  isActive: boolean;
  address: OrganizationAddress | null;
  role: "OWNER" | "MANAGER" | "MEMBER";
  scopes: string[];
};
```

---

## 1. Load settings data — `GET /v1/current_user`

Use to populate the org settings form: find the entry in `organizations` where `organizationId` matches the active org.

### Request

- **Headers:** `Authorization: Bearer <token>`

### Response `200`

See `API.md` for full session shape. Relevant fields:

- `organizations[]` — each item is a `MembershipWithOrganization` (includes `isActive`, `address`, `role`).

**UI rule:** Only users with `role === "OWNER"` may call `PATCH /v1/organization` for that org.

### Response `401`

Same as `API.md` (`UNAUTHENTICATED`, `INVALID_OR_EXPIRED_TOKEN`).

---

## 2. Scopes (optional gating) — `GET /v1/organization/scopes`

### Request

- **Headers:** `Authorization`, `X-Organization-Id`

### Response `200`

```json
{
  "organizationId": "<id>",
  "scopes": ["all_scope"]
}
```

### Error responses (JSON `code`)

| HTTP | `code` | When |
|------|--------|------|
| 400 | `MISSING_ORGANIZATION_ID` | `X-Organization-Id` missing |
| 400 | `INVALID_ORGANIZATION_ID` | Not a valid Mongo ObjectId string |
| 404 | `ORGANIZATION_NOT_FOUND` | Organization does not exist |
| 403 | `ORGANIZATION_INACTIVE` | Organization exists but `isActive === false` (blocks **all** users for this org-context call) |
| 403 | `NOT_ORGANIZATION_MEMBER` | User is not a member |

### Note on deactivated orgs

For **`isActive === false`**, org-context endpoints that enforce activation (such as this one) return **`ORGANIZATION_INACTIVE`**.

**Exception:** `PATCH /v1/organization` still works for the **owner**, so they can set `"isActive": true` and reactivate.

---

## 3. Save org settings (owner only) — `PATCH /v1/organization`

Updates `name`, `isActive`, and/or `address` for the org identified by **`X-Organization-Id`**. **Only `OWNER`** may call this route.

### Request

- **Headers:** `Authorization`, `X-Organization-Id`
- **Body:** JSON with **at least one** of: `name`, `isActive`, or `address` (the `address` key must be present if you intend to update or clear address; value may be `null`).

| Field | Type | Rules |
|-------|------|--------|
| `name` | string | Optional; if set: length 1–200 |
| `isActive` | boolean | Optional |
| `address` | object \| `null` | Optional; `null` clears stored address |

When `address` is an object, fields are optional with max lengths:

| Field | Max length |
|-------|------------|
| `line1`, `line2` | 200 |
| `city`, `region`, `country` | 120 |
| `postalCode` | 32 |

**Address replace semantics:** The server **replaces** the stored `address` with the normalized object built from the request (only non-empty string fields you send are kept). Omitted keys are **not** merged with the previous document on the server. For partial edits, **merge on the client** with the current `address` from `GET /v1/current_user`, then send the full object you want stored.

### Response `200`

```json
{
  "code": "ORGANIZATION_UPDATED",
  "organization": {
    "id": "<id>",
    "name": "…",
    "slug": "<string or null>",
    "isActive": true,
    "address": null
  }
}
```

### Error responses

| HTTP | `code` | When |
|------|--------|------|
| 400 | `VALIDATION_ERROR` | Body failed validation (`issues`: Zod `flatten()`) |
| 400 | `MISSING_ORGANIZATION_ID` | Header missing |
| 400 | `INVALID_ORGANIZATION_ID` | Invalid id format |
| 403 | `FORBIDDEN_NOT_OWNER` | Authenticated user is not `OWNER` |
| 404 | `ORGANIZATION_NOT_FOUND` | Organization not found |
| 401 | `UNAUTHENTICATED` / `INVALID_OR_EXPIRED_TOKEN` | Bad or missing token |

**Slug:** Not updated by this route; there is no org-settings endpoint for changing `slug` in the current API.

---

## 4. Frontend checklist

1. After sign-in, call **`GET /v1/current_user`** and resolve the active org in `organizations[]`.
2. Bind the form from `organizationName`, `isActive`, `address`, and `role`.
3. If **`role !== "OWNER"`**, disable save or hide edit controls for these fields.
4. On save, **`PATCH /v1/organization`** with `X-Organization-Id` and a body that includes at least one allowed field; merge `address` on the client before sending if you are doing a partial address edit.
5. If the org is deactivated, expect **`ORGANIZATION_INACTIVE`** on org-context reads like **`GET /v1/organization/scopes`** until an owner reactivates via **`PATCH`** with `"isActive": true`.
6. Ensure the browser client sends **`X-Organization-Id`** on cross-origin requests (server CORS allows this header).

---