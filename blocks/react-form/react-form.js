// @ts-check
// eslint-disable-next-line import/no-unresolved, import/extensions
import React, { useState } from 'https://esm.sh/react@18.3.1';
// eslint-disable-next-line import/no-unresolved, import/extensions
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import registry from './fields/registry.js';

/**
 * @typedef {{
 *   label: string,
 *   name: string,
 *   kind: string,
 *   showIf?: { field: string, equals: string },
 *   [key: string]: *
 * }} FieldSpec
 */

/**
 * Reads a constraint cell as key:value lines — one line per fact about
 * the field ("type: text", "maxLength: 50", "showIf: some-field = Yes").
 * Each direct child of the cell (typically a <p> per line an author
 * pressed Enter to create) is treated as one line — NOT cell.textContent
 * split on '\n', which silently loses the line breaks between separate
 * <p> elements and would run every line together.
 * @param {HTMLElement} cell
 */
function parseKeyValueLines(cell) {
  const list = cell.querySelector('ul, ol');
  const options = list ? [...list.querySelectorAll('li')].map((li) => li.textContent.trim()).filter(Boolean) : undefined;

  const pairs = {};
  [...cell.childNodes]
    .filter((node) => node.nodeName !== 'UL' && node.nodeName !== 'OL')
    .forEach((node) => {
      const text = node.textContent.trim();
      const separatorIndex = text.indexOf(':');
      if (!text || separatorIndex === -1) return;
      const key = text.slice(0, separatorIndex).trim().toLowerCase();
      const value = text.slice(separatorIndex + 1).trim();
      pairs[key] = value;
    });

  return { pairs, options };
}

/**
 * "some-field = Yes" -> { field: 'some-field', equals: 'Yes' }. The
 * field name referenced is the same slug parseFields already derives
 * from a label, so this reads existing names rather than inventing a
 * new naming system.
 * @param {string | undefined} raw
 */
function parseShowIf(raw) {
  if (!raw) return undefined;
  const [field, equals] = raw.split('=').map((part) => part.trim());
  return field && equals ? { field, equals } : undefined;
}

/**
 * @param {HTMLElement} cell
 */
function parseConstraint(cell) {
  const { pairs, options } = parseKeyValueLines(cell);
  const type = (pairs.type || '').toLowerCase();
  const registered = registry[type] || registry.text;

  return {
    kind: registered.kind,
    showIf: parseShowIf(pairs.showif),
    ...registered.parse(pairs, options)
  };
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
    const name = label
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return { label, name, ...parseConstraint(constraintCell) };
  });
}

/**
 * @param {FieldSpec} field
 * @param {Record<string, *>} values
 */
function isVisible(field, values) {
  return !field.showIf || values[field.showIf.field] === field.showIf.equals;
}

/**
 * @param {{ fields: FieldSpec[] }} props
 */
function ReactForm({ fields }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  const visibleFields = fields.filter((field) => isVisible(field, values));

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const validateOne = (field) => {
    const { validate } = registry[field.kind] || {};
    return validate ? validate(field, values[field.name]) : undefined;
  };

  const handleBlur = (name) => {
    const field = fields.find((candidate) => candidate.name === name);
    setErrors((prev) => ({ ...prev, [name]: validateOne(field) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Hidden fields never get validated — an unmet showIf rule on a
    // field the user can't even see must never block submission.
    const nextErrors = {};
    visibleFields.forEach((field) => {
      const error = validateOne(field);
      if (error) nextErrors[field.name] = error;
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    // Stale answers from fields that are currently hidden (e.g. the
    // branch not taken) are left out of what actually gets submitted,
    // rather than clearing state on every visibility change.
    const visibleValues = {};
    visibleFields.forEach((field) => {
      visibleValues[field.name] = values[field.name];
    });

    // eslint-disable-next-line no-console
    console.log('react-form values', visibleValues);
  };

  const hasErrors = Object.values(errors).some(Boolean);

  return React.createElement(
    'form',
    { className: 'react-form', onSubmit: handleSubmit },
    ...visibleFields.map((field) =>
      React.createElement(
        'div',
        { className: 'react-form-field', key: field.name },
        React.createElement('label', { htmlFor: field.name }, field.label),
        registry[field.kind].render(field, values[field.name], handleChange, handleBlur),
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
