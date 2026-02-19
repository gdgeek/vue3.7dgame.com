# Scene (Verse) Export/Import Feature Feasibility Analysis

## Executive Summary
The project has a well-structured API layer for managing scenes (verses), entities (metas), and resources. Export/import functionality is **highly feasible** with moderate implementation effort.

## 1. Data Architecture Overview

### 1.1 Core Entities

#### Verse (Scene)
- **API**: `src/api/v1/verse.ts`
- **Type**: `VerseData`
- **Key Fields**:
  - `id`, `uuid`, `name`, `description`
  - `data`: JSON structure containing modules and entities
  - `version`: Version tracking
  - `metas`: Array of associated meta entities
  - `verseCode`: Blockly/Lua/JS code
  - `resources`: Associated resources

#### Meta (Entity)
- **API**: `src/api/v1/meta.ts`
- **Type**: `metaInfo`
- **Key Fields**:
  - `id`, `uuid`, `title`
  - `data`: JSON structure with entity hierarchy
  - `events`: Event definitions
  - `metaCode`: Blockly/Lua/JS code
  - `resources`: Associated resources
  - `image_id`: Reference to image

#### Resources
- **API**: `src/api/v1/resources/index.ts`
- **Types**: voxel, polygen, picture, video, audio, particle
- **Key Fields**:
  - `id`, `uuid`, `name`, `type`
  - `file`: FileType with URL, MD5, key
  - `info`: JSON metadata
  - `image_id`: Reference to image

### 1.2 Data Relationships

```
Verse (Scene)
├── data (JSON structure)
│   └── children.modules[]
│       └── entities[] (references to Metas)
├── metas[] (Meta entities)
│   ├── data (JSON structure)
│   │   └── children.entities[]
│   ├── events
│   ├── metaCode (Blockly)
│   └── resources[] (Resource references)
├── verseCode (Blockly)
└── resources[] (Resource references)
```

## 2. API Layer Analysis

### 2.1 Verse API Endpoints
- `POST /v1/verses` - Create verse
- `GET /v1/verses/{id}` - Get verse with expand options
- `PUT /v1/verses/{id}` - Update verse
- `DELETE /v1/verses/{id}` - Delete verse
- `PUT /v1/verses/{id}/code` - Update verse code (Blockly)

### 2.2 Meta API Endpoints
- `POST /v1/metas` - Create meta
- `GET /v1/metas/{id}` - Get meta with expand options
- `PUT /v1/metas/{id}` - Update meta
- `DELETE /v1/metas/{id}` - Delete meta
- `PUT /v1/metas/{id}/code` - Update meta code (Blockly)

### 2.3 Resources API Endpoints
- `GET /v1/resources/{id}` - Get resource
- `POST /v1/resources` - Create resource
- `PUT /v1/resources/{id}` - Update resource
- `DELETE /v1/resources/{id}` - Delete resource

### 2.4 Meta-Resource Linking
- `POST /v1/meta-resources` - Link resource to meta
- `GET /v1/meta-resources/resources` - Get resources for meta
- `DELETE /v1/meta-resources/{id}` - Unlink resource

## 3. Export Feasibility

### 3.1 What Can Be Exported

✅ **Verse Structure**
- Complete verse data (JSON)
- Verse metadata (name, description, version)
- Verse code (Blockly)

✅ **Associated Metas**
- All meta entities with their data
- Meta code (Blockly)
- Meta events

✅ **Resource References**
- Resource metadata (name, type, info)
- Resource file URLs (can be downloaded separately)
- Resource-meta relationships

✅ **Complete Package**
- Single JSON file containing:
  - Verse metadata
  - All metas with their data
  - All resource references
  - Code blocks
  - Relationships/links

### 3.2 Export Format Recommendation

```json
{
  "version": "1.0",
  "exportDate": "2024-01-16T10:30:00Z",
  "verse": {
    "id": 123,
    "uuid": "...",
    "name": "My Scene",
    "description": "...",
    "version": 3,
    "data": { /* JSON structure */ },
    "verseCode": { "blockly": "...", "lua": "...", "js": "..." }
  },
  "metas": [
    {
      "id": 456,
      "uuid": "...",
      "title": "Entity 1",
      "data": { /* JSON structure */ },
      "events": { /* events */ },
      "metaCode": { "blockly": "...", "lua": "...", "js": "..." },
      "resourceIds": [789, 790]
    }
  ],
  "resources": [
    {
      "id": 789,
      "uuid": "...",
      "name": "Model.glb",
      "type": "polygen",
      "info": "...",
      "fileUrl": "https://..."
    }
  ],
  "relationships": {
    "verseMetaIds": [456, 457],
    "metaResourceMap": {
      "456": [789, 790],
      "457": [791]
    }
  }
}
```

