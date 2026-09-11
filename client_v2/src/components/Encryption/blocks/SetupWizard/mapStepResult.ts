import intl from 'panel/common/intl';
import { ENCRYPTION_SOURCE } from 'panel/helpers/constants';
import type { EncryptionFormValues } from '../../validate';
import type { ValidationResult, WizardStep } from '../helpers';

export type MessageKind = 'error' | 'warning';

/** A validation result bound to a wizard step. */
export type StepMessage = {
    /** Field to render under; `undefined` means the message is form-level. */
    field?: keyof EncryptionFormValues;
    kind: MessageKind;
    message: string;
    /** True when the message can only be fixed on an earlier step. */
    goBack?: boolean;
};

/** Fields rendered on each step, so messages can be attached to a visible field. */
export const STEP_FIELDS: Record<WizardStep, ReadonlySet<string>> = {
    1: new Set(['certificate_chain', 'certificate_path']),
    2: new Set(['private_key', 'private_key_path']),
    3: new Set(['server_name', 'port_https', 'port_dns_over_tls', 'port_dns_over_quic']),
};

type CertField = 'certificate_chain' | 'certificate_path';
type KeyField = 'private_key' | 'private_key_path';

const msg = (key: string, params?: Record<string, string>) => intl.getMessage(key, params);

const certField = (v: EncryptionFormValues): CertField =>
    v.certificate_source === ENCRYPTION_SOURCE.PATH ? 'certificate_path' : 'certificate_chain';

const keyFieldOf = (v: EncryptionFormValues): KeyField =>
    v.key_source === ENCRYPTION_SOURCE.PATH ? 'private_key_path' : 'private_key';

/** Maps `warning_validation` / 400 text about the certificate. */
const mapCertText = (text: string, field: CertField, certValid: boolean): StepMessage => {
    if (text.includes('reading cert file')) {
        return { field, kind: 'error', message: msg('tls_setup_error_read_cert') };
    }
    if (text.includes('empty certificate')) {
        return { field, kind: 'error', message: msg('tls_setup_error_not_a_cert') };
    }
    if (text.includes('parsing certificate at index')) {
        return { field, kind: 'error', message: msg('tls_setup_error_parse_cert') };
    }
    if (text.includes('certificate does not verify')) {
        return { field, kind: 'warning', message: msg('tls_setup_warning_cert_untrusted') };
    }
    if (text.includes('certificates has no IP addresses')) {
        return { field, kind: 'warning', message: msg('tls_setup_warning_no_ip') };
    }

    // A certificate that parsed only ever warns; an unparsed one is an error.
    if (certValid) {
        return {
            field,
            kind: 'warning',
            message: text || msg('tls_setup_warning_cert_untrusted'),
        };
    }

    return { field, kind: 'error', message: msg('tls_setup_error_cert_has_issues') };
};

/** Maps `warning_validation` / 400 text about the private key and the pair. */
const mapKeyText = (text: string, field: KeyField): StepMessage => {
    if (text.includes('reading key file')) {
        return { field, kind: 'error', message: msg('tls_setup_error_read_key') };
    }
    if (text.includes('no valid keys were found')) {
        return { field, kind: 'error', message: msg('tls_setup_error_not_a_key') };
    }
    if (text.includes('parsing private key')) {
        return { field, kind: 'error', message: msg('tls_setup_error_parse_key') };
    }
    if (text.includes('ED25519 keys are not supported')) {
        return { field, kind: 'error', message: msg('tls_setup_error_ed25519_key') };
    }
    if (text.includes('certificate-key pair')) {
        return { field, kind: 'error', message: msg('tls_setup_error_key_mismatch') };
    }

    // Defensive: an empty backend text still blocks, with a generic message.
    return { field, kind: 'error', message: text || msg('tls_setup_error_parse_key') };
};

const PROTO_FIELDS: Record<string, keyof EncryptionFormValues> = {
    HTTPS: 'port_https',
    'DNS-over-TLS': 'port_dns_over_tls',
    'DNS-over-QUIC': 'port_dns_over_quic',
};

/** Maps plain-text 400 bodies and config-step warnings. */
const mapConfigText = (text: string, values: EncryptionFormValues): StepMessage => {
    const busy = text.match(/port (\d+) for (HTTPS|DNS-over-TLS|DNS-over-QUIC) is not available/);
    if (busy) {
        return {
            field: PROTO_FIELDS[busy[2]],
            kind: 'error',
            message: msg('tls_setup_error_port_busy', { port: busy[1], protocol: busy[2] }),
        };
    }

    const dup = text.match(/duplicated values: \[(\d+)/);
    if (dup) {
        // No field and no goBack hint: the conflicting port is edited right here
        // on step 3 (client-side `validatePortConflicts` normally catches this
        // first; the backend duplicate report also covers external settings).
        return {
            kind: 'error',
            message: msg('tls_setup_error_duplicate_port', { port: dup[1] }),
        };
    }

    if (text.includes('certificate does not verify')) {
        if (text.includes('certificate is valid for')) {
            return {
                field: 'server_name',
                kind: 'error',
                message: msg('tls_setup_error_server_name_mismatch', {
                    hostname: String(values.server_name ?? ''),
                }),
            };
        }
        if (text.includes('signed by unknown authority')) {
            return { kind: 'warning', message: msg('tls_setup_warning_cert_untrusted') };
        }

        return { kind: 'error', message: msg('tls_setup_error_cert_has_issues'), goBack: true };
    }
    if (text.includes('certificates has no IP addresses')) {
        return { kind: 'warning', message: msg('tls_setup_warning_no_ip') };
    }
    if (text.includes('certificate-key pair') || text.includes('parsing private key')) {
        return { kind: 'error', message: msg('tls_setup_error_key_mismatch'), goBack: true };
    }

    return { kind: 'error', message: text };
};

/**
 * Turns a per-step backend result into the single inline message to show, or
 * undefined when the step is clean.  `kind === 'error'` blocks advancing.
 */
export const mapStepResult = (
    step: WizardStep,
    res: ValidationResult,
    values: EncryptionFormValues,
): StepMessage | undefined => {
    const cert = certField(values);
    const key = keyFieldOf(values);

    if ('error' in res) {
        const text = res.error;

        if (step === 1) return mapCertText(text, cert, false);
        if (step === 2) return mapKeyText(text, key);

        return mapConfigText(text, values);
    }

    const text = res.warning_validation ?? '';

    if (step === 1) {
        if (res.valid_cert && !text) return undefined;

        return mapCertText(text, cert, !!res.valid_cert);
    }

    if (step === 2) {
        if (!res.valid_cert) return { ...mapCertText(text, cert, false), goBack: true };

        if (!res.valid_key) return mapKeyText(text, key);

        if (!res.valid_pair) {
            return text
                ? mapKeyText(text, key)
                : { field: key, kind: 'error', message: msg('tls_setup_error_key_mismatch') };
        }

        if (text) return mapCertText(text, cert, true);

        return undefined;
    }

    const pairValid = !!(res.valid_cert && res.valid_key && res.valid_pair);
    if (!pairValid && !text) {
        return {
            kind: 'error',
            message: msg('tls_setup_error_cert_has_issues'),
            goBack: true,
        };
    }

    return text ? mapConfigText(text, values) : undefined;
};
