#!/usr/bin/env node
/**
 * Patches ExpoModulesCorePlugin.gradle for Gradle 8.8 / AGP 8.5+ compatibility.
 *
 * Root cause: expo-modules-core's Gradle plugin accesses `components.release`
 * directly. In AGP 8.5+, Android software components (release, debug, etc.) are
 * registered lazily, so `components.release` throws:
 *   "Could not get unknown property 'release' for SoftwareComponent container"
 *
 * Fix: replace with `components.findByName("release")` which returns null instead
 * of throwing, then guard the `from` call so it's a no-op when null.
 * For a mobile app build, Maven publishing is unused — this is safe.
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_PATH = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'ExpoModulesCorePlugin.gradle'
);

if (!fs.existsSync(PLUGIN_PATH)) {
  console.log('[patch-expo-modules-core] File not found — nothing to patch.');
  process.exit(0);
}

let src = fs.readFileSync(PLUGIN_PATH, 'utf8');

if (!src.includes('from components.release')) {
  console.log('[patch-expo-modules-core] Already patched or pattern not found — skipping.');
  process.exit(0);
}

// Replace:   from components.release
// With:      def __comp = components.findByName("release"); if (__comp) from __comp
//
// This is valid Groovy. Inside a MavenPublication config closure, `from` is the
// MavenPublication.from(SoftwareComponent) DSL method. If the component is null
// we skip it — the publication is empty but the build succeeds.
const patched = src.replace(
  /^(\s*)from\s+components\.release\s*$/gm,
  (_, indent) =>
    `${indent}def __gradleComp = components.findByName("release")\n` +
    `${indent}if (__gradleComp) from(__gradleComp)`
);

fs.writeFileSync(PLUGIN_PATH, patched, 'utf8');
console.log('[patch-expo-modules-core] ✅ Patched ExpoModulesCorePlugin.gradle for Gradle 8.8 compatibility.');