## 4. Import Feasibility

### 4.1 Import Challenges

⚠️ **Resource Files**
- URLs may not be accessible in target environment
- Need strategy: re-upload or reference by URL
- File storage system exists (`src/assets/js/file/`)

⚠️ **ID Mapping**
- Source IDs won't match target IDs
- Need UUID-based mapping
- Already using UUIDs in data structures

⚠️ **Permissions**
- Need to verify user can create verses/metas
- Ability system exists (`src/utils/ability.ts`)

### 4.2 Import Strategy

**Option A: Lightweight (URL-based)**
- Import verse/meta structure
- Keep resource URLs as-is
- Faster, but resources must be accessible

**Option B: Full (File-based)**
- Import verse/meta structure
- Re-upload resource files
- Slower, but self-contained
- Requires file upload infrastructure (already exists)

**Option C: Hybrid**
- Import structure
- Offer choice: keep URLs or re-upload
- Most flexible

## 5. Existing Infrastructure

### 5.1 File Handling
- **Location**: `src/assets/js/file/`
- **Features**:
  - MD5 hashing
  - File upload/download
  - Multiple storage handlers (Tencent Cloud, Server)
  - Progress tracking

### 5.2 UI Components
- **CardListPage**: List display with pagination
- **ResourceDialog**: Resource selection
- **MetaDetail**: Meta editing

### 5.3 Utilities
- **Request**: Axios wrapper with auth
- **i18n**: Internationalization support
- **Ability**: Permission checking

## 6. Implementation Roadmap

### Phase 1: Export (Low Effort)
1. Create export utility function
2. Fetch verse with all related data
3. Generate JSON file
4. Trigger browser download

### Phase 2: Import (Medium Effort)
1. Create import utility function
2. Parse JSON file
3. Create verse/metas with UUID mapping
4. Handle resource references (URL-based initially)
5. Validate permissions

### Phase 3: Resource Handling (Medium Effort)
1. Detect missing resources
2. Offer re-upload option
3. Update resource references
4. Maintain relationships

### Phase 4: UI Integration (Low Effort)
1. Add export button to verse list
2. Add import button to verse list
3. Show progress/status
4. Handle errors gracefully

## 7. Key Files to Modify/Create

### New Files
- `src/api/v1/export.ts` - Export API calls
- `src/api/v1/import.ts` - Import API calls
- `src/utils/export-import.ts` - Core logic
- `src/components/ExportDialog.vue` - Export UI
- `src/components/ImportDialog.vue` - Import UI

### Modified Files
- `src/views/meta/list.vue` - Add export/import buttons
- `src/router/modules/verse.ts` - Add routes if needed

## 8. Data Validation Checklist

- [ ] Verse UUID uniqueness
- [ ] Meta UUID uniqueness
- [ ] Resource references validity
- [ ] Code block format (Blockly)
- [ ] Event structure validity
- [ ] Transform data validity (position, rotation, scale)
- [ ] File URLs accessibility

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Large file size | Medium | Compress JSON, stream processing |
| Resource URL broken | Medium | Fallback to re-upload, validation |
| UUID conflicts | Low | UUID v4 generation, collision check |
| Permission denied | Low | Pre-check with ability system |
| Network timeout | Medium | Retry logic, chunked upload |

## 10. Estimated Effort

- **Export**: 4-6 hours
- **Import (URL-based)**: 6-8 hours
- **Import (Full with re-upload)**: 12-16 hours
- **UI Integration**: 4-6 hours
- **Testing**: 8-10 hours

**Total**: 34-46 hours for full implementation

## 11. Success Criteria

✅ Export verse to JSON file
✅ Import verse from JSON file
✅ Preserve all data relationships
✅ Handle resource references
✅ Maintain code blocks
✅ Validate on import
✅ User-friendly error messages
✅ Progress indication
