import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runTranslationAudit } from '../../scripts/check-translations.js';

const tempRoots: string[] = [];

afterEach(() => {
    while (tempRoots.length > 0) {
        const rootDir = tempRoots.pop();

        if (rootDir) {
            fs.rmSync(rootDir, { force: true, recursive: true });
        }
    }
});

describe('runTranslationAudit', () => {
    it('prints missing, unused, and dynamic sections for a client_v2-style tree', async () => {
        const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'translation-audit-'));
        tempRoots.push(rootDir);

        fs.mkdirSync(path.join(rootDir, 'src', '__locales'), { recursive: true });
        fs.writeFileSync(
            path.join(rootDir, 'src', '__locales', 'en.json'),
            JSON.stringify(
                {
                    present_key: 'Present',
                    unused_key: 'Unused',
                },
                null,
                2,
            ),
        );
        fs.writeFileSync(
            path.join(rootDir, 'src', 'App.tsx'),
            [
                "import intl from 'panel/common/intl';",
                '',
                'const sectionKey = getSectionKey();',
                '',
                'export const App = () => (',
                '    <>',
                "        {intl.getMessage('present_key')}",
                "        {intl.getMessage('missing_key')}",
                '        {intl.getMessage(sectionKey)}',
                '    </>',
                ');',
            ].join('\n'),
        );

        const chunks: string[] = [];
        const exitCode = await runTranslationAudit({
            rootDir,
            write: (chunk) => {
                chunks.push(chunk);
            },
        });

        const output = chunks.join('');

        expect(exitCode).toBe(0);
        expect(output).toContain('Missing translation keys:\n- missing_key');
        expect(output).toContain('Unused translation keys:\n- unused_key');
        expect(output).toContain('Dynamic translation usages:\n- src/App.tsx:9 intl.getMessage(sectionKey)');
        expect(output).toContain('WARNING: Dynamic translation usages were found.');
    });
});
