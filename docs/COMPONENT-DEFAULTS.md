# Component defaults

New React websites use a small reviewed component pack by default. It runs through the same project pipeline for all three public services, with access and quota still controlled by each provider.

| Source | Local adaptation | Application |
| --- | --- | --- |
| shadcn/ui Button | Native action button/link, role-token styles, focus and disabled states | First existing action control in a section |
| ReUI Button | Outline variant with hover, focus and disabled states | Further existing action controls |
| Magic UI BlurFade | Short CSS opacity/offset/blur entrance | First content wrapper, when motion is allowed |

The pack preserves content, navigation and React handlers. It does not add invented controls. Sections without action controls receive no button adaptation. These are adaptations of three reviewed source files, rather than full upstream packages; native JSX/CSS removes the need for Tailwind, Slot, Motion and variant helper dependencies.

Specific custom-component or styling requests take priority. No-motion requests omit the entrance effect, and reduced-motion preferences are respected. Ordinary navigation links remain links.

Reviewed MIT notices, upstream commits and file hashes stay in `integrations/references/` and `knowledge/component-recipes/`. Generated projects receive `COMPONENT-LICENSES.md`. Reopening, undo/redo and export preserve their notices. Keep those notices when editing or redistributing an adapted component.
