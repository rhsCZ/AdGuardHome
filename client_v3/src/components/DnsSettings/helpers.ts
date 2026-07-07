import { DNS_REQUEST_OPTIONS } from 'panel/helpers/constants';
import intl from 'panel/common/intl';

export const getUpstreamModeSummary = (mode: string): string => {
    switch (mode) {
        case DNS_REQUEST_OPTIONS.PARALLEL:
            return intl.getMessage('upstream_dns_parallel_requests');
        case DNS_REQUEST_OPTIONS.FASTEST_ADDR:
            return intl.getMessage('upstream_dns_fastest_addr');
        case DNS_REQUEST_OPTIONS.LOAD_BALANCING:
        default:
            return intl.getMessage('upstream_dns_load_balancing');
    }
};

export const getUpstreamServersSummary = (servers: string, upstreamDnsFile?: string): string => {
    if (upstreamDnsFile) {
        return intl.getMessage('upstream_dns_configured_in_file', { path: upstreamDnsFile });
    }
    if (!servers) return '';
    const lines = servers.split('\n').filter(Boolean);
    return lines.join(', ');
};

export const getRateLimitSummary = (ratelimit: number): string => {
    if (ratelimit === 0) return intl.getMessage('dns_rate_limit_no_limit');
    return intl.getMessage('dns_rate_limit_value', { value: ratelimit });
};

export const getBlockingModeSummary = (mode: string): string => {
    switch (mode) {
        case 'refused':
            return 'REFUSED';
        case 'nxdomain':
            return 'NXDOMAIN';
        case 'null_ip':
            return intl.getMessage('dns_blocking_mode_null_ip');
        case 'custom_ip':
            return intl.getMessage('dns_blocking_mode_custom_ip');
        default:
            return intl.getMessage('dns_blocking_mode_default');
    }
};

export const getCacheSizeSummary = (bytes?: number): string => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
};

export const getTtlSummary = (seconds?: number): string => {
    if (seconds === undefined || seconds === null) return '';
    return intl.getMessage('dns_ttl_value', { value: seconds });
};

export const getListSummary = (list: string): string => {
    if (!list || !list.trim()) return '';
    return list.split('\n').filter(Boolean).join(', ');
};
