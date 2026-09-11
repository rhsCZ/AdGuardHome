import { describe, it, expect } from 'vitest';
import { mapStepResult } from 'panel/components/Encryption/blocks/SetupWizard/mapStepResult';
import { ENCRYPTION_SOURCE } from 'panel/helpers/constants';

const certValues = {
    certificate_source: ENCRYPTION_SOURCE.CONTENT,
    key_source: ENCRYPTION_SOURCE.CONTENT,
};

const validStatus = {
    valid_chain: true,
    valid_cert: true,
    valid_key: true,
    valid_pair: true,
    subject: 'CN=example.com',
    warning_validation: '',
};

describe('mapStepResult — step 1 (certificate)', () => {
    it('maps an unparsed certificate to the certificate field', () => {
        const m = mapStepResult(
            1,
            {
                ...validStatus,
                valid_cert: false,
                valid_key: false,
                valid_pair: false,
                warning_validation:
                    'validating certificate pair: parsing certificate at index 0: x509: malformed certificate',
            },
            certValues,
        );
        expect(m).toEqual({
            field: 'certificate_chain',
            kind: 'error',
            message: 'Unable to parse the certificate. The file may be corrupted',
        });
    });

    it('maps an untrusted chain to a non-blocking warning', () => {
        const m = mapStepResult(
            1,
            {
                ...validStatus,
                valid_key: false,
                valid_pair: false,
                warning_validation:
                    'validating certificate pair: certificate does not verify: x509: certificate signed by unknown authority',
            },
            certValues,
        );
        expect(m?.kind).toBe('warning');
        expect(m?.field).toBe('certificate_chain');
        expect(m?.message).toBe(
            'This certificate is self-signed — it may not work on all devices. Make sure your devices will accept it',
        );
    });

    it('maps the missing-IP warning to the certificate field', () => {
        const m = mapStepResult(
            1,
            {
                ...validStatus,
                valid_key: false,
                valid_pair: false,
                warning_validation: 'certificates has no IP addresses',
            },
            certValues,
        );
        expect(m).toEqual({
            field: 'certificate_chain',
            kind: 'warning',
            message:
                'The certificate does not contain IP addresses. DDR and DNS-over-TLS may not work properly',
        });
    });

    it('returns nothing for a clean cert-only step 1 response', () => {
        expect(
            mapStepResult(
                1,
                { ...validStatus, valid_key: false, valid_pair: false },
                certValues,
            ),
        ).toBeUndefined();
    });

    it('maps an unclassified invalid certificate to a blocking error', () => {
        const m = mapStepResult(
            1,
            { ...validStatus, valid_cert: false, warning_validation: '' },
            certValues,
        );
        expect(m).toEqual({
            field: 'certificate_chain',
            kind: 'error',
            message:
                'Certificate has issues. Check subject, issuer, validity, and hostnames',
        });
    });

    it('attaches messages to the path field when the source is a file path', () => {
        const m = mapStepResult(
            1,
            {
                ...validStatus,
                valid_cert: false,
                warning_validation: 'reading cert file: no such file or directory',
            },
            { ...certValues, certificate_source: ENCRYPTION_SOURCE.PATH },
        );
        expect(m).toEqual({
            field: 'certificate_path',
            kind: 'error',
            message: 'Unable to read the certificate file at the specified path',
        });
    });

    it('treats a transport error as a blocking message for the certificate', () => {
        const m = mapStepResult(1, { error: 'network is unreachable' }, certValues);
        expect(m?.kind).toBe('error');
        expect(m?.message).toBe(
            'Certificate has issues. Check subject, issuer, validity, and hostnames',
        );
    });
});

