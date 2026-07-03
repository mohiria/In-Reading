## ADDED Requirements

### Requirement: Superseded selection requests are ignored

A translation request is bound to the selection that issued it. When the user makes a new selection or closes the popup before a request resolves, that request's result SHALL NOT be applied to the popup, and the loading indicator SHALL reflect only the current (latest) request. Only the latest selection's translation is ever shown.

#### Scenario: Re-selecting before the first result discards the first request

- **WHEN** the user selects text A (a request is dispatched), then selects text B before A's response arrives, and A's response arrives after B's
- **THEN** the popup shows B's translation, and A's late response is ignored (it does not overwrite B)

#### Scenario: Closing the popup cancels a pending result

- **WHEN** a translation request is in flight and the user closes the popup (clicks away so the selection collapses)
- **THEN** the popup does not reappear when the late response arrives, and the loading indicator is cleared

#### Scenario: A local-cache hit does not leave a stale loading state

- **WHEN** a request is in flight for a prior selection and the user then selects a word resolved instantly from the local dictionary or AI cache
- **THEN** the popup shows the local result and the loading indicator does not remain stuck on from the superseded request
