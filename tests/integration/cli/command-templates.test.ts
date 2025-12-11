import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_DIR = path.resolve(__dirname, '../../../resources/templates/commands');

describe('Command Templates Integration', () => {
  describe('Template Count', () => {
    it('has exactly 13 command templates', () => {
      const files = fs.readdirSync(RESOURCES_DIR).filter(f => f.endsWith('.md'));
      expect(files).toHaveLength(13);
    });

    it('includes all required command templates', () => {
      const expectedCommands = [
        'analyze.md',
        'complete.md',
        'create.md',
        'implement.md',
        'list.md',
        'refine.md',
        'remove.md',
        'repair.md',
        'resume.md',
        'review.md',
        'show.md',
        'sync.md',
        'testing.md',
      ];

      const files = fs.readdirSync(RESOURCES_DIR).filter(f => f.endsWith('.md'));

      for (const expected of expectedCommands) {
        expect(files).toContain(expected);
      }
    });
  });

  describe('Path References', () => {
    it('uses nextai/ prefix for content paths in all templates', () => {
      const files = fs.readdirSync(RESOURCES_DIR).filter(f => f.endsWith('.md'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(RESOURCES_DIR, file), 'utf-8');

        // Check for old-style paths that should have been migrated
        // These patterns should NOT appear (except in negated examples or docs)
        const oldStylePatterns = [
          /`todo\/[^n]/,  // todo/<something> but not nextai/todo/
          /`done\/[^n]/,  // done/<something> but not nextai/done/
          /`docs\/nextai\//,  // docs/nextai/ should be nextai/docs/
        ];

        for (const pattern of oldStylePatterns) {
          const match = content.match(pattern);
          if (match) {
            // Allow the pattern if it appears in a context that's not a path reference
            // For example, in descriptions or when showing what NOT to do
            expect(match).toBeNull();
          }
        }
      }
    });

    it('templates reference nextai/todo/ for feature paths', () => {
      // Check specific templates that should reference features
      const featureTemplates = ['create.md', 'refine.md', 'implement.md', 'review.md', 'complete.md'];

      for (const template of featureTemplates) {
        const content = fs.readFileSync(path.join(RESOURCES_DIR, template), 'utf-8');

        // Should contain nextai/todo/ reference
        expect(content).toMatch(/nextai\/todo\//);
      }
    });

    it('templates reference nextai/docs/ for documentation paths', () => {
      const docsTemplates = ['analyze.md', 'complete.md'];

      for (const template of docsTemplates) {
        const content = fs.readFileSync(path.join(RESOURCES_DIR, template), 'utf-8');

        // Should contain nextai/docs/ reference
        expect(content).toMatch(/nextai\/docs\//);
      }
    });

    it('templates reference nextai/done/ for archive paths', () => {
      const archiveTemplates = ['complete.md', 'show.md'];

      for (const template of archiveTemplates) {
        const content = fs.readFileSync(path.join(RESOURCES_DIR, template), 'utf-8');

        // Should contain nextai/done/ reference
        expect(content).toMatch(/nextai\/done\//);
      }
    });
  });

  describe('Template Structure', () => {
    it('all templates have frontmatter with description', () => {
      const files = fs.readdirSync(RESOURCES_DIR).filter(f => f.endsWith('.md'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(RESOURCES_DIR, file), 'utf-8');

        // Should start with frontmatter
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/description:/);
      }
    });
  });
});
