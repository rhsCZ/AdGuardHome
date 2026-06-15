package home

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"testing"
	"testing/fstest"

	"github.com/AdguardTeam/AdGuardHome/internal/agh"
	"github.com/AdguardTeam/AdGuardHome/internal/aghalg"
	"github.com/AdguardTeam/AdGuardHome/internal/aghhttp"
	"github.com/AdguardTeam/AdGuardHome/internal/aghos"
	"github.com/AdguardTeam/AdGuardHome/internal/aghtls"
	"github.com/AdguardTeam/AdGuardHome/internal/aghuser"
	"github.com/AdguardTeam/AdGuardHome/internal/client"
	"github.com/AdguardTeam/AdGuardHome/internal/dnsforward"
	"github.com/AdguardTeam/golibs/netutil"
	"github.com/AdguardTeam/golibs/netutil/urlutil"
	"github.com/AdguardTeam/golibs/testutil"
	"github.com/AdguardTeam/golibs/timeutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/hpack"
)

const (
	// clientPreface is the message sent to the server as a final confirmation
	// of HTTP2 usage.
	clientPreface = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"

	// testSettings is a common value of the HTTP2-Settings header for tests.
	testSettings = "AAEAABAAAAIAAAABAAQAAP__AAUAAEAAAAgAAAAAAAMAAABkAAYAAQAA"

	// testHpackMaxDynamicTableSize is the common HPACK max dynamic table size
	// value for tests.
	testHPACKMaxDynamicTableSize = 4096

	// testTargetStreamID is a common HTTP2 stream ID for sending requests after
	// an upgrade.
	//
	// NOTE: The upgrade request implicitly uses Stream ID 1, so the first
	// client-side valid ID is 3.
	testTargetStreamID = 3
)

// h2c upgrade headers.
//
// TODO(a.garipov): Add to httphdr.
const (
	headerConnection    = "Connection"
	headerUpgrade       = "Upgrade"
	headerHTTP2Settings = "HTTP2-Settings"
)

// h2c upgrade header values for tests.
const (
	testHeaderValueConnection = "Upgrade, HTTP2-Settings"
	testHeaderValueUpgrade    = "h2c"
)

// testDecoder implements HTTP2 HPACK-encoded headers decoding for tests.
type testDecoder struct {
	decoder *hpack.Decoder
	status  int
}

// newTestDecoder returns a properly initialized *testDecoder.
func newTestDecoder(tb testing.TB) (d *testDecoder) {
	tb.Helper()

	d = &testDecoder{}
	d.decoder = hpack.NewDecoder(testHPACKMaxDynamicTableSize, func(f hpack.HeaderField) {
		if f.Name != ":status" {
			return
		}

		status64, err := strconv.ParseInt(f.Value, 10, 64)
		require.NoError(tb, err)

		d.status = int(status64)
	})

	return d
}

// decodeStatus decodes an HPACK-encoded header block and returns the HTTP
// status code.
func (d *testDecoder) decodeStatus(tb testing.TB, b []byte) (status int) {
	tb.Helper()

	d.status = 0

	_, err := d.decoder.Write(b)
	require.NoError(tb, err)

	return d.status
}

func TestWebAPI_h2cVulnerability(t *testing.T) {
	storeGlobals(t)

	stop := make(chan struct{})
	t.Cleanup(func() {
		testutil.RequireReceive(t, stop, testTimeout)
	})

	password := "password"
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	require.NoError(t, err)

	fs := fstest.MapFS{
		"build/static/login.html": &fstest.MapFile{
			Data: []byte("foo"),
			Mode: aghos.DefaultPermFile,
		},
	}

	user := webUser{
		Name:         "foo",
		PasswordHash: string(passwordHash),
		UserID:       aghuser.MustNewUserID(),
	}

	mux := http.NewServeMux()
	auth, err := newAuth(testutil.ContextWithTimeout(t, testTimeout), &authConfig{
		baseLogger:     testLogger,
		rateLimiter:    emptyRateLimiter{},
		trustedProxies: testTrustedProxies,
		dbFilename:     path.Join(t.TempDir(), "sessions.db"),
		users:          []webUser{user},
		sessionTTL:     testTimeout,
		isGLiNet:       false,
		mux:            mux,
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		ctx := testutil.ContextWithTimeout(t, testTimeout)
		auth.close(ctx)
	})

	mw := &webMw{}
	registrar := aghhttp.NewDefaultRegistrar(mux, mw.wrap)
	web := newTestWeb(t, &webConfig{
		baseLogger:    testLogger,
		auth:          auth,
		mux:           mux,
		httpReg:       registrar,
		clientBuildFS: fs,
	})

	mw.set(web)
	globalContext.web = web

	port := config.HTTPConfig.Address.Port()
	host := fmt.Sprintf("%s:%d", netutil.IPv4Localhost(), port)

	go func() {
		ctx := testutil.ContextWithTimeout(t, testTimeout)
		web.start(ctx)
		close(stop)
	}()

	t.Cleanup(func() {
		ctx := testutil.ContextWithTimeout(t, testTimeout)
		web.close(ctx)
	})

	waitForWebAPIReady(t, host)
	performH2CUpgradeAttack(t, host)
}

