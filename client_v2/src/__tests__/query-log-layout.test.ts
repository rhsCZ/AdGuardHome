import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath: string) => readFileSync(resolve(testDir, '..', relativePath), 'utf8');

describe('Query Log desktop layout contracts', () => {
    it('uses a 40px actions column with centered content', () => {
        const tableSource = readSource('components/QueryLog/blocks/LogTable/LogTable.tsx');
        const tableCss = readSource('components/QueryLog/blocks/LogTable/LogTable.module.pcss');

        expect(tableSource).toContain('width: 40');
        expect(tableSource).not.toContain("header: { text: intl.getMessage('actions_table_header') }");
        expect(tableCss).toContain('justify-content: center');
        expect(tableCss).not.toContain('margin-left: auto');
    });

    it('lets desktop filters grow with the selected label before ellipsizing', () => {
        const headerCss = readSource('components/QueryLog/blocks/Header/Header.module.pcss');

        expect(headerCss).not.toContain('max-width: 180px;');
        expect(headerCss).not.toContain('max-width: clamp(160px, 18vw, 240px);');
        expect(headerCss).toContain('&:global(.react-select.react-select-responsive)');
        expect(headerCss).toContain('width: fit-content;');
        expect(headerCss).toContain('text-overflow: ellipsis');
        expect(headerCss).toContain('flex: 0 1 auto;');
    });
});
