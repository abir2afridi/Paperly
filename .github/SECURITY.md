# 🔒 Security Policy

## 🛡️ Supported Versions

Paperly is pre-1.0 (current version: **0.0.0**). All development happens on
the `main` branch, and the latest commit is the supported version.

| Version | Supported |
|---------|-----------|
| 0.0.x (current, `main` branch) | ✅ Active support |
| Earlier | ❌ No longer supported |

## 📬 Reporting a Vulnerability

> ⚠️ **Please do NOT report security vulnerabilities as public GitHub Issues.**
> This puts all users at risk while a fix is being developed.

### 🛡️ GitHub Security Advisories (Preferred)

Report privately via:
**[https://github.com/abir2afridi/Paperly/security/advisories/new](https://github.com/abir2afridi/Paperly/security/advisories/new)**

Your report will be visible only to maintainers until a patch is released.

### 📬 Email

If you cannot use GitHub Advisories, email us at:
**[abir2afridi@gmail.com](mailto:abir2afridi@gmail.com)**

Please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fix (optional)

## ⏱️ Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within 48 hours |
| Status update | Within 5 business days |
| Fix for Critical | Within 7 days |
| Fix for High | Within 14 days |
| Fix for Medium/Low | Next scheduled release |

## 🎯 Scope

### ✅ In Scope

- Authentication and authorization (Supabase Auth, email + Google OAuth, RLS policies)
- Session and device management (GoTrue admin API)
- The Express server (`server.ts`) — `/api/*` routes, rate limiters, security headers
- AI provider key handling (AES-256-GCM encryption, masked display)
- Real-time collaboration WebSocket (Yjs) and project chat data
- File handling — PDF upload, ZIP import/export (path-traversal hardening), template files
- Chat-retention sweep and per-user data deletion

### ❌ Out of Scope

- Vulnerabilities in third-party dependencies (report to the upstream project)
- Social engineering attacks
- Physical access attacks
- Issues already reported or being fixed

## 🙏 Safe Harbor

We support responsible disclosure. Security researchers who follow these
guidelines will not face legal action from us. We appreciate your help in
keeping Paperly and its users secure.
