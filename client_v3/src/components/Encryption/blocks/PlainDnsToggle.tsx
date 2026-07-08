import { createSignal, Show } from 'solid-js';
import { SettingRow } from 'panel/common/ui/SettingRow';
import { ConfirmDialog } from 'panel/common/ui/ConfirmDialog';
import intl from 'panel/common/intl';
import { encryptionState, setTlsConfig } from 'panel/stores/encryption';

export const PlainDnsToggle = () => {
    const [confirmDisable, setConfirmDisable] = createSignal(false);
    const enc = () => encryptionState;

    // LOCKED when encryption is not enabled or cert/key are not present
    const fullyConfigured = () => {
        const hasCert = !!(enc().certificate_chain || enc().certificate_path);
        const hasKey = !!(enc().private_key || enc().private_key_path || enc().private_key_saved);
        return enc().enabled && hasCert && hasKey;
    };

    const locked = () => !fullyConfigured();

    const onChange = (checked: boolean) => {
        if (locked()) return; // LOCKED: NO-OP
        if (checked) {
            setTlsConfig({ serve_plain_dns: true });
            return; // re-enable → immediate auto-save
        }
        setConfirmDisable(true); // disable → confirmation modal
    };

    return (
        <>
            <SettingRow
                id="serve_plain_dns"
                variant="switch"
                title={intl.getMessage('encryption_plain_dns')}
                description={intl.getMessage('encryption_plain_dns_desc')}
                checked={enc().serve_plain_dns}
                disabled={locked()}
                onChange={onChange}
            />
            <Show when={confirmDisable()}>
                <ConfirmDialog
                    title={intl.getMessage('encryption_disable_plain_dns')}
                    text={intl.getMessage('encryption_disable_plain_dns_desc')}
                    buttonText={intl.getMessage('yes_disable')}
                    cancelText={intl.getMessage('cancel')}
                    buttonVariant="danger"
                    onClose={() => setConfirmDisable(false)}
                    onConfirm={() => {
                        setTlsConfig({ serve_plain_dns: false });
                        setConfirmDisable(false);
                    }}
                />
            </Show>
        </>
    );
};
