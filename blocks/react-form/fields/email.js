// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React from 'https://esm.sh/react@18.3.1';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  kind: 'email',
  /** @param {Record<string, string>} pairs */
  parse(pairs) {
    return { maxLength: pairs.maxlength ? Number(pairs.maxlength) : undefined };
  },
  render(field, value, onChange, onBlur) {
    return React.createElement('input', {
      id: field.name,
      name: field.name,
      type: 'email',
      maxLength: field.maxLength,
      value: value || '',
      onChange: (event) => onChange(field.name, event.target.value),
      onBlur: () => onBlur(field.name)
    });
  },
  /**
   * Not enforcing "required" here — empty stays valid. Only checks
   * format once something's actually been typed.
   */
  validate(field, value) {
    if (!value) return undefined;
    return EMAIL_PATTERN.test(value) ? undefined : 'Enter a valid email address';
  }
};
