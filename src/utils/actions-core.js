/**
 * `@actions/core`, as one mutable object.
 *
 * Since 3.0 the package is ESM-only, and an ESM namespace is read-only — so
 * `mock.method(core, "info", …)` in the tests would throw. Every module here
 * imports this object instead of the namespace, which keeps a single instance
 * that tests can replace methods on and the code then calls.
 */
import * as actionsCore from "@actions/core";

const core = { ...actionsCore };

export default core;
