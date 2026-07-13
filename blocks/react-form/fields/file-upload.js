// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React from 'https://esm.sh/react@18.3.1';

// File inputs can't be controlled the way every other kind here is —
// browsers never let JS set an <input type="file">'s value (security:
// a page can't script-populate "here's a file from disk"). We read File
// objects out on change and keep names for display, but never write
// `value` back onto the element the way text/email/etc. do.
export default {
  kind: 'file-upload',
  parse() {
    return {};
  },
  render(field, value, onChange) {
    const fileNames = Array.isArray(value) ? value.map((file) => file.name) : [];
    return React.createElement(
      'div',
      { className: 'react-form-file-upload' },
      React.createElement('input', {
        id: field.name,
        name: field.name,
        type: 'file',
        onChange: (event) => onChange(field.name, [...event.target.files])
      }),
      fileNames.length > 0 ? React.createElement('span', { className: 'react-form-file-names' }, fileNames.join(', ')) : null
    );
  }
};
