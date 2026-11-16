# Namespaces awaiting first translation

String-extraction packages (I18N-5) add English keys in a NEW namespace per area. Each package registers its namespace
here with one file, `scripts/i18n/pending/<namespace>.json`:

    { "namespace": "userPages", "wave": "5A", "reason": "extracted, awaiting I18N-4 translation run" }

While a namespace is registered, the parity gate tolerates its keys being missing or still English in es, fr, pt, it, pl,
cs. Placeholder (`{{x}}`) mismatches on keys that exist are still failures. One file per area means two packages never
edit the same file. The translation phase (P4) deletes the file once the namespace is translated and reviewed; a
registered namespace is a debt, not an exemption. Do not register a namespace that is already translated.
