// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React from 'https://esm.sh/react@18.3.1';

/**
 * @param {string[]} selected
 * @param {string} option
 * @returns {string[]}
 */
function toggleOption(selected, option) {
  return selected.includes(option) ? selected.filter((existing) => existing !== option) : [...selected, option];
}

export default {
  kind: 'checkbox',
  /** @param {Record<string, string>} pairs @param {string[]} [options] */
  parse(pairs, options) {
    return { options: options || [] };
  },
  render(field, value, onChange) {
    const selected = Array.isArray(value) ? value : [];
    return React.createElement(
      'div',
      { className: 'react-form-checkbox-group' },
      ...(field.options || []).map((option) =>
        React.createElement(
          'label',
          { key: option, className: 'react-form-option' },
          React.createElement('input', {
            type: 'checkbox',
            name: field.name,
            value: option,
            checked: selected.includes(option),
            onChange: () => onChange(field.name, toggleOption(selected, option))
          }),
          option
        )
      )
    );
  }
};
