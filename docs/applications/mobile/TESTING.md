# Testing

```bash
cd apps/mobile
npm test      # Vitest unit tests
```

Unit tests live in `tests/unit/`. The repository currently tests API endpoint coverage, store logic, and notification service.

Add new tests alongside components/hooks in a `__tests__` folder or in `tests/unit/`. Use `react-test-renderer` or `@testing-library/react-native` (added as needed).
