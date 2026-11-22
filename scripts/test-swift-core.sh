#!/usr/bin/env bash
# Compiles targets/_shared/TIMCore.swift with plain swiftc and runs parity checks.
# Requires a Swift toolchain (Xcode on macOS). Not runnable in the cloud environment.
set -euo pipefail
cd "$(dirname "$0")/.."
out="$(mktemp -d)/tim-core-tests"
swiftc -O targets/_shared/TIMCore.swift scripts/swift-core-tests/main.swift -o "$out"
"$out"
