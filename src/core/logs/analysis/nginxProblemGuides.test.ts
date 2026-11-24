import { describe, expect, it } from 'vitest';

import { NGINX_PROBLEM_PATTERNS } from './nginxProblemPatterns';
import { NGINX_PROBLEM_GUIDES } from './nginxProblemGuides';

describe('Nginx problem diagnostic guides', () => {
  it('has a diagnostic guide for every recognized Nginx pattern', () => {
    const patternIds = NGINX_PROBLEM_PATTERNS.map((pattern) => pattern.id);

    expect(Object.keys(NGINX_PROBLEM_GUIDES).sort()).toEqual([...patternIds].sort());
  });

  it('provides useful checks and possible causes for every pattern', () => {
    for (const guide of Object.values(NGINX_PROBLEM_GUIDES)) {
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.summary.length).toBeGreaterThan(0);
      expect(guide.description.length).toBeGreaterThan(0);
      expect(guide.possibleCauses.length).toBeGreaterThan(0);
      expect(guide.checks.length).toBeGreaterThan(0);
    }
  });
});