describe('mapStepResult — step 2 (private key)', () => {
    it('maps a key/cert pair mismatch to the key field', () => {
        const m = mapStepResult(
            2,
            {
                ...validStatus,
                valid_pair: false,
                warning_validation:
                    'validating certificate pair: certificate-key pair: tls: private key does not match public key',
            },
            certValues,
        );
        expect(m).toEqual({
            field: 'private_key',
            kind: 'error',
            message: 'This private key does not match the certificate from the previous step',
        });
    });

    it('maps an unparsed key on step 2 to a blocking error under the key field', () => {
        const m = mapStepResult(
            2,
            {
                ...validStatus,
                valid_key: false,
                valid_pair: false,
                warning_validation:
                    'validating certificate pair: parsing private key: tls: failed to find any PEM data in key input',
            },
            certValues,
        );
        expect(m).toEqual({
            field: 'private_key',
            kind: 'error',
            message: 'Unable to parse the private key. The file may be corrupted',
        });
    });

    it('maps an unsupported key type to the key field', () => {
        const m = mapStepResult(
            2,
            {
                ...validStatus,
                valid_key: false,
                warning_validation:
                    'validating certificate pair: ED25519 keys are not supported by browsers; did you mean to use X25519 for key exchange?',
            },
            certValues,
        );
        expect(m?.message).toBe(
            'This key type is not supported by browsers. Use an RSA or ECDSA key instead',
        );
    });

    it('maps a pair failure without backend text to the key-mismatch message', () => {
        const m = mapStepResult(2, { ...validStatus, valid_pair: false }, certValues);
        expect(m).toEqual({
            field: 'private_key',
            kind: 'error',
            message: 'This private key does not match the certificate from the previous step',
        });
    });

    it('returns a go-back error when the certificate regresses before step 2', () => {
        const m = mapStepResult(
            2,
            {
                ...validStatus,
                valid_cert: false,
                valid_key: false,
                valid_pair: false,
                warning_validation:
                    'validating certificate pair: parsing certificate at index 0: x509: malformed certificate',
            },
            certValues,
        );
        expect(m).toEqual({
            // certificate_chain is not visible on step 2 → rendered form-level.
            field: 'certificate_chain',
            kind: 'error',
            message: 'Unable to parse the certificate. The file may be corrupted',
            goBack: true,
        });
    });

    it('returns nothing when the pair is valid and there is no warning', () => {
        expect(mapStepResult(2, validStatus, certValues)).toBeUndefined();
    });
});

describe('mapStepResult — step 3 (config)', () => {
    it('maps a hostname mismatch at the config step to the server name', () => {
        const m = mapStepResult(
            3,
            {
                ...validStatus,
                valid_chain: false,
                warning_validation:
                    'validating certificate pair: certificate does not verify: x509: certificate is valid for example.com, not dns.home.arpa',
            },
            { ...certValues, server_name: 'dns.home.arpa' },
        );
        expect(m).toEqual({
            field: 'server_name',
            kind: 'error',
            message:
                'The certificate is not valid for dns.home.arpa. Check the hostnames in the certificate',
        });
    });

    it('maps a self-signed chain at the config step to a form-level warning', () => {
        const m = mapStepResult(
            3,
            {
                ...validStatus,
                valid_chain: false,
                warning_validation:
                    'validating certificate pair: certificate does not verify: x509: certificate signed by unknown authority',
            },
            certValues,
        );
        expect(m).toEqual({
            kind: 'warning',
            message:
                'This certificate is self-signed — it may not work on all devices. Make sure your devices will accept it',
        });
    });

    it('maps a 400 port-busy error to the matching port field', () => {
        const m = mapStepResult(
            3,
            { error: 'port 853 for DNS-over-TLS is not available' },
            certValues,
        );
        expect(m).toEqual({
            field: 'port_dns_over_tls',
            kind: 'error',
            message: 'Port 853 is not available for DNS-over-TLS',
        });
    });

    it('maps a 400 HTTPS port-busy error to the HTTPS field', () => {
        const m = mapStepResult(3, { error: 'port 443 for HTTPS is not available' }, certValues);
        expect(m).toEqual({
            field: 'port_https',
            kind: 'error',
            message: 'Port 443 is not available for HTTPS',
        });
    });

    it('flags the fields involved when the backend reports duplicate ports', () => {
        const m = mapStepResult(
            3,
            { error: 'validating tcp ports: duplicated values: [9000]' },
            certValues,
        );
        expect(m?.kind).toBe('error');
        expect(m?.message).toBe('Port 9000 is used by multiple DNS protocols. It must be unique');
    });

    it('maps a pair failure at the config step to a go-back error', () => {
        const m = mapStepResult(
            3,
            {
                ...validStatus,
                valid_pair: false,
                warning_validation:
                    'validating certificate pair: certificate-key pair: tls: private key does not match public key',
            },
            certValues,
        );
        expect(m?.goBack).toBe(true);
        expect(m?.field).toBeUndefined();
        expect(m?.message).toBe(
            'This private key does not match the certificate from the previous step',
        );
    });

    it('returns a go-back error when nothing is valid and the backend stays silent', () => {
        const m = mapStepResult(
            3,
            {
                ...validStatus,
                valid_cert: false,
                valid_key: false,
                valid_pair: false,
                warning_validation: '',
            },
            certValues,
        );
        expect(m).toEqual({
            kind: 'error',
            message: 'Certificate has issues. Check subject, issuer, validity, and hostnames',
            goBack: true,
        });
    });

    it('returns nothing when the config step is clean', () => {
        expect(mapStepResult(3, validStatus, certValues)).toBeUndefined();
    });
});
