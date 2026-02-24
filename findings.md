# TypeScript Build Errors - Type System Analysis

## Key Findings

### 1. Token Type Issue (CRITICAL)
**File**: `src/store/modules/token.ts`
**Problem**: Token is typed as `unknown` instead of `TokenInfo`
**Impact**: 
- Line 84 in `src/utils/request.ts`: `token.refreshToken` - property access on unknown type
- Line 106 in `src/utils/request.ts`: `token.accessToken` - property access on unknown type
- Line 154 in `src/api/v1/scene-package.ts`: `token.accessToken` - property access on unknown type

**Solution**: Define proper `TokenInfo` type in token.ts
```typescript
import type { TokenInfo } from "@/api/v1/types/auth";

function getToken(): TokenInfo | null {
  // ... implementation
}

function setToken(token: TokenInfo) {
  // ... implementation
}
```

### 2. ViewContainer Items Type (CRITICAL)
**File**: `src/components/StandardPage/ViewContainer.vue`
**Problem**: `items` prop is typed as `T[] | null` but used as `unknown[]` in template
**Root Cause**: `ViewContainerProps<T = unknown>` defaults to `unknown` type
**Impact**: Type safety lost when using the component

**Solution**: Keep generic type parameter and ensure proper typing at usage sites

### 3. FetchResponse Pattern (MULTIPLE DEFINITIONS)
**Files**: 
- `src/composables/usePageData.ts` - defines `FetchResponse<T>`
- `src/components/MrPP/CardListPage/types.ts` - defines `FetchResponse<T>`

**Problem**: Duplicate type definitions across codebase
**Solution**: Create single source of truth in `src/types/api.ts`

### 4. CardInfo Type Definition
**File**: `src/utils/types.ts`
**Status**: ✅ Well-defined
**Structure**:
```typescript
export type CardInfo = {
  id: number;
  image: { id?: number; url: string } | null;
  type: string;
  created_at: string;
  name: string;
  context: unknown;
  enabled: boolean;
};
```

### 5. TabItem Type Definition
**File**: `src/types/news.ts`
**Status**: ✅ Well-defined
**Structure**:
```typescript
export interface TabItem {
  label: string;
  type: "document" | "category";
  id: number;
}
```

### 6. ViewContainerProps Type Definition
**File**: `src/components/StandardPage/types.ts`
**Status**: ✅ Well-defined with generic
**Structure**:
```typescript
export interface ViewContainerProps<T = unknown> {
  items: T[] | null;
  viewMode: ViewMode;
  loading?: boolean;
  showEmpty?: boolean;
  emptyText?: string;
  cardWidth?: number;
  cardGutter?: number;
  breakpoints?: Record<number, { rowPerView: number }>;
}
```

### 7. VerseData Type Definition
**File**: `src/api/v1/types/verse.ts`
**Status**: ✅ Well-defined
**Key Properties**:
- `id: number`
- `name: string`
- `data: JsonValue`
- `metas?: MetaInfo[]`
- `verseCode?: VerseCode | null`

### 8. TokenInfo Type Definition
**File**: `src/api/v1/types/auth.ts`
**Status**: ✅ Well-defined
**Structure**:
```typescript
export interface TokenInfo {
  token: string;
  accessToken: string;
  refreshToken: string;
  expires: string;
  tokenType?: string;
}
```

## Type System Patterns

### Pattern 1: Generic List Components
```typescript
// ViewContainerProps uses generic T
export interface ViewContainerProps<T = unknown> {
  items: T[] | null;
  // ...
}

// Usage should specify type:
// <ViewContainer :items="cardList" /> where cardList: CardInfo[]
```

### Pattern 2: API Response Wrapper
```typescript
export interface FetchResponse<T = unknown> {
  data: T[];
  headers: Record<string, PaginationHeaderValue>;
}

// Usage:
const response = await fetchFn(params); // FetchResponse<CardInfo>
```

### Pattern 3: Token Management
```typescript
// Should be:
function getToken(): TokenInfo | null
function setToken(token: TokenInfo): void

// NOT:
function getToken(): unknown | null
function setToken(token: unknown): void
```

## Recommended Fixes (Priority Order)

1. **HIGH**: Fix `src/store/modules/token.ts` - use `TokenInfo` type
2. **HIGH**: Consolidate `FetchResponse` definitions
3. **MEDIUM**: Add proper type annotations at component usage sites
4. **MEDIUM**: Review `src/types/verse.ts` - `metas: unknown[]` should be `MetaInfo[]`
5. **LOW**: Clean up `as unknown` casts in non-critical files

## Files to Update

- `src/store/modules/token.ts` - Add TokenInfo import and type annotations
- `src/types/api.ts` - Create centralized FetchResponse definition
- `src/types/verse.ts` - Fix metas type from unknown[] to MetaInfo[]
- `src/composables/usePageData.ts` - Import FetchResponse from centralized location
- `src/components/MrPP/CardListPage/types.ts` - Import FetchResponse from centralized location
