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
    keySource: Accessor<string>;
    setKeySource: Setter<string>;
    privateKey: Accessor<string>;
    setPrivateKey: Setter<string>;
    privateKeyPath: Accessor<string>;
    setPrivateKeyPath: Setter<string>;
    privateKeySaved: Accessor<boolean>;
    setPrivateKeySaved: Setter<boolean>;
    privateKeyError: Accessor<string | undefined>;
    privateKeyPathError: Accessor<string | undefined>;
    clearError: (field: string) => void;
    keySourceOptions: () => { text: string; value: string; disabled?: boolean }[];
};

export const KeyStep = (props: Props) => {
    const handleFileSelect = (content: string) => {
        props.setPrivateKey(content);
        props.setKeySource(ENCRYPTION_SOURCE.CONTENT);
        props.setPrivateKeySaved(false);
        props.clearError('private_key');
        props.clearError('private_key_path');
    };

    return (
        <div class={s.wizardBody}>
            <Radio
                value={props.keySource()}
                handleChange={(v: string) => {
                    props.setKeySource(v);
                    if (v === 'saved') {
                        props.setPrivateKey('');
                        props.setPrivateKeySaved(true);
                    } else {
                        props.setPrivateKeySaved(false);
                    }
                    props.clearError('private_key');
                    props.clearError('private_key_path');
                    resetValidationStatus();
                }}
                name="key_source"
                options={props.keySourceOptions()}
                inModal
            />
            <Show
                when={props.keySource() === ENCRYPTION_SOURCE.CONTENT}
                fallback={
                    <Input
                        name="private_key_path"
                        value={props.privateKeyPath()}
                        onChange={(e) => {
                            props.setPrivateKeyPath((e.target as HTMLInputElement).value);
                            props.clearError('private_key_path');
                            resetValidationStatus();
                        }}
                        placeholder={intl.getMessage('path_to_file_placeholder')}
                        errorMessage={props.privateKeyPathError()}
                        label={intl.getMessage('tls_key_path_label')}
                        suffixIcon={<FileBrowseButton onFileSelect={handleFileSelect} />}
                        size="medium"
                    />
                }
            >
                <Textarea
                    name="private_key"
                    value={props.privateKey()}
                    onChange={(e) => {
                        props.setPrivateKey((e.target as HTMLTextAreaElement).value);
                        props.clearError('private_key');
                        resetValidationStatus();
                    }}
                    placeholder={intl.getMessage('encryption_key_input')}
                    errorMessage={props.privateKeyError()}
                    disabled={props.privateKeySaved()}
                    size="large"
                />
            </Show>
        </div>
    );
};
