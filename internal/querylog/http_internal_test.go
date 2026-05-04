package querylog

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/AdguardTeam/AdGuardHome/internal/aghnet"
	"github.com/AdguardTeam/AdGuardHome/internal/filtering"
	"github.com/AdguardTeam/golibs/timeutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// test domains for querylog search testing.
const (
	testDomainBlocked  = "blocked.org"
	testDomainNotFound = "notfound.org"
	testDomainRewriten = "rewritten.org"
)

// response is the GET /control/querylog HTTP response structure.
type response struct {
	Data []data `json:"data"`
}

// data is a single querylog entry in the response.
type data struct {
	Question question `json:"question"`
}

// question is the DNS question part of a querylog entry.
type question struct {
	Name string `json:"name"`
}

// parseHostNamesFromEntry is a helper that parses the /control/querylog
// response and extracts the host names from it.
func parseHostNamesFromEntry(tb testing.TB, in io.Reader) (hostNames []string) {
	tb.Helper()

	var resp response
	err := json.NewDecoder(in).Decode(&resp)
	require.NoError(tb, err)

	for _, d := range resp.Data {
		hostNames = append(hostNames, d.Question.Name)
	}

	return hostNames
}

func TestQuerylog_HandleQueryLog_reasonSearchCriterion(t *testing.T) {
	l, err := newQueryLog(Config{
		Logger:      testLogger,
		Enabled:     true,
		FileEnabled: true,
		RotationIvl: timeutil.Day,
		MemSize:     100,
		BaseDir:     t.TempDir(),
		Anonymizer:  aghnet.NewIPMut(nil),
	})
	require.NoError(t, err)

	addTestEntry(
		l,
		testDomainNotFound,
		testAnswerIPv4,
		testClientIPv4,
		filtering.NotFilteredNotFound,
	)
	addTestEntry(
		l,
		testDomainBlocked,
		testAnswerIPv4,
		testClientIPv4,
		filtering.FilteredBlockList,
	)
	addTestEntry(
		l,
		testDomainRewriten,
		testAnswerIPv4,
		testClientIPv4,
		filtering.Rewritten,
	)

	testCases := []struct {
		name       string
		query      string
		wantMsg    string
		wantHosts  []string
		wantStatus int
	}{{
		name:       "no_params",
		query:      "",
		wantMsg:    "",
		wantStatus: http.StatusOK,
		wantHosts:  []string{testDomainRewriten, testDomainBlocked, testDomainNotFound},
	}, {
		name:  "reason_not_found",
		query: "reason=" + filtering.NotFilteredNotFound.String(),

		wantMsg:    "",
		wantStatus: http.StatusOK,
		wantHosts:  []string{testDomainNotFound},
	}, {
		name:       "reason_block_list",
		query:      "reason=" + filtering.FilteredBlockList.String(),
		wantMsg:    "",
		wantStatus: http.StatusOK,
		wantHosts:  []string{testDomainBlocked},
	}, {
		name:       "reason_rewritten",
		query:      "reason=" + filtering.Rewritten.String(),
		wantMsg:    "",
		wantStatus: http.StatusOK,
		wantHosts:  []string{testDomainRewriten},
	}, {
		name: "multiple_reasons",
		query: "reason=" + filtering.Rewritten.String() + "&reason=" +
			filtering.FilteredBlockList.String(),
		wantMsg:    "",
		wantStatus: http.StatusOK,
		wantHosts:  []string{testDomainRewriten, testDomainBlocked},
	}, {
		name:       "invalid_reason",
		query:      "reason=InvalidReason",
		wantMsg:    `parsing params: reason: bad enum value: "InvalidReason"` + "\n",
		wantStatus: http.StatusBadRequest,
		wantHosts:  nil,
	}, {
		name:  "reason_and_status_conflict",
		query: "reason=Rewritten&response_status=all",
		wantMsg: `parsing params: "reason" and "response_status"` +
			` criteria cannot be used together` + "\n",
		wantStatus: http.StatusBadRequest,
		wantHosts:  nil,
	}}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			u := url.URL{
				Path:     "/control/querylog",
				RawQuery: tc.query,
			}
			req := httptest.NewRequest(http.MethodGet, u.String(), nil)
			w := httptest.NewRecorder()

			l.handleQueryLog(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
			if tc.wantStatus != http.StatusOK {
				var msg []byte
				msg, err = io.ReadAll(w.Body)
				require.NoError(t, err)

				assert.Equal(t, tc.wantMsg, string(msg))

				return
			}

			gotHosts := parseHostNamesFromEntry(t, w.Body)
			assert.Equal(t, tc.wantHosts, gotHosts)
		})
	}
}
