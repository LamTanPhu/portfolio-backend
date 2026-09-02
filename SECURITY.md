# Security Policy

## Supported Versions

This project is not semantically versioned or released — it's a single
service continuously deployed from `main` (see `.github/workflows/cd.yml`).
There is no older version in production to patch separately: every merge to
`main` that passes CI is live. A fix means a PR against `main`, not a
backport.

## Automated Coverage

This repo already runs the following on every push/PR to `main`, so a
report doesn't need to start from zero:

- **CodeQL** (`codeql.yml`) — static analysis, weekly + on push/PR
- **OSV-Scanner** (`osv-scanner.yml`) — dependency vulnerabilities, weekly + on push/PR
- **Gitleaks** (`secret-scan.yml`) — committed-secret scanning, full history
- **Dependency Review** (`dependency-review.yml`) — blocks PRs introducing a
  moderate+ severity dependency
- **`npm audit --audit-level=high`** — gates CI itself (`ci.yml`)
- **Dependabot** (`dependabot.yml`) — automated dependency PRs

## Reporting a Vulnerability

Please report suspected vulnerabilities privately rather than opening a
public issue:

1. Preferred: open a [GitHub private security advisory](../../security/advisories/new)
   for this repository. This notifies the maintainer without disclosing the
   issue publicly.
2. If that's not available, open an issue with minimal detail asking for a
   private contact channel.

Include what you found, the affected endpoint/file, and reproduction steps
if possible. This is a solo-maintained project — there's no SLA, but
reports are read promptly and a fix or mitigation is prioritized over other
work once confirmed.
