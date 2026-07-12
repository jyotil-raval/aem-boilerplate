// @ts-check
// CDN ESM imports below aren't filesystem-resolvable — airbnb-base's
// extension/resolution rules don't apply to them.
// eslint-disable-next-line import/no-unresolved, import/extensions
import React, { useState } from 'https://esm.sh/react@18.3.1';
// eslint-disable-next-line import/no-unresolved, import/extensions
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';

/**
 * @typedef {{
 *   label: string,
 *   name: string,
 *   kind: 'text'|'number'|'radio'|'checkbox'|'email',
 *   maxLength?: number,
 *   options?: string[]
 * }} FieldSpec
 */

/**
 * Explicit type declaration, read from the constraint cell. The FIRST
 * token (before any comma, and outside any list) is the control type —
 * "text", "number", "radio", or "checkbox". This is the contract: authors
 * declare what a field IS, the code doesn't guess from shape.
 *
 * - text: optional second token is maxLength     -> "text, 50"
 * - email: same shape as text, format-validated  -> "email, 40"
 * - number: no params                            -> "number"
 * - radio / checkbox: options come from a <ul>/<ol> below the keyword
 *     -> "radio" + a bulleted list of options in the same cell
 *
 * "string" is kept as an alias for "text" for backward compatibility with
 * earlier-authored tables that used it before this convention existed.
 * @param {HTMLElement} cell
 * @returns {{ kind: FieldSpec['kind'], maxLength?: number, options?: string[] }}
 */
function parseConstraint(cell) {
  const list = cell.querySelector('ul, ol');
  const options = list ? [...list.querySelectorAll('li')].map((li) => li.textContent.trim()).filter(Boolean) : undefined;

  // Read the keyword/params from the cell's text with the list stripped
  // out, so list item text never leaks into the type token.
  const clone = /** @type {HTMLElement} */ (cell.cloneNode(true));
  clone.querySelectorAll('ul, ol').forEach((el) => el.remove());
  const tokens = clone.textContent
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const [rawType, param] = tokens;
  const type = (rawType || '').toLowerCase();

  switch (type) {
    case 'number':
      return { kind: 'number' };
    case 'radio':
      return { kind: 'radio', options: options || [] };
    case 'checkbox':
      return { kind: 'checkbox', options: options || [] };
    case 'email':
      return { kind: 'email', maxLength: param ? Number(param) : undefined };
    case 'text':
    case 'string':
    default:
      return { kind: 'text', maxLength: param ? Number(param) : undefined };
  }
}

/**
 * Each authored row is [label cell, constraint cell]. This turns the raw
 * block markup into the field specs the form actually renders from — the
 * contract between whoever authors the table and this code.
 * @param {HTMLElement} block
 * @returns {FieldSpec[]}
 */
function parseFields(block) {
  return [...block.children].map((row) => {
    const [labelCell, constraintCell] = row.children;
    const label = labelCell.textContent.trim();
    const name = label.toLowerCase().replace(/\s+/g, '-');
    return { label, name, ...parseConstraint(constraintCell) };
  });
}

/**
 * @param {string[]} selected
 * @param {string} option
 * @returns {string[]}
 */
function toggleOption(selected, option) {
  return selected.includes(option) ? selected.filter((existing) => existing !== option) : [...selected, option];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Dispatches on field.kind to check a value against that kind's rule.
 * Returns an error message string, or undefined if valid. Only 'email'
 * has a rule so far — everything else passes until a later phase adds
 * more (required, phone format, etc.), same extension point as
 * renderControl below.
 * @param {FieldSpec} field
 * @param {*} value
 * @returns {string | undefined}
 */
function validateField(field, value) {
  if (field.kind === 'email') {
    // Not enforcing "required" here — empty stays valid for now. Only
    // check format once something's actually been typed.
    if (!value) return undefined;
    return EMAIL_PATTERN.test(value) ? undefined : 'Enter a valid email address';
  }
  return undefined;
}

/**
 * Dispatches on field.kind to render the right control. Kept separate
 * from ReactForm so adding a new kind later is a new case here, not a
 * deeper ternary.
 * @param {FieldSpec} field
 * @param {*} value
 * @param {(name: string, value: *) => void} onChange
 * @param {(name: string) => void} onBlur
 */
function renderControl(field, value, onChange, onBlur) {
  if (field.kind === 'radio') {
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

  if (field.kind === 'checkbox') {
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

  // text / number / email share the same plain-input shape.
  return React.createElement('input', {
    id: field.name,
    name: field.name,
    type: field.kind,
    maxLength: field.maxLength,
    value: value || '',
    onChange: (event) => onChange(field.name, event.target.value),
    onBlur: () => onBlur(field.name)
  });
}

/**
 * @param {{ fields: FieldSpec[] }} props
 */
function ReactForm({ fields }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (name) => {
    const field = fields.find((candidate) => candidate.name === name);
    const error = validateField(field, values[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    fields.forEach((field) => {
      const error = validateField(field, values[field.name]);
      if (error) nextErrors[field.name] = error;
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    // eslint-disable-next-line no-console
    console.log('react-form values', values);
  };

  const hasErrors = Object.values(errors).some(Boolean);

  return React.createElement(
    'form',
    { className: 'react-form', onSubmit: handleSubmit },
    ...fields.map((field) =>
      React.createElement(
        'div',
        { className: 'react-form-field', key: field.name },
        React.createElement('label', { htmlFor: field.name }, field.label),
        renderControl(field, values[field.name], handleChange, handleBlur),
        errors[field.name] ? React.createElement('span', { className: 'react-form-error' }, errors[field.name]) : null
      )
    ),
    React.createElement('button', { type: 'submit', disabled: hasErrors }, 'Submit')
  );
}

/**
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const fields = parseFields(block);
  block.textContent = '';

  const mountPoint = document.createElement('div');
  mountPoint.className = 'react-form-root';
  block.append(mountPoint);

  const root = createRoot(mountPoint);
  root.render(React.createElement(ReactForm, { fields }));
}
