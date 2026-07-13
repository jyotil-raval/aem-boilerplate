// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React from 'https://esm.sh/react@18.3.1';

export default {
  kind: 'radio',
  /** @param {Record<string, string>} pairs @param {string[]} [options] */
  parse(pairs, options) {
    return { options: options || [] };
  },
  render(field, value, onChange) {
    return React.createElement(
      'div',
      { className: 'react-form-radio-group' },
      ...(field.options || []).map((option) =>
        React.createElement(
          'label',
          { key: option, className: 'react-form-option' },
          React.createElement('input', {
            type: 'radio',
            name: field.name,
            value: option,
            checked: value === option,
            onChange: () => onChange(field.name, option)
          }),
          option
        )
      )
    );
  }
};
