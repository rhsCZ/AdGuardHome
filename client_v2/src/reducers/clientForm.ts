import { handleActions } from 'redux-actions';

import { getInitialClientFormState } from '../initialState';
import {
    initClientForm,
    updateClientFormField,
    clearClientForm,
    setFormErrors,
    clearFormErrors,
    addClientRequest,
    addClientFailure,
    addClientSuccess,
    updateClientRequest,
    updateClientFailure,
    updateClientSuccess,
} from '../actions/clientForm';

const clientForm = handleActions<any>(
    {
        [initClientForm.toString()]: (_state: any, { payload }: any) => {
            if (payload) {
                return {
                    ...getInitialClientFormState(),
                    ...payload,
                    mode: 'edit',
                    originalName: payload.name || '',
                };
            }
            return getInitialClientFormState();
        },

        [updateClientFormField.toString()]: (state: any, { payload }: any) => {
            const { field, value } = payload;
            // Clear error for the field being edited
            const errors = { ...state.formErrors };
            if (errors[field]) {
                if (Array.isArray(errors[field])) {
                    delete errors[field];
                } else {
                    delete errors[field];
                }
            }
            return {
                ...state,
                [field]: value,
                formErrors: errors,
            };
        },

        [clearClientForm.toString()]: () => getInitialClientFormState(),

        [setFormErrors.toString()]: (state: any, { payload }: any) => ({
            ...state,
            formErrors: payload,
        }),
        [clearFormErrors.toString()]: (state: any) => ({
            ...state,
            formErrors: {},
        }),

        [addClientRequest.toString()]: (state: any) => ({
            ...state,
            processingSave: true,
        }),
        [addClientFailure.toString()]: (state: any) => ({
            ...state,
            processingSave: false,
        }),
        [addClientSuccess.toString()]: (state: any) => ({
            ...state,
            processingSave: false,
        }),

        [updateClientRequest.toString()]: (state: any) => ({
            ...state,
            processingSave: true,
        }),
        [updateClientFailure.toString()]: (state: any) => ({
            ...state,
            processingSave: false,
        }),
        [updateClientSuccess.toString()]: (state: any) => ({
            ...state,
            processingSave: false,
        }),
    },
    getInitialClientFormState(),
);

export default clientForm;
