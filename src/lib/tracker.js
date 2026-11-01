export const TASKS = [
  ['diet', 'Follow your diet', 'No cheat meals or alcohol'],
  ['workouts', 'Complete two workouts', '45 minutes each, 3+ hours apart; one outside'],
  ['water', 'Drink one gallon of water', 'Plain, unflavored, and non-carbonated'],
  ['reading', 'Read 10 pages', 'A physical nonfiction or self-development book'],
  ['photo', 'Take a progress photo', 'Attach today’s photo below']
];

export const blankEntry = () => ({ checks: {}, note: '', hasPhoto: false });

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isComplete(entry) {
  return TASKS.every(([id]) => entry?.checks?.[id]) && entry?.hasPhoto;
}

export function countChecks(entry) {
  return TASKS.filter(([id]) => entry?.checks?.[id]).length;
}

export function formatDate(dateString, options = { month: 'short', day: 'numeric' }) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

