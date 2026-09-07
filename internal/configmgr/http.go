package configmgr

import (
	"fmt"
	"regexp"

	"github.com/AdguardTeam/golibs/errors"
	"github.com/AdguardTeam/golibs/timeutil"
	"github.com/AdguardTeam/golibs/validate"
)

// HTTPConfig is the on-disk web API configuration.
//
// TODO(d.kolyshev):  Use.
type HTTPConfig struct {
	// DoH contains DNS-over-HTTPS configuration.
	DoH *DOHConfig `yaml:"doh"`

	// Pprof defines the profiling HTTP handler.
	Pprof *HTTPPprofConfig `yaml:"pprof"`

	// SessionTTL for a web session.
	SessionTTL timeutil.Duration `yaml:"session_ttl"`
}

// DOHConfig is the block with DNS-over-HTTPS configuration.
type DOHConfig struct {
	// Routes is the list of HTTP route patterns for DoH requests.  Each route
	// should be in the format "METHOD /path" or "METHOD /path/{param}".
	Routes []string `yaml:"routes"`

	// InsecureEnabled allows DoH queries via unencrypted HTTP.
	InsecureEnabled bool `yaml:"insecure_enabled"`
}

// HTTPPprofConfig is the block with pprof HTTP configuration.
type HTTPPprofConfig struct {
	// Port for the profiling handler.
	Port uint16 `yaml:"port"`

	// Enabled defines if the profiling handler is enabled.
	Enabled bool `yaml:"enabled"`
}

// type check
var _ validate.Interface = (*HTTPConfig)(nil)

// Validate implements the [validate.Interface] interface for *HTTPConfig.
func (c *HTTPConfig) Validate() (err error) {
	if c == nil {
		return nil
	}

	errs := []error{
		validate.Positive("session_ttl", c.SessionTTL),
	}

	errs = validate.Append(errs, "doh", c.DoH)
	errs = validate.Append(errs, "pprof", c.Pprof)

	return errors.Join(errs...)
}

// doHRoutePatternRegexp is a regular expression for validating DoH route
// patterns.
var doHRoutePatternRegexp = regexp.MustCompile(
	`^[A-Z]+ /[^\s{}]+(?:/[^\s{}]+)*(?:/\{[_A-Za-z][_A-Za-z0-9]*\})?$`,
)

// type check
var _ validate.Interface = (*DOHConfig)(nil)

// Validate implements the [validate.Interface] interface for *DOHConfig.
func (c *DOHConfig) Validate() (err error) {
	if c == nil {
		return nil
	}

	var errs []error
	for i, route := range c.Routes {
		if doHRoutePatternRegexp.MatchString(route) {
			continue
		}

		errs = append(errs, fmt.Errorf(`route %q at index %d: incorrect format`, route, i))
	}

	return errors.Join(errs...)
}

// type check
var _ validate.Interface = (*HTTPPprofConfig)(nil)

// Validate implements the [validate.Interface] interface for *HTTPPprofConfig.
func (c *HTTPPprofConfig) Validate() (err error) {
	return nil
}
