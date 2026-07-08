import { Show } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';
import { Input } from 'panel/common/controls/Input';
import { Radio } from 'panel/common/controls/Radio';
import { Textarea } from 'panel/common/controls/Textarea';
import intl from 'panel/common/intl';
import { ENCRYPTION_SOURCE } from 'panel/helpers/constants';
import { resetValidationStatus } from 'panel/stores/encryption';
import s from './styles.module.pcss';
import { FileBrowseButton } from './FileBrowseButton';

type Props = {
    certSource: Accessor<string>;
    setCertSource: Setter<string>;
    certChain: Accessor<string>;
    setCertChain: Setter<string>;
    certPath: Accessor<string>;
    setCertPath: Setter<string>;
    certPathError: Accessor<string | undefined>;
    certChainError: Accessor<string | undefined>;
    clearError: (field: string) => void;
    certSourceOptions: { text: string; value: string }[];
};

export const CertStep = (props: Props) => {
    const handleFileSelect = (content: string) => {
        props.setCertChain(content);
        props.setCertSource(ENCRYPTION_SOURCE.CONTENT);
        props.clearError('certificate_chain');
        props.clearError('certificate_path');
    };

    return (
        <div class={s.wizardBody}>
            <Radio
                value={props.certSource()}
                handleChange={(v: string) => {
                    props.setCertSource(v);
                    props.clearError('certificate_chain');
                    props.clearError('certificate_path');
                }}
                name="certificate_source"
                options={props.certSourceOptions}
                inModal
            />
            <Show
                when={props.certSource() === ENCRYPTION_SOURCE.CONTENT}
                fallback={
                    <Input
                        name="certificate_path"
                        value={props.certPath()}
                        onChange={(e) => {
                            props.setCertPath((e.target as HTMLInputElement).value);
                            props.clearError('certificate_path');
                            resetValidationStatus();
                        }}
                        placeholder={intl.getMessage('path_to_file_placeholder')}
                        errorMessage={props.certPathError()}
                        label={intl.getMessage('tls_cert_path_label')}
                        suffixIcon={<FileBrowseButton onFileSelect={handleFileSelect} />}
                        size="medium"
                    />
                }
            >
                <Textarea
                    name="certificate_chain"
                    value={props.certChain()}
                    onChange={(e) => {
                        props.setCertChain((e.target as HTMLTextAreaElement).value);
                        props.clearError('certificate_chain');
                        resetValidationStatus();
                    }}
                    placeholder={intl.getMessage('encryption_certificates_input')}
                    errorMessage={props.certChainError()}
                    size="large"
                />
            </Show>
        </div>
    );
};
