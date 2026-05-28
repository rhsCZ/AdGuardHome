import React from 'react';

import intl from 'panel/common/intl';

import { TagsRow } from './TagsRow';

import s from './PersistentClientsTable.module.pcss';

type TagCellProps = {
    tags: string[];
};

export const TagCell = ({ tags }: TagCellProps) => {
    if (tags.length === 0) {
        return (
            <div className={s.cell}>
                <span className={s.cellLabel}>{intl.getMessage('tags_title')}</span>
                <div className={s.cellValue}>
                    <span>-</span>
                </div>
            </div>
        );
    }

    return (
        <div className={s.cell}>
            <span className={s.cellLabel}>{intl.getMessage('tags_title')}</span>
            <div className={s.cellValue}>
                <TagsRow tags={tags} />
            </div>
        </div>
    );
};
