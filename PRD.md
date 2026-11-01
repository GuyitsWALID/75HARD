# 75 HARD Tracker — Product Requirements

## Product goal

Give one person a calm, unmistakable daily scoreboard for completing the official 75 HARD tasks for 75 consecutive days.

## Core user flow

1. Choose a start date.
2. See all 75 days as a wall-chart calendar.
3. Open a day card.
4. Check the five required tasks and attach that day's progress photo.
5. Return later and find the state synced to the account.

## Requirements

- Display 75 sequential day cards with their calendar dates.
- Show completed, current, future, and missed states without hiding any day.
- Each day opens a focused detail dialog.
- Track the official tasks: diet, two 45-minute workouts (one outside), one gallon of plain water, 10 pages of nonfiction/self-development reading, and a progress photo.
- Require an email and password account before using the tracker.
- Store tracker state and photos privately in the user's account.
- Allow changing the start date without losing entries.
- Allow exporting a JSON backup and resetting all data behind confirmation.
- Work from phone size through desktop and support keyboard navigation.
- Include a health disclaimer and link to the official program information.

## Completion rules

A day is complete only when all five checks are complete and a photo is stored. Missing any task means the official challenge requires restarting at Day 1; the tracker records rather than adjudicates that decision.

## Out of scope

Notifications, coaching, social sharing, calorie/workout logging, and configurable habits.

## Acceptance criteria

- Reloading and signing in on another device restores checks, dates, notes, and photos.
- Day dates are calculated consistently across daylight-saving changes.
- A photo can be added, previewed, replaced, and removed.
- Progress totals update immediately.
- The entire experience is usable without a mouse.

