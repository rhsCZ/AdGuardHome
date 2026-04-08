//go:build linux

package ossvc

import (
	"testing"

	"github.com/AdguardTeam/golibs/testutil"
	"github.com/stretchr/testify/assert"
)

func TestSysvService_Install(t *testing.T) {
	t.Parallel()

	sysSvc := newTestService()

	testCases := []struct {
		cmdErr     error
		sysSvcErr  error
		name       string
		wantErrMsg string
	}{{
		cmdErr:     nil,
		sysSvcErr:  nil,
		name:       "success",
		wantErrMsg: "",
	}, {
		cmdErr:     nil,
		sysSvcErr:  assert.AnError,
		name:       "sys_svc_error",
		wantErrMsg: assert.AnError.Error(),
	}, {
		cmdErr:     assert.AnError,
		sysSvcErr:  nil,
		name:       "cmd_error",
		wantErrMsg: `starting: ` + assert.AnError.Error() + `; stderr peek: ""; stdout peek: ""`,
	}}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sysSvc.OnInstall = func() (err error) {
				return tc.sysSvcErr
			}

			svc := &sysvService{
				cmdCons: newTestCmdConstructor(t, "", tc.cmdErr),
				Service: sysSvc,
				name:    testServiceName,
			}

			err := svc.Install()
			testutil.AssertErrorMsg(t, tc.wantErrMsg, err)
		})
	}
}

func TestSysvService_Uninstall(t *testing.T) {
	t.Parallel()

	sysSvc := newTestService()

	testCases := []struct {
		cmdErr     error
		sysSvcErr  error
		name       string
		wantErrMsg string
	}{{
		cmdErr:     nil,
		sysSvcErr:  nil,
		name:       "success",
		wantErrMsg: "",
	}, {
		cmdErr:     nil,
		sysSvcErr:  assert.AnError,
		name:       "sys_svc_error",
		wantErrMsg: assert.AnError.Error(),
	}, {
		cmdErr:     assert.AnError,
		sysSvcErr:  nil,
		name:       "cmd_error",
		wantErrMsg: `starting: ` + assert.AnError.Error() + `; stderr peek: ""; stdout peek: ""`,
	}}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sysSvc.OnUninstall = func() (err error) {
				return tc.sysSvcErr
			}

			svc := &sysvService{
				cmdCons: newTestCmdConstructor(t, "", tc.cmdErr),
				Service: sysSvc,
				name:    testServiceName,
			}

			err := svc.Uninstall()
			testutil.AssertErrorMsg(t, tc.wantErrMsg, err)
		})
	}
}
