# The `react-form` field system — detailed reference

Everything about how `react-form` turns an authored table into a
validated, conditional React form: the architecture, the exact syntax,
every field type's behavior, and the real failure modes hit building it.

---

## 1. Architecture

```
blocks/react-form/
  react-form.js       <- parses the table, holds state, renders, submits
  react-form.css
  fields/
    registry.js        <- keyword -> module lookup
    text.js  email.js  number.js  radio.js  checkbox.js  textarea.js  file-upload.js
```

`react-form.js` never contains per-type logic itself. Each field module
exports:

```js
export default {
  kind: 'email',                          // internal identifier
  parse(pairs, options) { ... },          // constraint cell -> extra field data
  render(field, value, onChange, onBlur) { ... },  // returns a React element
  validate(field, value) { ... },         // optional — omit for "always valid"
};
```

`registry.js` maps the keyword an author types (`email`) to that module.

**Adding a new field type is exactly two steps, and `react-form.js`
itself never changes:**

1. Write `fields/<name>.js` exporting the shape above.
2. Add one line to `registry.js`.

---

## 2. Authoring syntax

Each constraint cell (the right-hand cell of a row) is **key:value
lines** — one fact about the field per line:

```
type: email
maxLength: 40
```

**Critical mechanic: each line must be its own paragraph in the cell —
press Enter between them.** The parser reads each direct child node of
the cell as one line (`type: email` and `maxLength: 40` as two separate
`<p>` elements), specifically to avoid the bug where flattened
`textContent` silently runs multiple lines together with no separator.

| Key         | Used by               | Meaning                                                                       |
| ----------- | --------------------- | ----------------------------------------------------------------------------- |
| `type`      | every field           | Which registry module handles this row. Falls back to `text` if unrecognized. |
| `maxLength` | text, email, textarea | Caps input length                                                             |
| `showIf`    | any field             | `<field-slug> = <value>` — see §4                                             |

**Options for `radio`/`checkbox` come from a real bulleted list**, added
below the `type:` line using the editor's actual list button — **never
typed out as text** (e.g. `list: Yes, No` as a sentence is invisible to
the parser; it finds options only via `cell.querySelector('ul, ol')`).

**Field names are auto-derived from the label**, lowercased with
non-alphanumeric characters (including punctuation) collapsed to
dashes — `"Have you been prescribed VYEPTI?"` → `have-you-been-prescribed-vyepti`, question mark stripped, not left dangling.

---

## 3. Field types reference

| `type:`                 | Renders as                        | Value shape                 | Validates                              |
| ----------------------- | --------------------------------- | --------------------------- | -------------------------------------- |
| `text` (`string` alias) | `<input type="text">`             | string                      | —                                      |
| `email`                 | `<input type="email">`            | string                      | Regex format check, skipped when empty |
| `number`                | `<input type="number">`           | string                      | —                                      |
| `radio`                 | Radio group from bulleted list    | string (selected option)    | —                                      |
| `checkbox`              | Checkbox group from bulleted list | string[] (selected options) | —                                      |
| `textarea`              | `<textarea>`                      | string                      | —                                      |
| `file-upload`           | `<input type="file">`             | File[]                      | —                                      |

**`file-upload` is structurally different from every other type.**
Browsers never let JS set a file input's value — no page can
script-populate "here's a file from disk," for security. Every other
type here is a _controlled_ input (React owns and sets the value);
file-upload is inherently _uncontrolled_ — the code reads `File` objects
out on change and tracks names for display, but never writes a value
back onto the element.

**Known gaps — not built, same registry pattern would apply to add
them:** `select` (dropdown), a single yes/no agreement checkbox (current
`checkbox` is a multi-select group, not one boolean), a compound
date+"not scheduled"-toggle field.

---

## 4. Conditional fields (`showIf`)

```
type: radio
showIf: have-you-been-prescribed-vyepti = Yes
```

The referenced name is the exact slug §2 already derives from another
field's label — nothing new to name per conditional field.

**What's enforced, tested directly:**

- Hidden fields never render.
- Hidden fields never validate — an unmet `showIf` on a field the user
  can't see can never block submission.
- Hidden fields' stale values are excluded from the submitted payload
  (filtered out at submit time), rather than actively cleared from state
  on every visibility change.

---

## 5. Validation model

- Runs on blur, and re-runs on submit for every currently-visible field.
- Submit button carries `disabled` while any current error exists.
- Only `email` has a `validate` function today; every other type is
  "always valid" until one is added to its module.

**A trap worth knowing before debugging "Submit does nothing":** a
`disabled` button cannot be clicked — the browser blocks the click
before `onSubmit` ever fires. A stale error left over from an earlier
test, still sitting in state from before a reload, silently disables the
button with no visible sign why. **Always reload fresh before trusting
a Submit-click test.**

---

## 6. Known limitation: this parses rich text as if it were plain text

Two separate `showIf`/radio rows broke identically after being typed,
deleted, and retyped multiple times — while a row authored once and
never touched again never broke. Root cause: rich-text editors don't
guarantee that visually-identical content stays byte-identical after
enough edits. Known culprits, all invisible on screen:

- Non-breaking spaces (`\u00A0`) silently replacing regular spaces
- Leftover empty formatting nodes splitting what looks like one line
- Smart-punctuation autocorrect swapping `-`/`=`/quotes for typographic
  equivalents — breaking `showIf`'s exact-match parsing with no visible sign

**Recovery that worked, twice:** delete the row's content entirely and
retype it fresh — don't edit in place, which risks carrying the same
invisible corruption forward.

**The actual fix, not yet built:** stop parsing rich text at all.
Author the form as structured JSON instead of a table — either a **DA
Sheet** (spreadsheet cells, not rich text, publishes as real JSON at a
URL the block can `fetch()`) or a static JSON file in the repo if the
form should be developer-owned instead of author-owned. Example shape
for this exact form:

```json
{
  "fields": [
    {
      "label": "Have you been prescribed VYEPTI?",
      "type": "radio",
      "options": ["Yes", "No"]
    },
    {
      "label": "Have you had your first VYEPTI infusion?",
      "type": "radio",
      "options": ["Yes", "No"],
      "showIf": { "field": "have-you-been-prescribed-vyepti", "equals": "Yes" }
    },
    { "label": "Name", "type": "text", "maxLength": 50 },
    { "label": "Email", "type": "email", "maxLength": 40 },
    { "label": "Phone", "type": "number" },
    { "label": "Gender", "type": "radio", "options": ["Male", "Female", "Other"] }
  ]
}
```

Not wired up — this would change `decorate()` from reading the block's
own table to fetching external JSON, and change the authoring workflow
itself. A deliberate pivot, not a small patch.
