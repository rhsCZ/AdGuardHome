import { Show, type JSX } from 'solid-js';
import cn from 'clsx';
import s from './styles.module.pcss';

type InlineMessageKind = 'error' | 'warning';

type Props = {
    kind: InlineMessageKind;
    children: JSX.Element;
    hint?: string;
    class?: string;
};

export const InlineMessage = (props: Props) => (
    <div
        class={cn(
            s.message,
            {
                [s.messageError]: props.kind === 'error',
                [s.messageWarning]: props.kind === 'warning',
            },
            props.class,
        )}
    >
        <div>{props.children}</div>
        <Show when={props.hint}>
            <div class={s.messageHint}>{props.hint}</div>
        </Show>
    </div>
);
