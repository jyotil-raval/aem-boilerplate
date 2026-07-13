// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React from 'https://esm.sh/react@18.3.1';

export default {
  kind: 'textarea',
  /** @param {Record<string, string>} pairs */
  parse(pairs) {
    return { maxLength: pairs.maxlength ? Number(pairs.maxlength) : undefined };
  },
  render(field, value, onChange, onBlur) {
    return React.createElement('textarea', {
      id: field.name,
      name: field.name,
      maxLength: field.maxLength,
      value: value || '',
      onChange: (event) => onChange(field.name, event.target.value),
      onBlur: () => onBlur(field.name)
    });
  }
};
