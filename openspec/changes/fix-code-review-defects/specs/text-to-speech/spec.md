## ADDED Requirements

### Requirement: Uninterrupted playback of long utterances

Text-to-speech SHALL play long utterances to completion on local browser voices, working around the browser's ~15-second cutoff via a keep-alive that resumes synthesis while speaking.

#### Scenario: Long selected phrase is spoken to the end

- **WHEN** the user triggers pronunciation of a selection longer than 100 characters using a local browser voice
- **THEN** playback continues to the end of the utterance instead of being truncated mid-way

#### Scenario: Keep-alive stops when speech ends

- **WHEN** the utterance finishes speaking
- **THEN** the keep-alive interval is cleared and no further resume calls are made
