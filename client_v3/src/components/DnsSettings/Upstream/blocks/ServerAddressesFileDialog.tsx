import { type Accessor } from 'solid-js';
import { dnsConfigState } from 'panel/stores/dnsConfig';
import intl from 'panel/common/intl';
import { ConfigDialog } from 'panel/common/ui/ConfigDialog';

type Props = {
    open: Accessor<boolean>;
    onClose: () => void;
};

export const ServerAddressesFileDialog = (props: Props) => (
    <ConfigDialog
        open={props.open()}
        title={intl.getMessage('dns_server_addresses_title')}
        description={
            <p>
                {intl.getMessage('dns_server_addresses_configured_in_file', {
                    path: dnsConfigState.upstream_dns_file,
                })}
            </p>
        }
        onClose={props.onClose}
        onSubmit={props.onClose}
        buttonText={intl.getMessage('close')}
    />
);
