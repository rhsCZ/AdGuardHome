import { describe, expect, it } from 'vitest';

import {
    auditTranslations,
    collectTranslationUsageFromSource,
} from '../../scripts/translation-audit.js';

describe('collectTranslationUsageFromSource', () => {
    it('collects static intl keys and preserves plural base keys', () => {
        const source = [
            "import intl from 'panel/common/intl';",
            '',
            'export const Example = () => (',
            '    <>',
            "        {intl.getMessage('static_key')}",
            "        {intl.getMessage(('wrapped_key'))}",
            "        {intl.getPlural('plural_key', { count: 2 })}",
            '    </>',
            ');',
        ].join('\n');

        expect(collectTranslationUsageFromSource(source, 'src/Example.tsx')).toEqual({
            staticKeys: [
                { filePath: 'src/Example.tsx', key: 'static_key', line: 5, method: 'getMessage' },
                { filePath: 'src/Example.tsx', key: 'wrapped_key', line: 6, method: 'getMessage' },
                { filePath: 'src/Example.tsx', key: 'plural_key', line: 7, method: 'getPlural' },
            ],
            dynamicUsages: [],
        });
    });

    it('reports non-literal translation arguments as dynamic usages', () => {
        const source = [
            "import intl from 'panel/common/intl';",
            '',
            "const key = 'dns_settings';",
            "const item = { message: 'tooltip_key' };",
            '',
            'export const Example = ({ isEnabled, value }) => (',
            '    <>',
            '        {intl.getMessage(key)}',
            "        {intl.getMessage(isEnabled ? 'enable' : 'disable')}",
            '        {intl.getMessage(item.message)}',
            "        {intl.getMessage(value === 'asc' ? 'sort_asc' : 'sort_desc')}",
            '    </>',
            ');',
        ].join('\n');

        expect(collectTranslationUsageFromSource(source, 'src/DynamicExample.tsx')).toEqual({
            staticKeys: [],
            dynamicUsages: [
                { expression: 'intl.getMessage(key)', filePath: 'src/DynamicExample.tsx', line: 8, method: 'getMessage' },
                { expression: "intl.getMessage(isEnabled ? 'enable' : 'disable')", filePath: 'src/DynamicExample.tsx', line: 9, method: 'getMessage' },
                { expression: 'intl.getMessage(item.message)', filePath: 'src/DynamicExample.tsx', line: 10, method: 'getMessage' },
                { expression: "intl.getMessage(value === 'asc' ? 'sort_asc' : 'sort_desc')", filePath: 'src/DynamicExample.tsx', line: 11, method: 'getMessage' },
            ],
        });
    });
});

describe('auditTranslations', () => {
    it('reports missing and unused keys and marks the report incomplete when dynamic usage exists', () => {
        const usage = {
            staticKeys: [
                { filePath: 'src/Example.tsx', key: 'present_key', line: 5, method: 'getMessage' },
                { filePath: 'src/Example.tsx', key: 'plural_key', line: 6, method: 'getPlural' },
                { filePath: 'src/Example.tsx', key: 'missing_key', line: 7, method: 'getMessage' },
            ],
            dynamicUsages: [
                { expression: 'intl.getMessage(sectionKey)', filePath: 'src/Example.tsx', line: 8, method: 'getMessage' },
            ],
        };

        expect(
            auditTranslations({
                localeMessages: {
                    present_key: 'Present',
                    plural_key: '| One | Many',
                    unused_key: 'Unused',
                },
                usage,
            }),
        ).toEqual({
            dynamicUsages: [
                { expression: 'intl.getMessage(sectionKey)', filePath: 'src/Example.tsx', line: 8, method: 'getMessage' },
            ],
            localeKeyCount: 3,
            missingKeys: ['missing_key'],
            resultsAreIncomplete: true,
            staticKeyCount: 3,
            unusedKeys: ['unused_key'],
        });
    });
});