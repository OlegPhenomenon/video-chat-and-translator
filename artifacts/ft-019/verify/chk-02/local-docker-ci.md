# FT-019 Local Docker CI

Date: 2026-04-29

Command:

```sh
scripts/ci-app.sh
```

Result: passed.

Summary:

- Docker CI image built successfully.
- `bin/setup --skip-server` passed.
- RuboCop inspected 56 files with no offenses.
- `npm run check` passed.
- `npm test` passed: 5 frontend test files, 19 tests.
- `bundle exec rspec` passed: 68 examples, 0 failures, 1 pending.
- `bin/bundler-audit` passed with no vulnerabilities found.
- `bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error` passed with no warnings.
