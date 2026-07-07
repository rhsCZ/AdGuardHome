import { untrack, type Accessor } from 'solid-js';

import { dnsConfigState, setDnsConfig } from 'panel/stores/dnsConfig';
import intl from 'panel/common/intl';
import { ConfigDialog } from 'panel/common/ui/ConfigDialog';
import { Input } from 'panel/common/controls/Input';
import { IPV4_SUBNET_PREFIX, IPV6_SUBNET_PREFIX, IP_VERSION } from 'panel/helpers/constants';
import { validateRequiredValue, validateBetween } from 'panel/helpers/validators';
import { useField } from 'panel/hooks/useField';
import theme from 'panel/lib/theme';

type SubnetVersion = 'ipv4' | 'ipv6';

type Props = {
    version: SubnetVersion;
    open: Accessor<boolean>;
    onClose: () => void;
    processing: boolean;
};

export const SubnetPrefixDialog = (props: Props) => {
    const isV4 = () => props.version === 'ipv4';
    const range = () => (isV4() ? IPV4_SUBNET_PREFIX : IPV6_SUBNET_PREFIX);

    const field = useField<number>(
        () => props.open(),
        () =>
            isV4()
                ? (dnsConfigState.ratelimit_subnet_len_ipv4 ?? IPV4_SUBNET_PREFIX.DEFAULT)
                : (dnsConfigState.ratelimit_subnet_len_ipv6 ?? IPV6_SUBNET_PREFIX.DEFAULT),
        {
            validate: (v) =>
                validateRequiredValue(String(v)) ||
                validateBetween(v, range().MIN, range().MAX) ||
                '',
        },
    );

    const storeKey = () => (isV4() ? 'ratelimit_subnet_len_ipv4' : 'ratelimit_subnet_len_ipv6');

    return (
        <ConfigDialog
            open={props.open()}
            title={intl.getMessage('dns_subnet_prefix_title', {
                value: isV4() ? IP_VERSION.V4 : IP_VERSION.V6,
            })}
            description={intl.getMessage('dns_subnet_prefix_desc', {
                value: isV4() ? IP_VERSION.V4 : IP_VERSION.V6,
            })}
            onClose={props.onClose}
            onSubmit={() => {
                const key = storeKey();
                field.submitIfValid((v) => {
                    setDnsConfig({ [key]: v });
                    untrack(() => props.onClose());
                });
            }}
            processing={props.processing}
            submitDisabled={!!field.error()}
        >
            <div class={theme.form.input}>
                <Input
                    type="number"
                    value={field.value()}
                    onChange={(e: Event) =>
                        field.setValue(Number((e.target as HTMLInputElement).value))
                    }
                    onBlur={() => field.validate()}
                    id={`ratelimit_subnet_len_${isV4() ? 'ipv4' : 'ipv6'}`}
                    label={intl.getMessage('dns_subnet_prefix_title', {
                        value: isV4() ? IP_VERSION.V4 : IP_VERSION.V6,
                    })}
                    placeholder={intl.getMessage('dns_subnet_placeholder')}
                    min={range().MIN}
                    max={range().MAX}
                    errorMessage={field.error()}
                />
            </div>
        </ConfigDialog>
    );
};