// waitForWebAPIReady waits until the [webAPI] server has started and is ready
// to accept connections.
func waitForWebAPIReady(tb testing.TB, host string) {
	tb.Helper()

	u := (&url.URL{
		Scheme: urlutil.SchemeHTTP,
		Host:   host,
		Path:   "/login.html",
	}).String()

	require.EventuallyWithT(tb, func(c *assert.CollectT) {
		ctx := testutil.ContextWithTimeout(tb, testTimeout)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		require.NoError(c, err)

		resp, err := http.DefaultClient.Do(req)
		require.NoError(c, err)
		assert.Equal(c, http.StatusOK, resp.StatusCode)
	}, testTimeout, testTimeout/10)
}

// performH2CUpgradeAttack establishes a TCP connection to the specified host,
// performs an HTTP2 protocol upgrade, and attempts to access a protected
// endpoint without proper authentication, verifying that the server responds
// with [http.StatusUnauthorized].
func performH2CUpgradeAttack(tb testing.TB, host string) {
	tb.Helper()

	dialer := &net.Dialer{}
	ctx := testutil.ContextWithTimeout(tb, testTimeout)

	conn, err := dialer.DialContext(ctx, "tcp", host)
	require.NoError(tb, err)
	testutil.CleanupAndRequireSuccess(tb, conn.Close)

	writer := bufio.NewWriter(conn)
	reader := bufio.NewReader(conn)

	u := &url.URL{
		Scheme: urlutil.SchemeHTTP,
		Host:   host,
		Path:   "/control/login",
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	require.NoError(tb, err)

	req.Header.Set(headerConnection, testHeaderValueConnection)
	req.Header.Set(headerUpgrade, testHeaderValueUpgrade)
	req.Header.Set(headerHTTP2Settings, testSettings)

	err = req.Write(writer)
	require.NoError(tb, err)
	require.NoError(tb, writer.Flush())

	resp, err := http.ReadResponse(reader, req)
	require.NoError(tb, err)
	require.Equal(tb, http.StatusSwitchingProtocols, resp.StatusCode)
	testutil.CleanupAndRequireSuccess(tb, resp.Body.Close)

	_, err = writer.Write([]byte(clientPreface))
	require.NoError(tb, err)

	framer := http2.NewFramer(writer, reader)
	decoder := newTestDecoder(tb)
	performH2CSettingsExchange(tb, framer, writer, decoder)
	sendH2CRequest(tb, framer, host)
	require.NoError(tb, writer.Flush())

	readH2CResponse(tb, framer, decoder)
}

// performH2CSettingsExchange performs the HTTP2 settings exchange handshake. It
// sends empty client settings, waits for acknowledgement, and then receives the
// server settings and responds with acknowledgement.  framer, writer and
// decoder must not be nil.
func performH2CSettingsExchange(
	tb testing.TB,
	framer *http2.Framer,
	writer *bufio.Writer,
	decoder *testDecoder,
) {
	tb.Helper()

	err := framer.WriteSettings()
	require.NoError(tb, err)
	require.NoError(tb, writer.Flush())

	var (
		gotServerSettings bool
		gotSettingsAck    bool
	)
	for !gotServerSettings || !gotSettingsAck {
		var frame http2.Frame
		frame, err = framer.ReadFrame()
		require.NoError(tb, err)

		switch f := frame.(type) {
		case *http2.HeadersFrame:
			// NOTE: The decoder must process all headers frames because the
			// client and server share the same HPACK dynamic table.  Skipping
			// frames causes index desynchronization.
			decoder.decodeStatus(tb, f.HeaderBlockFragment())
		case *http2.SettingsFrame:
			if f.IsAck() {
				gotSettingsAck = true

				continue
			}

			err = framer.WriteSettingsAck()
			require.NoError(tb, err)
			require.NoError(tb, writer.Flush())

			gotServerSettings = true
		}
	}
}

// sendH2CRequest writes a request to a protected endpoint into the framer.
// framer must not be nil.
func sendH2CRequest(tb testing.TB, framer *http2.Framer, host string) {
	tb.Helper()

	var headerBlockFragment bytes.Buffer
	enc := hpack.NewEncoder(&headerBlockFragment)
	headers := []hpack.HeaderField{
		{Name: ":method", Value: http.MethodGet},
		{Name: ":path", Value: "/control/status"},
		{Name: ":scheme", Value: urlutil.SchemeHTTP},
		{Name: ":authority", Value: host},
	}

	for _, h := range headers {
		require.NoError(tb, enc.WriteField(h))
	}

	err := framer.WriteHeaders(http2.HeadersFrameParam{
		StreamID:      testTargetStreamID,
		BlockFragment: headerBlockFragment.Bytes(),
		EndHeaders:    true,
		EndStream:     true,
	})
	require.NoError(tb, err)
}

// readH2CResponse reads the response from an h2c connection and asserts that
// the server responds with [http.StatusUnauthorized].  framer and decoder must
// not be nil.
func readH2CResponse(tb testing.TB, framer *http2.Framer, decoder *testDecoder) {
	tb.Helper()

	for {
		frame, err := framer.ReadFrame()
		require.NoError(tb, err)

		if frame.Header().StreamID != testTargetStreamID {
			headerFrame, ok := frame.(*http2.HeadersFrame)
			if ok {
				decoder.decodeStatus(tb, headerFrame.HeaderBlockFragment())
			}

			continue
		}

		headerFrame := testutil.RequireTypeAssert[*http2.HeadersFrame](tb, frame)
		require.True(tb, headerFrame.StreamEnded())

		status := decoder.decodeStatus(tb, headerFrame.HeaderBlockFragment())
		assert.Equal(tb, http.StatusUnauthorized, status)

		break
	}
}

func TestWebAPI_HandleTLSConfigure(t *testing.T) {
	// Store the global state before making any changes.
	storeGlobals(t)

	var (
		ctx = testutil.ContextWithTimeout(t, testTimeout)
		err error
	)

	globalContext.dnsServer, err = dnsforward.NewServer(dnsforward.DNSCreateParams{
		Logger: testLogger,
	})
	require.NoError(t, err)

	err = globalContext.dnsServer.Prepare(
		testutil.ContextWithTimeout(t, testTimeout),
		&dnsforward.ServerConfig{
			TLSConf: &dnsforward.TLSConfig{},
			Config: dnsforward.Config{
				UpstreamMode:     dnsforward.UpstreamModeLoadBalance,
				EDNSClientSubnet: &dnsforward.EDNSClientSubnet{Enabled: false},
				ClientsContainer: dnsforward.EmptyClientsContainer{},
			},
			ServePlainDNS: true,
		})
	require.NoError(t, err)

	globalContext.clients.storage, err = client.NewStorage(ctx, &client.StorageConfig{
		BaseLogger: testLogger,
		Logger:     testLogger,
		Clock:      timeutil.SystemClock{},
	})
	require.NoError(t, err)

	config.DNS.BindHosts = []netip.Addr{netutil.IPv4Localhost()}
	config.DNS.Port = 0

	const wantSerialNumber int64 = 1

	// Prepare the TLS manager configuration.
	tmpDir := t.TempDir()
	certPath := filepath.Join(tmpDir, "cert.pem")
	keyPath := filepath.Join(tmpDir, "key.pem")

	certDER, key := newCertAndKey(t, wantSerialNumber)
	writeCertAndKey(t, certDER, certPath, key, keyPath)

	// Initialize the TLS manager and assert its configuration.
	m, err := newTLSManager(ctx, &tlsManagerConfig{
		logger:       testLogger,
		confModifier: agh.EmptyConfigModifier{},
		manager:      aghtls.EmptyManager{},
		tlsSettings: tlsConfigSettings{
			Enabled:         true,
			CertificatePath: certPath,
			PrivateKeyPath:  keyPath,
			ServePlainDNS:   true,
		},
		servePlainDNS: true,
	})
	require.NoError(t, err)

	web := newTestWeb(t, &webConfig{tlsManager: m})
	m.setWebAPI(web)

	extTLSConf := m.extendedTLSConfig()
	assertCertSerialNumber(t, extTLSConf, wantSerialNumber)

	// Prepare a request with the new TLS configuration.
	setts := &tlsConfigSettingsExt{
		tlsConfigSettings: tlsConfigSettings{
			Enabled:         true,
			PortHTTPS:       4433,
			CertificatePath: testCertificatePath,
			PrivateKeyPath:  testPrivateKeyPath,
		},
	}

	req, err := json.Marshal(setts)
	require.NoError(t, err)

	r := httptest.NewRequest(http.MethodPost, "/control/tls/configure", bytes.NewReader(req))
	w := httptest.NewRecorder()

	// Reconfigure the TLS manager.
	web.handleTLSConfigure(w, r)

	// The [webAPI.handleTLSConfigure] method will start the DNS server and
	// it should be stopped after the test ends.
	testutil.CleanupAndRequireSuccess(t, func() (err error) {
		return globalContext.dnsServer.Stop(testutil.ContextWithTimeout(t, testTimeout))
	})

	res := &tlsConfig{
		tlsConfigStatus: &tlsConfigStatus{},
	}

	err = json.NewDecoder(w.Body).Decode(res)
	require.NoError(t, err)

	testCertChainData := requireReadFile(t, testCertificatePath)
	testPrivateKeyData := requireReadFile(t, testPrivateKeyPath)

	cert, err := tls.X509KeyPair(testCertChainData, testPrivateKeyData)
	require.NoError(t, err)

	wantIssuer := cert.Leaf.Issuer.String()
	assert.Equal(t, wantIssuer, res.tlsConfigStatus.Issuer)

	// Assert that the Web API's TLS configuration has been updated.
	//
	// TODO(s.chzhen):  Remove when [httpsServer.cond] is removed.
	assert.Eventually(t, func() bool {
		web.httpsServer.condLock.Lock()
		defer web.httpsServer.condLock.Unlock()

		cert = web.httpsServer.cert
		if cert.Leaf == nil {
			return false
		}

		assert.Equal(t, wantIssuer, cert.Leaf.Issuer.String())

		return true
	}, testTimeout, testTimeout/10)
}

func TestWebAPI_HandleTLSStatus(t *testing.T) {
	var (
		ctx = testutil.ContextWithTimeout(t, testTimeout)
		err error
	)

	testCertChain := requireReadFile(t, testCertificatePath)
	testPrivateKeyData := requireReadFile(t, testPrivateKeyPath)

	m, err := newTLSManager(ctx, &tlsManagerConfig{
		logger:       testLogger,
		confModifier: agh.EmptyConfigModifier{},
		manager:      aghtls.EmptyManager{},
		tlsSettings: tlsConfigSettings{
			Enabled:          true,
			CertificateChain: string(testCertChain),
			PrivateKey:       string(testPrivateKeyData),
		},
		servePlainDNS: false,
	})
	require.NoError(t, err)

	web := newTestWeb(t, &webConfig{tlsManager: m})
	m.setWebAPI(web)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/control/tls/status", nil)
	web.handleTLSStatus(w, r)

	res := &tlsConfigSettingsExt{}
	err = json.NewDecoder(w.Body).Decode(res)
	require.NoError(t, err)

	wantCertificateChain := base64.StdEncoding.EncodeToString(testCertChain)
	assert.True(t, res.Enabled)
	assert.Equal(t, wantCertificateChain, res.CertificateChain)
	assert.True(t, res.PrivateKeySaved)
}

func TestWebAPI_ValidateTLSSettings(t *testing.T) {
	storeGlobals(t)

	var (
		ctx = testutil.ContextWithTimeout(t, testTimeout)
		err error
	)

	m, err := newTLSManager(ctx, &tlsManagerConfig{
		logger:        testLogger,
		confModifier:  agh.EmptyConfigModifier{},
		manager:       aghtls.EmptyManager{},
		servePlainDNS: false,
	})
	require.NoError(t, err)

	web := newTestWeb(t, &webConfig{tlsManager: m})
	m.setWebAPI(web)

	tcpLn, err := net.Listen("tcp", ":0")
	require.NoError(t, err)

	testutil.CleanupAndRequireSuccess(t, tcpLn.Close)

	tcpAddr := testutil.RequireTypeAssert[*net.TCPAddr](t, tcpLn.Addr())
	busyTCPPort := tcpAddr.Port

	udpLn, err := net.ListenPacket("udp", ":0")
	require.NoError(t, err)

	testutil.CleanupAndRequireSuccess(t, udpLn.Close)

	udpAddr := testutil.RequireTypeAssert[*net.UDPAddr](t, udpLn.LocalAddr())
	busyUDPPort := udpAddr.Port

	testCases := []struct {
		name    string
		wantErr string
		setts   tlsConfigSettingsExt
	}{{
		name:    "basic",
		wantErr: "",
		setts:   tlsConfigSettingsExt{},
	}, {
		name:    "disabled_all",
		wantErr: "plain DNS is required in case encryption protocols are disabled",
		setts: tlsConfigSettingsExt{
			ServePlainDNS: aghalg.NBFalse,
		},
	}, {
		name:    "busy_https_port",
		wantErr: fmt.Sprintf("port %d for HTTPS is not available", busyTCPPort),
		setts: tlsConfigSettingsExt{
			tlsConfigSettings: tlsConfigSettings{
				Enabled:   true,
				PortHTTPS: uint16(busyTCPPort),
			},
		},
	}, {
		name:    "busy_dot_port",
		wantErr: fmt.Sprintf("port %d for DNS-over-TLS is not available", busyTCPPort),
		setts: tlsConfigSettingsExt{
			tlsConfigSettings: tlsConfigSettings{
				Enabled:        true,
				PortDNSOverTLS: uint16(busyTCPPort),
			},
		},
	}, {
		name:    "busy_doq_port",
		wantErr: fmt.Sprintf("port %d for DNS-over-QUIC is not available", busyUDPPort),
		setts: tlsConfigSettingsExt{
			tlsConfigSettings: tlsConfigSettings{
				Enabled:         true,
				PortDNSOverQUIC: uint16(busyUDPPort),
			},
		},
	}, {
		name:    "duplicate_port",
		wantErr: "validating tcp ports: duplicated values: [4433]",
		setts: tlsConfigSettingsExt{
			tlsConfigSettings: tlsConfigSettings{
				Enabled:        true,
				PortHTTPS:      4433,
				PortDNSOverTLS: 4433,
			},
		},
	}}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err = web.validateTLSSettings(tc.setts)
			testutil.AssertErrorMsg(t, tc.wantErr, err)
		})
	}
}

