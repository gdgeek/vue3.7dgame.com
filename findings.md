# Findings

## Baseline
- Clean HEAD has 0 build errors
- ~458 any occurrences across ~130 files
- Previous attempt caused 478 errors by being too strict

## Safe replacement patterns
- catch interceptor error annotation → remove annotation (TS infers)
- spread args → unknown[]
- window as → Record cast
- i18n locale → WritableComputedRef
- Promise generic → unknown
- token param → proper Token interface
- data field → unknown
