# AICF-Core Contributor Quick Start

Welcome to **AICF-Core**! 🚀\
This project defines and maintains the **AI Context Format (AICF)** ---
the foundation for persistent, efficient, and interoperable AI chat
memory.

------------------------------------------------------------------------

## 🗂 Repo Essentials

-   `AICF_SPEC.md` → The spec: fields, encoding rules, versioning.
-   `src/` → Core writer & reader implementations.
-   `tests/` → Unit + round-trip + negative tests.
-   `benchmarks/` → Performance & compression checks.
-   `examples/` → Code samples for usage.

------------------------------------------------------------------------

## ✅ Contributor Checklist

1.  **Follow the Spec**
    -   Always align code changes with `AICF_SPEC.md`.
2.  **Test Everything**
    -   Add unit tests for new features.\
    -   Run benchmarks for performance-sensitive changes.
3.  **Respect Compatibility**
    -   Don't break older AICF files.\
    -   If you must, update version + migration tools.
4.  **Keep Security in Mind**
    -   Avoid exposing secrets.\
    -   Redact or encrypt sensitive fields.
5.  **Write Clearly**
    -   Update README / docs for new features.\
    -   Use clear commit messages.

------------------------------------------------------------------------

## ⚡ Quick Commands

``` bash
# Run tests
npm test

# Run benchmarks
npm run bench

# Validate AICF files
npx aicf-validate myfile.aicf
```

------------------------------------------------------------------------

## 📬 Community

-   File issues & PRs on GitHub.\
-   See `CONTRIBUTING.md` for detailed guidelines.\
-   Join discussions, propose ideas, and help improve AICF!

------------------------------------------------------------------------

Together we're building the **standard for AI memory persistence**. 💡
