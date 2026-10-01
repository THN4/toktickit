import { describe, expect, it } from 'vitest';
import { createFields, mergedFields, parseActionAt, validateFields } from '../../src/actions.js';

const valid = () => ({ actionAt: '2026-09-29T10:30:00+07:00', description: '  Check service  ', followUpRequired: true, followUpNote: '  Verify later  ' });

describe('Lab 4 Action Taken field rules', () => {
  it('normalizes valid fields and retains both action time and follow-up data', () => {
    expect(createFields(valid())).toMatchObject({ actionAt: new Date('2026-09-29T03:30:00.000Z'), description: 'Check service', followUpRequired: true, followUpNote: 'Verify later', result: null });
  });

  it('requires an offset and rejects invalid or overlong fields', () => {
    expect(() => parseActionAt('2026-09-29T10:30:00')).toThrow();
    expect(() => parseActionAt('2026-09-29')).toThrow();
    expect(() => createFields({ ...valid(), description: ' ' })).toThrow();
    expect(() => createFields({ ...valid(), description: 'x'.repeat(2001) })).toThrow();
    expect(() => createFields({ ...valid(), result: ' ' })).toThrow();
    expect(() => createFields({ ...valid(), attachmentNotes: 'x'.repeat(1001) })).toThrow();
  });

  it('requires a follow-up note while the flag is true and retains it when cleared', () => {
    expect(() => createFields({ ...valid(), followUpNote: null })).toThrow();
    const fields = createFields(valid());
    expect(mergedFields(fields, { followUpRequired: false }).followUpNote).toBe('Verify later');
  });

  it('requires a result and a plausible action time on completion', () => {
    const fields = createFields(valid());
    expect(() => validateFields(fields, 'COMPLETED')).toThrow();
    expect(() => validateFields({ ...fields, result: '  ' }, 'COMPLETED')).toThrow();
    expect(() => validateFields({ ...fields, result: 'Restored' }, 'COMPLETED')).not.toThrow();
    expect(() => validateFields({ ...fields, result: 'Restored', actionAt: new Date(Date.now() + 6 * 60_000) }, 'COMPLETED')).toThrow();
  });
});
