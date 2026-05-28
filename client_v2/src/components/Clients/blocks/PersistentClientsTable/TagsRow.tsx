import React from 'react';

import { Dropdown } from 'panel/common/ui/Dropdown';

import s from './PersistentClientsTable.module.pcss';

const MAX_VISIBLE_TAGS = 2;

type TagsRowProps = {
    tags: string[];
    maxVisible?: number;
};

export const TagsRow = ({ tags, maxVisible = MAX_VISIBLE_TAGS }: TagsRowProps) => {
    const visible = tags.slice(0, maxVisible);
    const hiddenCount = tags.length - maxVisible;

    return (
        <div className={s.tagsRow}>
            <span className={s.tagsText}>
                {visible.join(', ')}
                {hiddenCount > 0 && ','}
            </span>
            {hiddenCount > 0 && (
                <Dropdown
                    trigger="hover"
                    noIcon
                    overlayClassName={s.tagsTooltipOverlay}
                    menu={
                        <div className={s.tagsTooltip}>
                            {tags.map((tag) => (
                                <span key={tag} className={s.tagsTooltipItem}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    }
                >
                    <span className={s.countLabel}>{hiddenCount}</span>
                </Dropdown>
            )}
        </div>
    );
};
