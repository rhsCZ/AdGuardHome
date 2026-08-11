package ossvc

import (
	"fmt"

	"github.com/AdguardTeam/golibs/timeutil"
	"github.com/kardianos/service"
)

// ConfigureServiceOptions defines additional settings of the service
// configuration.  conf must not be nil.
func ConfigureServiceOptions(conf *service.Config, clock timeutil.Clock, versionInfo string) {
	if conf.Option == nil {
		conf.Option = map[string]any{}
	}

	conf.Option["SvcInfo"] = fmt.Sprintf("%s %s", versionInfo, clock.Now())

	configureOSOptions(conf)
}
