# Database Schema — Inspire Genius

This document describes the data entities as understood from the frontend TypeScript types and API service layer. The backend database may have additional fields; this reflects what the frontend consumes.

---

## Core Entities

### User (AuthUser)
| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| email | string | Unique |
| name | string? | Display name |
| fullName | string? | Full name |
| role | string | `"user"` or `"super-admin"` |
| isOnboardingCompleted | boolean | Whether user finished onboarding |
| token | string? | Access token (client-side only) |

### LoginDataPayload (Auth Response)
| Field | Type | Notes |
|---|---|---|
| session | string? | Session identifier |
| access_token | string? | JWT access token |
| refresh_token | string? | JWT refresh token |
| id_token | string? | Identity token |
| token_type | string? | e.g. "Bearer" |
| user_id | string? | User UUID |
| email | string? | User email |
| full_name | string? | User full name |
| role | string? | User role |
| has_profile | boolean? | Whether profile exists |
| is_onboarded | boolean/string? | Onboarding status |
| organization_id | string? | FK → Organization |
| business_id | string? | FK → Business |
| mfa_required | boolean? | Whether MFA is required |
| next_step | string? | Auth flow next step (`verify_mfa`, `create_profile`, `verify_email`, `resend_otp`) |

### UserRow (Admin User Management)
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | Display name |
| email | string | Email |
| first_name | string? | First name |
| last_name | string? | Last name |
| status | enum | `"Active"`, `"Deactivated"`, `"Awaiting"` |
| invitation_id | string? | FK → Invitation |
| invitation_status | string | Invitation state |

### ProfileData (User Settings)
| Field | Type | Notes |
|---|---|---|
| firstName | string | |
| lastName | string | |
| email | string | |
| dateOfBirth | string | Date string |
| category | string | User category |
| role | string | User role |
| additionalInfo | string? | Bio/about text |
| passwordChangeAllowed | boolean? | Whether password change is enabled |

---

## Organization & Team

### Organization (OrganizationFormData)
| Field | Type | Notes |
|---|---|---|
| organization_id | string? | Primary key (set after creation) |
| organization_name | string | Name |
| type | string | Organization type |
| email | string | Contact email |
| contact | string | Contact number |
| website_url | string | Website URL |
| address | string | Address |
| logo | File? | Logo image |
| coaches | CoachInfo[] | Assigned coaches |
| license_type | string | License type |
| license_key | string | License key |
| license_start_date | string? | License start |
| license_end_date | string? | License expiry |

### OrganizationRow (Admin List View)
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | Organization name |
| type | string | Organization type |
| status | enum | `"Active"`, `"Deactivated"` |
| admin_is_active | boolean | Whether admin account is active |

### CoachInfo (Organization Coach Assignment)
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| agentId | string | FK → Agent |
| toneIds | string[] | FK → Tone[] |
| accentId | string | FK → Accent |
| genderId | string | FK → Gender |

---

## Documents

### DocItem
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | File name |
| kind | enum | `"pdf"`, `"csv"`, `"ppt"`, `"doc"` |
| createdAt | Date | Upload date |
| url | string | Download/view URL |

---

## Chat & Conversations

### ChatMessage
| Field | Type | Notes |
|---|---|---|
| id | string | Message ID |
| kind | enum | `"text"`, `"doc"`, `"processing"` |
| sender | enum | `"assistant"`, `"user"` |
| text | string? | Message text (for text kind) |
| docName | string? | Document name (for doc kind) |
| docKind | DocKind? | Document type (for doc kind) |
| time | string | Timestamp |

### HistoryItem (Conversation History)
| Field | Type | Notes |
|---|---|---|
| id | string | Conversation ID |
| title | string | Conversation title |
| preview | string | Last message preview |
| timeLabel | string | Relative time label |

---

## Help & Support

### HelpFormValues (Issue Submission)
| Field | Type | Notes |
|---|---|---|
| issueTypeId | string | FK → IssueType |
| subject | string | Issue subject |
| description | string | Issue description |
| priority | enum | `"low"`, `"medium"`, `"high"`, `"critical"` |
| attachments | File[] | Attached files |

### IssueType
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | Type name |

---

## Dashboard Analytics (Admin)

### ChartDatum (Avg Time Spent)
| Field | Type | Notes |
|---|---|---|
| orgName | string | Organization name |
| hours | number | Hours spent |

### CoachUsageData
| Field | Type | Notes |
|---|---|---|
| month | string | Month label |
| desktop | number | Desktop sessions |
| mobile | number | Mobile sessions |

### DocumentUploadData
| Field | Type | Notes |
|---|---|---|
| browser | string | Browser name |
| Uploads | number | Upload count |
| color | string | Chart color |

---

## API Envelope

All API responses are wrapped in:

```typescript
type BaseApiResponse<T> = {
  status?: boolean
  success?: boolean
  message?: string
  error_status?: { code?: string; description?: string }
  data?: T
}
```

## Environment Variables

| Variable | Purpose |
|---|---|
| VITE_API_BASE_URL | Backend API base URL |
| VITE_ALEX_WEBSOCKET_URL | Alex voice assistant WebSocket URL |
| VITE_AGENTS_WEBSOCKET_BASE_URL | Agent WebSocket base URL |
| VITE_STORAGE_SECRET | Encryption key for secure storage |
