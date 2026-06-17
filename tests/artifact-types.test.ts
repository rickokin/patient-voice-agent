import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARTIFACT_TYPE_IDS,
  ARTIFACT_TYPES,
  getArtifactMeta,
  isArtifactType,
} from "../lib/artifact-types";

test("isArtifactType accepts every known id", () => {
  for (const id of ARTIFACT_TYPE_IDS) {
    assert.equal(isArtifactType(id), true);
  }
});

test("isArtifactType rejects unknown / non-string values", () => {
  assert.equal(isArtifactType("not_a_real_artifact"), false);
  assert.equal(isArtifactType(""), false);
  assert.equal(isArtifactType(null), false);
  assert.equal(isArtifactType(undefined), false);
  assert.equal(isArtifactType(42), false);
  assert.equal(isArtifactType({ id: "visit_preparation_brief" }), false);
});

test("there are exactly 10 artifact types with unique ids", () => {
  assert.equal(ARTIFACT_TYPES.length, 10);
  assert.equal(ARTIFACT_TYPE_IDS.length, 10);
  assert.equal(new Set(ARTIFACT_TYPE_IDS).size, 10);
});

test("every artifact type exposes complete metadata", () => {
  for (const meta of ARTIFACT_TYPES) {
    assert.ok(meta.title.length > 0, `${meta.id} has a title`);
    assert.ok(
      meta.shortDescription.length > 0,
      `${meta.id} has a description`,
    );
    assert.ok(meta.bestFor.length > 0, `${meta.id} has bestFor`);
    assert.ok(meta.iconName.length > 0, `${meta.id} has iconName`);
    assert.ok(
      meta.safetyLevel === "low" || meta.safetyLevel === "medium",
      `${meta.id} has a valid safetyLevel`,
    );
  }
});

test("getArtifactMeta returns metadata for valid ids and undefined otherwise", () => {
  const meta = getArtifactMeta("visit_preparation_brief");
  assert.ok(meta);
  assert.equal(meta?.id, "visit_preparation_brief");
  assert.equal(meta?.title, "Visit Preparation Brief");

  assert.equal(getArtifactMeta("nope"), undefined);
  assert.equal(getArtifactMeta(""), undefined);
});
