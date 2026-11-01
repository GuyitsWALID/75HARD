<script>
  import { onMount } from 'svelte';
  import { animate, scroll } from 'motion';
  import { TASKS, addDays, blankEntry, countChecks, formatDate, isComplete } from './lib/tracker.js';
  import { clearPhotos, deletePhoto, getPhoto, savePhoto } from './lib/photos.js';

  const STORAGE_KEY = 'hard75-tracker-v1';
  const today = new Date().toLocaleDateString('en-CA');
  let state = { startDate: today, entries: {} };
  let ready = false;
  let selected = null;
  let dialog;
  let photoUrl = '';
  let photoBusy = false;
  let notice = '';
  let theme = 'light';
  let calendarElement;

  $: days = Array.from({ length: 75 }, (_, index) => ({
    number: index + 1,
    date: addDays(state.startDate, index),
    entry: state.entries[index + 1] || blankEntry()
  }));
  $: completeCount = days.filter((day) => isComplete(day.entry)).length;
  $: progress = Math.round((completeCount / 75) * 100);
  $: selectedDay = selected ? days[selected - 1] : null;

  onMount(() => {
    theme = document.documentElement.dataset.theme || 'light';
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.startDate && saved?.entries) state = saved;
    } catch {
      notice = 'Saved data could not be read. A fresh tracker is open.';
    }
    ready = true;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = animate(
      calendarElement,
      { transform: ['translateY(140px)', 'translateY(0px)'], opacity: [0.2, 1] },
      { ease: 'linear' }
    );
    return scroll(animation, { target: calendarElement, offset: ['start end', 'start 58%'] });
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#111111' : '#f2f2ef';
    localStorage.setItem('hard75-theme', theme);
  }

  function persist(next = state) {
    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function updateEntry(day, update) {
    const current = state.entries[day] || blankEntry();
    persist({ ...state, entries: { ...state.entries, [day]: { ...current, ...update } } });
  }

  function toggleTask(day, task) {
    const entry = state.entries[day] || blankEntry();
    updateEntry(day, { checks: { ...entry.checks, [task]: !entry.checks[task] } });
  }

  async function openDay(day) {
    selected = day;
    notice = '';
    try {
      await loadPhoto(day);
    } catch {
      photoUrl = '';
      notice = 'Stored photos are unavailable in this browser session.';
    }
    dialog.showModal();
  }

  function closeDay() {
    if (dialog.open) dialog.close();
  }

  function cleanupDialog() {
    selected = null;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = '';
  }

  async function loadPhoto(day) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const file = await getPhoto(day);
    photoUrl = file ? URL.createObjectURL(file) : '';
  }

  async function handlePhoto(event) {
    const file = event.currentTarget.files?.[0];
    if (!file || !selected) return;
    photoBusy = true;
    try {
      await savePhoto(selected, file);
      const entry = state.entries[selected] || blankEntry();
      updateEntry(selected, { hasPhoto: true, checks: { ...entry.checks, photo: true } });
      await loadPhoto(selected);
    } catch {
      notice = 'The photo could not be stored on this device.';
    } finally {
      photoBusy = false;
      event.currentTarget.value = '';
    }
  }

  async function removePhoto() {
    if (!selected) return;
    await deletePhoto(selected);
    const entry = state.entries[selected] || blankEntry();
    updateEntry(selected, { hasPhoto: false, checks: { ...entry.checks, photo: false } });
    await loadPhoto(selected);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `75-hard-${state.startDate}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function resetAll() {
    if (!confirm('Erase every check, note, and stored photo? This cannot be undone.')) return;
    await clearPhotos();
    persist({ startDate: today, entries: {} });
    notice = 'Tracker reset.';
  }
</script>

<svelte:head><title>{completeCount} / 75 — 75 HARD Tracker</title></svelte:head>

<header class="masthead">
  <a class="brand" href="#tracker" aria-label="75 Hard tracker home"><span>75</span><i>/</i>HARD</a>
  <div class="masthead__status" aria-live="polite"><strong>{completeCount}</strong> / 75 complete</div>
  <div class="masthead__controls">
    <button class="theme-toggle" on:click={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {#if theme === 'dark'}
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.6A9 9 0 0 1 8.4 3.6a9 9 0 1 0 12 12Z"></path></svg>
      {/if}
    </button>
    <label class="date-control">Start date<input type="date" bind:value={state.startDate} on:change={() => persist()} /></label>
  </div>
</header>

<main id="tracker">
  <section class="intro" aria-labelledby="page-title">
    <div>
      <p class="eyebrow">Your daily scoreboard</p>
      <h1 id="page-title">Do the work.<br />Mark the day.</h1>
    </div>
    <div class="intro__copy">
      <p>Five tasks. Seventy-five consecutive days. Open any day to record the work and keep your progress photo private on this device.</p>
      <div class="progress-label"><span>{progress}% complete</span><span>Day 75 ends {formatDate(days[74].date, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
      <div class="progress-track" role="progressbar" aria-label="Challenge progress" aria-valuemin="0" aria-valuemax="75" aria-valuenow={completeCount}><span style={`width:${progress}%`}></span></div>
    </div>
  </section>

  {#if notice}<p class="notice" role="status">{notice}</p>{/if}

  <section class="calendar" aria-label="75 day calendar" bind:this={calendarElement}>
    {#each days as day}
      <button
        class:complete={isComplete(day.entry)}
        class:today={day.date === today}
        class:future={day.date > today}
        class="day-card"
        on:click={() => openDay(day.number)}
        aria-label={`Open day ${day.number}, ${formatDate(day.date, { month: 'long', day: 'numeric' })}${isComplete(day.entry) ? ', complete' : ''}`}
      >
        <span class="day-card__top"><span>Day</span><span class="card-check" aria-hidden="true">{isComplete(day.entry) ? '✓' : ''}</span></span>
        <strong>{String(day.number).padStart(2, '0')}</strong>
        <span class="day-card__bottom"><span>{formatDate(day.date)}</span><span>{countChecks(day.entry)}/5</span></span>
        <span class="task-rail" aria-hidden="true">
          {#each TASKS as task}<i class:checked={day.entry.checks?.[task[0]]}></i>{/each}
        </span>
      </button>
    {/each}
  </section>

  <section class="rules">
    <div><p class="eyebrow">The agreement</p><h2>All five. Every day.</h2></div>
    <ol>
      <li>Follow a diet. No cheat meals or alcohol.</li>
      <li>Complete two 45-minute workouts; one outside.</li>
      <li>Drink one gallon of plain water.</li>
      <li>Read 10 pages of a nonfiction, self-development book.</li>
      <li>Take a progress photo.</li>
    </ol>
  </section>
</main>

<footer>
  <p>Your data stays in this browser. This unofficial tracker is not affiliated with 75 HARD™.</p>
  <div><a href="https://andyfrisella.com/pages/75hard-info" target="_blank" rel="noreferrer">Official rules ↗</a><button on:click={exportData}>Export backup</button><button class="danger" on:click={resetAll}>Reset</button></div>
  <p class="disclaimer">Consult a physician before starting any fitness program. Do not begin if your healthcare provider advises against it.</p>
</footer>

<dialog bind:this={dialog} on:close={cleanupDialog}>
  {#if selectedDay}
    <div class="dialog-head">
      <div><p class="eyebrow">{formatDate(selectedDay.date, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h2>Day {selectedDay.number}</h2></div>
      <button class="close" on:click={closeDay} aria-label="Close day details">×</button>
    </div>
    <div class="task-list">
      {#each TASKS as [id, label, detail]}
        <label class="task" class:checked={selectedDay.entry.checks?.[id]}>
          <input type="checkbox" checked={selectedDay.entry.checks?.[id] || false} on:change={() => toggleTask(selectedDay.number, id)} disabled={id === 'photo'} />
          <span class="box" aria-hidden="true"></span>
          <span><strong>{label}</strong><small>{detail}</small></span>
        </label>
      {/each}
    </div>
    <div class="photo-area">
      {#if photoUrl}
        <img src={photoUrl} alt={`Progress for day ${selectedDay.number}`} />
        <div><label class="upload">Replace photo<input type="file" accept="image/*" on:change={handlePhoto} /></label><button on:click={removePhoto}>Remove</button></div>
      {:else}
        <label class="upload upload--empty"><span>{photoBusy ? 'Saving…' : '+ Add progress photo'}</span><small>Stored only on this device</small><input type="file" accept="image/*" capture="user" on:change={handlePhoto} disabled={photoBusy} /></label>
      {/if}
    </div>
    <label class="notes">Daily note<textarea rows="3" placeholder="What made today hard?" value={selectedDay.entry.note} on:input={(event) => updateEntry(selectedDay.number, { note: event.currentTarget.value })}></textarea></label>
    <div class="dialog-foot"><span>{countChecks(selectedDay.entry)} of 5 tasks checked</span><strong>{isComplete(selectedDay.entry) ? 'DAY COMPLETE ✓' : 'KEEP GOING'}</strong></div>
  {/if}
</dialog>

