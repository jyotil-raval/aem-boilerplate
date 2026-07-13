// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React from 'https://esm.sh/react@18.3.1';

export default {
  kind: 'number',
  parse() {
    return {};
  },
  render(field, value, onChange, onBlur) {
    return React.createElement('input', {
      id: field.name,
      name: field.name,
      type: 'number',
      value: value || '',
      onChange: (event) => onChange(field.name, event.target.value),
      onBlur: () => onBlur(field.name)
    });
  }
};
