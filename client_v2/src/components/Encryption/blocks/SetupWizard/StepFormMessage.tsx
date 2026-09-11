import { Show } from 'solid-js';

import intl from 'panel/common/intl';
import { InlineMessage } from './InlineMessage';
import type { StepMessage } from './mapStepResult';

type Props = {
    message?: StepMessage;
};

/**
 * Form-level step message — for messages that cannot be attached to a field
 * visible on the current step (e.g. a certificate error that regressed before
 * step 2).  A `goBack` message also gets the "go back" hint.
 */
export const StepFormMessage = (props: Props) => (
    <Show when={props.message}>
        <InlineMessage
            kind={props.message?.kind ?? 'error'}
            hint={props.message?.goBack ? intl.getMessage('tls_setup_hint_go_back') : undefined}
        >
            {props.message?.message}
        </InlineMessage>
    </Show>
);
