import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGACY_APPLICATION_CONFIGURATION,
  resolveApplicationConfiguration,
  resolveScenarioConfiguration,
  resolveWorkSampleConfiguration,
} from "../app/common/utils/jobConfiguration.ts";

// The API stores a job published before configurable journeys with an EMPTY
// configuration object. `{}` is truthy, so "config || legacy" did not fall back
// and the apply page crashed with "Cannot read properties of undefined
// (reading 'required')".
test("an empty stored configuration resolves to the legacy form", () => {
  for (const stored of [{}, null, undefined]) {
    const resolved = resolveApplicationConfiguration(stored);
    assert.deepEqual(resolved, LEGACY_APPLICATION_CONFIGURATION);
    assert.equal(resolved.resume.required, true);
    assert.equal(resolved.linkedin.required, true);
  }
});

test("every field is present even when a job stored only some of them", () => {
  const resolved = resolveApplicationConfiguration({ resume: { enabled: false, required: false } });
  assert.deepEqual(resolved.resume, { enabled: false, required: false });
  for (const field of ["linkedin", "cover_letter", "additional_info"]) {
    assert.equal(typeof resolved[field].required, "boolean", field);
  }
  // A field with only `enabled` still gets a boolean `required`.
  assert.equal(typeof resolveApplicationConfiguration({ resume: { enabled: true } }).resume.required, "boolean");
});

test("a fully configured no-CV job keeps its own settings", () => {
  const stored = {
    version: 1,
    resume: { enabled: false, required: false },
    linkedin: { enabled: false, required: false },
    cover_letter: { enabled: false, required: false },
    additional_info: { enabled: true, required: true, label: "Tell us about your driving." },
    intake: { assisted: true },
  };
  assert.deepEqual(resolveApplicationConfiguration(stored), stored);
});

test("work sample and scenario settings are complete when the job stored nothing", () => {
  for (const resolved of [resolveWorkSampleConfiguration({}), resolveScenarioConfiguration({ scenario_configuration: {} })]) {
    assert.equal(resolved.enabled, false);
    assert.equal(resolved.required, false);
    assert.deepEqual(resolved.rubric.criteria, []);
  }
});