func TestWebAPI_HandleTLSValidate(t *testing.T) {
	storeGlobals(t)

	var (
		ctx = testutil.ContextWithTimeout(t, testTimeout)
		err error
	)

	m, err := newTLSManager(ctx, &tlsManagerConfig{
		logger:       testLogger,
		confModifier: agh.EmptyConfigModifier{},
		manager:      aghtls.EmptyManager{},
		tlsSettings: tlsConfigSettings{
			Enabled:         true,
			CertificatePath: testCertificatePath,
			PrivateKeyPath:  testPrivateKeyPath,
		},
		servePlainDNS: false,
	})
	require.NoError(t, err)

	web := newTestWeb(t, &webConfig{tlsManager: m})
	m.setWebAPI(web)

	setts := &tlsConfigSettingsExt{
		tlsConfigSettings: tlsConfigSettings{
			Enabled:         true,
			CertificatePath: testCertificatePath,
			PrivateKeyPath:  testPrivateKeyPath,
		},
	}

	req, err := json.Marshal(setts)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/control/tls/validate", bytes.NewReader(req))
	web.handleTLSValidate(w, r)

	res := &tlsConfigStatus{}
	err = json.NewDecoder(w.Body).Decode(res)
	require.NoError(t, err)

	testCertChainData := requireReadFile(t, testCertificatePath)
	testPrivateKeyData := requireReadFile(t, testPrivateKeyPath)

	cert, err := tls.X509KeyPair(testCertChainData, testPrivateKeyData)
	require.NoError(t, err)

	wantIssuer := cert.Leaf.Issuer.String()
	assert.Equal(t, wantIssuer, res.Issuer)
}

// requireReadFile reads the file at the specified path and returns its content.
//
// TODO(m.kazantsev):  Move to golibs/testutil.
func requireReadFile(tb testing.TB, path string) (data []byte) {
	tb.Helper()

	data, err := os.ReadFile(path)
	require.NoError(tb, err)

	return data
}
