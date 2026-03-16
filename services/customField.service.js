/**
 * customField.service.js
 *
 * L-06: Centralised validation for the dynamic custom field system.
 *
 * Two concerns are handled here:
 *
 * 1. Field-definition validation (`validateFieldDefinitions`)
 *    Called when a CustomFieldGroup is created or updated.
 *    Ensures each field schema has a valid name, a recognised type, and only
 *    known optional keys — prevents garbage field specs reaching the DB.
 *
 * 2. Field-value validation (`validateCustomFieldValues`)
 *    Called by entity controllers that accept a `custom_fields` payload (GRN,
 *    WO, IssueSlip, etc.) before persisting to their JSONB column.
 *    Validates type coercion and mandatory-field presence against the live
 *    field definitions stored for the entity's event key.
 */

'use strict';

const { CustomFieldGroup } = require('../models');

// ── Recognised field types ──────────────────────────────────────────────────
const ALLOWED_FIELD_TYPES = new Set([
  'text',
  'number',
  'boolean',
  'date',
  'dropdown',
  'email',
  'phone',
  'textarea',
  'url',
]);

// ── Field-definition schema ──────────────────────────────────────────────────
// The keys allowed in each item of the `fields` JSONB array.
const KNOWN_FIELD_KEYS = new Set([
  'name', 'type', 'show_in_form', 'mandatory', 'show_in_table', 'options', 'placeholder',
]);

/**
 * Validate an array of field-definition objects (the `fields` column value).
 *
 * @param {any} fields - The value from req.body.fields
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFieldDefinitions(fields) {
  const errors = [];

  if (!Array.isArray(fields)) {
    return { valid: false, errors: ['fields must be an array'] };
  }

  fields.forEach((field, idx) => {
    const pfx = `fields[${idx}]`;

    if (typeof field !== 'object' || field === null || Array.isArray(field)) {
      errors.push(`${pfx}: each field must be a plain object`);
      return; // skip further checks for this item
    }

    // Unknown keys — warn (not block) but include in errors for API visibility
    const unknownKeys = Object.keys(field).filter((k) => !KNOWN_FIELD_KEYS.has(k));
    if (unknownKeys.length) {
      errors.push(`${pfx}: unknown key(s): ${unknownKeys.join(', ')}`);
    }

    // name — required, non-empty string
    if (!field.name || typeof field.name !== 'string' || !field.name.trim()) {
      errors.push(`${pfx}: "name" is required and must be a non-empty string`);
    }

    // type — required, must be in ALLOWED_FIELD_TYPES
    if (!field.type) {
      errors.push(`${pfx} ("${field.name || '?'}"): "type" is required`);
    } else if (!ALLOWED_FIELD_TYPES.has(field.type)) {
      errors.push(
        `${pfx} ("${field.name || '?'}"): type "${field.type}" is not valid. ` +
        `Allowed types: ${[...ALLOWED_FIELD_TYPES].join(', ')}`
      );
    }

    // dropdown requires options array
    if (field.type === 'dropdown') {
      if (!Array.isArray(field.options) || field.options.length === 0) {
        errors.push(`${pfx} ("${field.name || '?'}"): type "dropdown" requires a non-empty "options" array`);
      } else if (field.options.some((o) => typeof o !== 'string' || !o.trim())) {
        errors.push(`${pfx} ("${field.name || '?'}"): all "options" entries must be non-empty strings`);
      }
    }

    // Boolean flags — if present, must be boolean
    for (const boolKey of ['show_in_form', 'mandatory', 'show_in_table']) {
      if (field[boolKey] !== undefined && typeof field[boolKey] !== 'boolean') {
        errors.push(`${pfx} ("${field.name || '?'}"): "${boolKey}" must be a boolean`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a `custom_fields` value payload against the live field definitions
 * for the given event key.
 *
 * Usage in entity controllers:
 *   const { valid, errors } = await validateCustomFieldValues('GRN Entry Fields', req.body.custom_fields);
 *   if (!valid) return res.status(400).json({ success: false, message: errors[0], validation_errors: errors });
 *
 * @param {string} eventKey - The `event` value of the CustomFieldGroup to look up
 * @param {object} values   - The key→value map submitted by the client
 * @returns {Promise<{ valid: boolean, errors: string[], warnings: string[] }>}
 */
async function validateCustomFieldValues(eventKey, values) {
  const errors   = [];
  const warnings = [];

  if (!eventKey) return { valid: true, errors: [], warnings: [] }; // no event = no validation

  // Load the field definitions for this event
  const group = await CustomFieldGroup.findOne({
    where: { event: eventKey, is_active: true },
    attributes: ['id', 'fields'],
  });

  if (!group) {
    warnings.push(`No active custom field group found for event "${eventKey}" — values stored without validation`);
    return { valid: true, errors: [], warnings };
  }

  const fieldDefs = Array.isArray(group.fields) ? group.fields : [];
  const submitted = values && typeof values === 'object' ? values : {};

  for (const def of fieldDefs) {
    const fieldName = def.name;
    const fieldType = def.type;
    const raw       = submitted[fieldName];
    const isEmpty   = raw === undefined || raw === null || raw === '';

    // ── Mandatory check ──
    if (def.mandatory && isEmpty) {
      errors.push(`Custom field "${fieldName}" is required`);
      continue;
    }
    if (isEmpty) continue; // optional & not provided — skip type check

    // ── Type coercion checks ──
    switch (fieldType) {
      case 'number':
        if (isNaN(Number(raw))) {
          errors.push(`Custom field "${fieldName}" must be a number (received "${raw}")`);
        }
        break;

      case 'boolean':
        if (raw !== true && raw !== false && raw !== 'true' && raw !== 'false') {
          errors.push(`Custom field "${fieldName}" must be true or false (received "${raw}")`);
        }
        break;

      case 'date':
        if (isNaN(Date.parse(raw))) {
          errors.push(`Custom field "${fieldName}" must be a valid date (received "${raw}")`);
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw))) {
          errors.push(`Custom field "${fieldName}" must be a valid email address (received "${raw}")`);
        }
        break;

      case 'url':
        try { new URL(String(raw)); } catch {
          errors.push(`Custom field "${fieldName}" must be a valid URL (received "${raw}")`);
        }
        break;

      case 'phone':
        if (!/^[+\d\s\-().]{7,20}$/.test(String(raw))) {
          errors.push(`Custom field "${fieldName}" must be a valid phone number (received "${raw}")`);
        }
        break;

      case 'dropdown': {
        const allowed = Array.isArray(def.options) ? def.options : [];
        if (allowed.length && !allowed.includes(String(raw))) {
          errors.push(
            `Custom field "${fieldName}" must be one of: ${allowed.join(', ')} (received "${raw}")`
          );
        }
        break;
      }

      case 'text':
      case 'textarea':
        if (typeof raw !== 'string') {
          errors.push(`Custom field "${fieldName}" must be a string (received ${typeof raw})`);
        }
        break;

      default:
        // Unknown type in DB — warn but allow
        warnings.push(`Custom field "${fieldName}" has unrecognised type "${fieldType}" — value stored unchecked`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateFieldDefinitions, validateCustomFieldValues, ALLOWED_FIELD_TYPES };
