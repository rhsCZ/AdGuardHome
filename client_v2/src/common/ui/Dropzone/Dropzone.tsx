import { createSignal, Show } from 'solid-js';
import cn from 'clsx';

import { Icon } from 'panel/common/ui/Icon';
import intl from 'panel/common/intl';

import s from './Dropzone.module.pcss';

type DropzoneProps = {
    /** Called with the text contents of the dropped/selected file. */
    onFileSelect: (content: string) => void;
    /** Localized hint shown inside the zone. */
    hint: string;
    /** `data-testid` of the interactive zone. */
    testId: string;
    /** Extra class for layout spacing (the zone itself owns no outer margins). */
    class?: string;
};

export type { DropzoneProps };

/**
 * File drop zone (Figma "Certificate drop file").
 *
 * The whole zone is a single `<button>`: clicking it opens the file picker and
 * dragging a file over it swaps the "Browse" link for a download icon. The
 * hidden file input is a sibling — interactive content may not be nested
 * inside a button.
 */
export const Dropzone = (props: DropzoneProps) => {
    let fileInputRef: HTMLInputElement | undefined;
    const [dragOver, setDragOver] = createSignal(false);

    const readFile = (file: File | undefined) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            props.onFileSelect(reader.result as string);
        };
        reader.readAsText(file);
    };

    const handleClick = () => {
        fileInputRef?.click();
    };

    const handleFileChange = (e: Event) => {
        const input = e.currentTarget as HTMLInputElement;
        readFile(input.files?.[0]);
        // Reset so the same file can be selected again.
        input.value = '';
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        // Ignore the dragleave fired when the pointer moves onto a child node.
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget instanceof Node && e.currentTarget.contains(next)) {
            return;
        }
        setDragOver(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        readFile(e.dataTransfer?.files?.[0]);
    };

    return (
        <>
            <button
                type="button"
                class={cn(s.dropzone, props.class, { [s.dragOver]: dragOver() })}
                data-testid={props.testId}
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <span>{props.hint}</span>
                <Show
                    when={dragOver()}
                    fallback={<span class={s.browseLink}>{intl.getMessage('browse')}</span>}
                >
                    <Icon icon="download" class={s.dropzoneIcon} />
                </Show>
            </button>
            <input
                ref={(el) => (fileInputRef = el)}
                type="file"
                class={s.hiddenFileInput}
                onChange={handleFileChange}
                tabindex="-1"
                aria-hidden="true"
            />
        </>
    );
};
