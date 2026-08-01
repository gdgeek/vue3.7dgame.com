# Responsive editor header specification

## Scope

Improve the application navigation header and the Verse/Entity script editor
toolbars so that they remain usable at different available widths. The change is
limited to the `develop` environment and must not promote to `main`, `publish`,
or production image tags.

## Current problems

- The global navigation is fixed at 64px while the breadcrumb is allowed to
  wrap, so long titles can render outside the header.
- The script action group is absolutely positioned over the Element Plus tab
  header. A hard-coded 460px right padding is the only collision protection.
- The only script-toolbar fallback begins at 768px, leaving common tablet and
  split-screen widths without a safe layout.
- Site, organization, account, theme, language, version and editor actions all
  compete at the same visual priority.

## Responsive priorities

1. Always visible: navigation toggle, primary editor title, edit/code mode and
   Save.
2. Visible when space permits: Test Run, return to Scene/Entity and contextual
   entity/scene selector.
3. Compact or overflow presentation: version history, preview, fullscreen,
   theme and language.
4. Hide descriptive text first: site/organization chips, account name and role.

Hiding presentation must not remove access to fullscreen, theme or language;
these actions move into a compact overflow menu.

## Layout behavior

### Global navigation

- Keep the navigation at one 64px row.
- Breadcrumb segments never wrap.
- Mark the scene/entity name as the primary segment and truncate it with an
  ellipsis.
- At compact widths, hide site/organization chips and non-primary breadcrumb
  segments.
- Convert version/preview buttons to icon-only controls when their labels no
  longer fit.
- Convert fullscreen/theme/language controls to one accessible overflow menu.
- Show only the user avatar at compact widths.

### Script editor toolbar

- Replace the overlap between the tab header and absolutely positioned actions
  with a dedicated toolbar containing explicit mode-tab buttons and actions.
- Keep Save at the trailing edge of the toolbar.
- Wrap the action group to a second row when the editor container is narrow.
- Allow the contextual selector to grow and shrink without forcing page-level
  horizontal scrolling.
- On phone widths, shorten secondary actions to icons while preserving
  accessible labels and keep Save directly visible.
- Apply the same structure to Verse and Entity script editors.

## Breakpoint intent

Responsive behavior should primarily follow available component width through
container queries, with viewport media queries as a fallback:

- Full: above 1280px.
- Compact desktop: 1024px to 1280px.
- Tablet/split screen: 768px to 1024px.
- Phone: below 768px.

## Accessibility

- Interactive icon-only controls have `aria-label` and `title` text.
- Mode controls use tab semantics and expose the selected state.
- The overflow menu remains keyboard reachable.
- Focus indicators are not removed.
- Persistent controls have at least a 40px visual size and 44px touch target at
  phone widths where practical.

## Acceptance criteria

- No header, breadcrumb, mode-tab or action overlap at 1440, 1280, 1024, 820,
  768 and 390 CSS pixels.
- No page-level horizontal scrollbar is introduced by either header.
- Long scene/entity names truncate instead of wrapping or covering controls.
- Save remains directly visible at all target widths.
- Fullscreen, theme and language remain available through the compact menu.
- Sidebar open/closed states, English/Chinese text and long account names do not
  break the layout.
- Existing navigation, tab switching, run, scene/entity return and save
  behaviors remain unchanged.
- Relevant unit tests, type checking, production build and visual QA pass before
  pushing `develop`.

## Release boundary

- Commit and push only to `gdgeek/vue3.7dgame.com` branch `develop`.
- Do not merge or push `main` or `publish`.
- Do not trigger any production deployment workflow manually.
