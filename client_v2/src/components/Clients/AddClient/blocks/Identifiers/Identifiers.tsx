import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'clsx';
import intl from 'panel/common/intl';
import { Input } from 'panel/common/controls/Input';
import { Icon } from 'panel/common/ui/Icon';
import { RootState } from 'panel/initialState';
import { updateClientFormField } from 'panel/actions/clientForm';
import { validateIdentifier } from 'panel/helpers/validators';
import theme from 'panel/lib/theme';

import s from './Identifiers.module.pcss';

export const Identifiers = () => {
    const dispatch = useDispatch();
    const ids = useSelector((state: RootState) => state.clientForm.ids);
    const formErrors = useSelector((state: RootState) => state.clientForm.formErrors);

    const [touchedFields, setTouchedFields] = useState<number[]>([]);

    // When formErrors.ids has errors, mark all those indices as touched
    useEffect(() => {
        if (Array.isArray(formErrors.ids)) {
            const errorIndices = formErrors.ids
                .map((err: string | undefined, idx: number) => (err ? idx : -1))
                .filter((idx: number) => idx >= 0);
            setTouchedFields((prev) => {
                const newTouched = [...prev];
                errorIndices.forEach((idx: number) => {
                    if (!newTouched.includes(idx)) {
                        newTouched.push(idx);
                    }
                });
                return newTouched;
            });
        }
    }, [formErrors.ids]);

    const handleChange = useCallback(
        (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const newIds = [...ids];
            newIds[index] = e.target.value;
            dispatch(updateClientFormField({ field: 'ids', value: newIds }));
        },
        [ids, dispatch],
    );

    const handleBlur = useCallback(
        (index: number) => () => {
            const newIds = [...ids];
            newIds[index] = newIds[index].trim();
            dispatch(updateClientFormField({ field: 'ids', value: newIds }));
            setTouchedFields((prev) => (prev.includes(index) ? prev : [...prev, index]));
        },
        [ids, dispatch],
    );

    const handleAdd = useCallback(() => {
        dispatch(updateClientFormField({ field: 'ids', value: [...ids, ''] }));
    }, [ids, dispatch]);

    const handleRemove = useCallback(
        (index: number) => () => {
            const newIds = ids.filter((_, i) => i !== index);
            if (newIds.length === 0) {
                newIds.push('');
            }
            dispatch(updateClientFormField({ field: 'ids', value: newIds }));
        },
        [ids, dispatch],
    );

    const getError = useCallback(
        (value: string, index: number): string | undefined => {
            return validateIdentifier(value, ids, index);
        },
        [ids],
    );

    return (
        <div className={s.wrapper}>
            <div className={cn(theme.text.t2, theme.text.semibold, s.label)}>
                {intl.getMessage('clients_identifiers')}
            </div>
            <div className={cn(theme.text.t3, s.desc)}>
                {intl.getMessage('clients_identifiers_desc', {
                    a: (text: string) => (
                        <a
                            href="https://github.com/AdguardTeam/AdGuardHome/wiki/Clients#idclient"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {text}
                        </a>
                    ),
                })}
            </div>
            {ids.map((id, index) => {
                const blurError = getError(id, index);
                const isTouched = touchedFields.includes(index);
                const saveError = Array.isArray(formErrors.ids) ? formErrors.ids[index] : undefined;
                const activeError = saveError || (isTouched ? blurError : undefined);
                const showError = !!activeError;

                const suffixBtn =
                    index > 0 ? (
                        <button
                            type="button"
                            className={s.removeSuffixBtn}
                            onClick={handleRemove(index)}
                            aria-label={intl.getMessage('delete_btn')}
                        >
                            <Icon icon="cross" color="gray" />
                        </button>
                    ) : undefined;

                return (
                    <div key={index} className={s.row}>
                        <div className={s.inputCell}>
                            <Input
                                id={`client-identifier-${index}`}
                                type="text"
                                value={id}
                                onChange={handleChange(index)}
                                onBlur={handleBlur(index)}
                                placeholder={intl.getMessage('clients_identifier_format_error')}
                                error={showError}
                                errorMessage={showError ? activeError : undefined}
                                size="large"
                                suffixIcon={suffixBtn}
                            />
                        </div>
                    </div>
                );
            })}
            <button
                type="button"
                className={s.addButton}
                onClick={handleAdd}
                data-testid="client-form-add-identifier"
            >
                <Icon icon="plus" color="green" />
                {intl.getMessage('clients_add_identifier')}
            </button>
        </div>
    );
};
