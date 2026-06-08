import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import '../index.pcss';
import configureStore from '../configureStore';
import reducers from '../reducers/install';

import { Setup } from './Setup';
import { InstallState } from '../initialState';
import { Icons } from '../common/ui/Icons';

const store = configureStore<InstallState>(reducers, {});

const root = createRoot(document.getElementById('root')!);
root.render(
    <Provider store={store}>
        <Setup />
        <Icons />
    </Provider>,
);
