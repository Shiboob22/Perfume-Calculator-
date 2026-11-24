import { describe, expect, it } from 'vitest';
import { classifyTier } from './tier.js';

describe('classifyTier', () => {
  it('checks specific families before fresh', () => {
    expect(classifyTier(['Citrus', 'Vanilla', 'Sweet'])).toBe('gourmand');
    expect(classifyTier(['Citrus', 'Amber'])).toBe('oriental');
    expect(classifyTier(['Green', 'White Floral'])).toBe('floral');
    expect(classifyTier(['Fresh', 'Woody'])).toBe('woody');
    expect(classifyTier(['Woody', 'Earthy'])).toBe('woody');
    expect(classifyTier(['Aquatic', 'Ozonic'])).toBe('fresh');
  });
  it('puts Kouros-type scents in fougere, ahead of oriental, floral and woody', () => {
    expect(classifyTier(['Aromatic', 'Fresh Spicy', 'Lavender', 'Warm Spicy', 'Amber', 'Powdery', 'Woody'])).toBe('fougere');
    expect(classifyTier(['Lavender', 'Herbal'])).toBe('fougere');
    expect(classifyTier(['Aromatic', 'Vanilla', 'Sweet'])).toBe('gourmand');
  });
  it('is case-insensitive and substring-based', () => {
    expect(classifyTier(['WARM SPICY'])).toBe('oriental');
    expect(classifyTier(['Sweet Gourmand'])).toBe('gourmand');
  });
  it('falls back to fresh', () => {
    expect(classifyTier([])).toBe('fresh');
    expect(classifyTier(['Metallic'])).toBe('fresh');
  });
});
