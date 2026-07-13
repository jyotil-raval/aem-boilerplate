// @ts-check
import textField from './text.js';
import emailField from './email.js';
import numberField from './number.js';
import radioField from './radio.js';
import checkboxField from './checkbox.js';
import textareaField from './textarea.js';
import fileUploadField from './file-upload.js';

// Keyed by the type keyword an author writes in the constraint cell.
// "string" is kept as a backward-compatible alias for "text" — matches
// how earlier tables in this project were already authored.
export default {
  'text': textField,
  'string': textField,
  'email': emailField,
  'number': numberField,
  'radio': radioField,
  'checkbox': checkboxField,
  'textarea': textareaField,
  'file-upload': fileUploadField
};
