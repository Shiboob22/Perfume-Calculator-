import { describe, expect, it } from 'vitest';
import { classifyTier } from './tier.js';

describe('classifyTier', () => {
  it('checks specific families before fresh', () => {
    expect(classifyTier(['Citrus', 'Vanilla', 'Sweet'])).toBe('gourmand');
    expect(classifyTier(['Citrus', 'Amber'])).toBe('oriental');
    expect(classifyTier(['Green', 'White Floral'])).toBe('floral');
    expect(classifyTier(['Fresh', 'Woody'])).toBe('woody');
    expect(classifyTier(['Aquatic', 'Ozonic'])).toBe('fresh');
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
