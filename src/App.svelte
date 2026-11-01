<script>
  import { onDestroy } from "svelte";
  import { animate, scroll } from "motion";
  import { TASKS, addDays, blankEntry, countChecks, formatDate, isComplete } from "./lib/tracker.js";
  import { authClient, session } from "./lib/auth-client.js";
  import { api, auth, mutate, query } from "./lib/convex.js";
  import ThemeToggle from "./lib/ThemeToggle.svelte";

  const today = new Date().toLocaleDateString("en-CA");
  const trackerQuery = query(api.tracker.get);

  let selected = null;
  let dialog;
  let notice = "";
  let photoBusy = false;
  let noteTimer;

  let mode = "signin";
  let name = "";
  let email = "";
  let password = "";
  let authBusy = false;
  let authError = "";

  $: tracker = $trackerQuery;
  $: startDate = tracker?.startDate ?? today;
  $: entries = tracker?.entries ?? [];
  $: days = Array.from({ length: 75 }, (_, index) => ({
    number: index + 1,
    date: addDays(startDate, index),
    entry: entries.find((item) => item.day === index + 1) ?? blankEntry(),
  }));
  $: completeCount = days.filter((day) => isComplete(day.entry)).length;
  $: progress = Math.round((completeCount / 75) * 100);
  $: selectedDay = selected ? days[selected - 1] : null;

  onDestroy(() => clearTimeout(noteTimer));

  function rise(node) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = animate(
      node,
      { transform: ["translateY(140px)", "translateY(0px)"], opacity: [0.2, 1] },
      { ease: "linear" },
    );
    const cleanup = scroll(animation, {
      target: node,
      offset: ["start end", "start 58%"],
    });
    return {
      destroy() {
        if (typeof cleanup === "function") cleanup();
        animation?.stop?.();
      },
    };
  }

  async function submitAuth(event) {
    event.preventDefault();
    authBusy = true;
    authError = "";
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name, email, password });

      if (result.error) {
        authError = result.error.message || "Something went wrong. Try again.";
        return;
      }

      name = "";
      email = "";
      password = "";
    } catch (error) {
      authError = error?.message || "Something went wrong. Try again.";
    } finally {
      authBusy = false;
    }
  }

  async function signOut() {
    await authClient.signOut();
    if (dialog?.open) dialog.close();
    selected = null;
    notice = "";
  }

  function save(update) {
    mutate(api.tracker.updateEntry, { startDate, ...update }).catch(() => {
      notice = "Could not save that change. Check your connection and try again.";
    });
  }

  function changeStartDate(event) {
    const value = event.currentTarget.value;
    if (!value) return;
    mutate(api.tracker.setStartDate, { startDate: value }).catch(() => {
      notice = "Could not save the start date.";
    });
  }

  function toggleTask(day, task) {
    if (task === "photo") return;
    const entry = entries.find((item) => item.day === day) ?? blankEntry();
    const checks = Object.fromEntries(
      TASKS.map(([id]) => [id, id === task ? !entry.checks?.[id] : Boolean(entry.checks?.[id])]),
    );
    save({ day, checks });
  }

  function openDay(day) {
    selected = day;
    notice = "";
    dialog.showModal();
  }

  function closeDay() {
    if (dialog.open) dialog.close();
  }

  function cleanupDialog() {
    selected = null;
  }

  function updateNote(event) {
    const day = selected;
    const note = event.currentTarget.value;
    if (!day) return;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => save({ day, note }), 400);
  }

  async function handlePhoto(event) {
    const file = event.currentTarget.files?.[0];
    if (!file || !selected) return;
    photoBusy = true;
    notice = "";
    try {
      const uploadUrl = await mutate(api.tracker.generatePhotoUploadUrl, {});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      await mutate(api.tracker.setPhoto, {
        startDate,
        day: selected,
        storageId,
      });
    } catch {
      notice = "The photo could not be uploaded. Try a smaller image.";
    } finally {
      photoBusy = false;
      event.currentTarget.value = "";
    }
  }

  async function removePhoto() {
    if (!selected) return;
    try {
      await mutate(api.tracker.removePhoto, { startDate, day: selected });
    } catch {
      notice = "The photo could not be removed.";
    }
  }

  function exportData() {
    const data = { startDate, entries };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `75-hard-${startDate}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function resetAll() {
    if (!confirm("Erase every check, note, and stored photo? This cannot be undone.")) return;
    try {
      await mutate(api.tracker.reset, {});
      selected = null;
      notice = "Tracker reset.";
    } catch {
      notice = "The tracker could not be reset.";
    }
  }
</script>

{#if $auth.isLoading}
  <div class="boot" aria-live="polite">Checking your session.</div>
{:else if !$auth.isAuthenticated}
  <header class="masthead masthead--auth">
    <span class="brand"><span>75</span><i>/</i>HARD</span>
    <div class="masthead__controls"><ThemeToggle /></div>
  </header>

  <main class="auth">
    <section class="auth__panel">
      <p class="eyebrow">Private daily tracker</p>
      <h1>{mode === "signin" ? "Sign in." : "Create account."}</h1>
      <p class="auth__copy">
        All five tasks. Every day. Your checks, notes, and progress photos sync to
        your account.
      </p>

      <form on:submit={submitAuth}>
        {#if mode === "signup"}
          <label>
            Name
            <input type="text" bind:value={name} autocomplete="name" required />
          </label>
        {/if}
        <label>
          Email
          <input type="email" bind:value={email} autocomplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            bind:value={password}
            autocomplete={mode === "signin" ? "current-password" : "new-password"}
            minlength="8"
            required
          />
        </label>

        {#if authError}<p class="auth__error" role="alert">{authError}</p>{/if}

        <button class="auth__submit" type="submit" disabled={authBusy}>
          {authBusy ? "Working." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        class="auth__switch"
        type="button"
        on:click={() => {
          mode = mode === "signin" ? "signup" : "signin";
          authError = "";
        }}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </section>
  </main>

  <footer>
    <p>Your data is private to your account.</p>
    <p class="disclaimer">
      Consult a physician before starting any fitness program. Do not begin if your
      healthcare provider advises against it.
    </p>
  </footer>
{:else}
  <header class="masthead">
    <a class="brand" href="#tracker" aria-label="75 Hard tracker home"><span>75</span><i>/</i>HARD</a>
    <div class="masthead__status" aria-live="polite"><strong>{completeCount}</strong> / 75 complete</div>
    <div class="masthead__controls">
      <ThemeToggle />
      <label class="date-control">Start date<input type="date" value={startDate} on:change={changeStartDate} /></label>
    </div>
  </header>

  <main id="tracker">
    <section class="intro" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">Your daily scoreboard</p>
        <h1 id="page-title">Do the work.<br />Mark the day.</h1>
      </div>
      <div class="intro__copy">
        <p>Five tasks. Seventy-five consecutive days. Open any day to record the work and keep your progress photo private to your account.</p>
        <div class="progress-label"><span>{progress}% complete</span><span>Day 75 ends {formatDate(days[74].date, { month: "long", day: "numeric", year: "numeric" })}</span></div>
        <div class="progress-track" role="progressbar" aria-label="Challenge progress" aria-valuemin="0" aria-valuemax="75" aria-valuenow={completeCount}><span style={`width:${progress}%`}></span></div>
      </div>
    </section>

    {#if notice}<p class="notice" role="status">{notice}</p>{/if}

    {#if tracker}
      <section class="calendar" aria-label="75 day calendar" use:rise>
        {#each days as day}
          <button
            class:complete={isComplete(day.entry)}
            class:today={day.date === today}
            class:future={day.date > today}
            class="day-card"
            on:click={() => openDay(day.number)}
            aria-label={`Open day ${day.number}, ${formatDate(day.date, { month: "long", day: "numeric" })}${isComplete(day.entry) ? ", complete" : ""}`}
          >
            <span class="day-card__top"><span>Day</span><span class="card-check" aria-hidden="true">{isComplete(day.entry) ? "✓" : ""}</span></span>
            <strong>{String(day.number).padStart(2, "0")}</strong>
            <span class="day-card__bottom"><span>{formatDate(day.date)}</span><span>{countChecks(day.entry)}/5</span></span>
            <span class="task-rail" aria-hidden="true">
              {#each TASKS as task}<i class:checked={day.entry.checks?.[task[0]]}></i>{/each}
            </span>
          </button>
        {/each}
      </section>
    {:else}
      <p class="notice" role="status">Loading your tracker.</p>
    {/if}

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
    <p>Signed in as {$session.data?.user?.email}. Your data syncs to this account.</p>
    <div>
      <a href="https://andyfrisella.com/pages/75hard-info" target="_blank" rel="noreferrer">Official rules</a>
      <button on:click={exportData}>Export backup</button>
      <button class="danger" on:click={resetAll}>Reset</button>
      <button on:click={signOut}>Sign out</button>
    </div>
    <p class="disclaimer">Consult a physician before starting any fitness program. Do not begin if your healthcare provider advises against it.</p>
  </footer>
{/if}

<dialog bind:this={dialog} on:close={cleanupDialog}>
  {#if selectedDay}
    <div class="dialog-head">
      <div><p class="eyebrow">{formatDate(selectedDay.date, { weekday: "long", month: "long", day: "numeric" })}</p><h2>Day {selectedDay.number}</h2></div>
      <button class="close" on:click={closeDay} aria-label="Close day details">x</button>
    </div>
    <div class="task-list">
      {#each TASKS as [id, label, detail]}
        <label class="task" class:checked={selectedDay.entry.checks?.[id]}>
          <input type="checkbox" checked={selectedDay.entry.checks?.[id] || false} on:change={() => toggleTask(selectedDay.number, id)} disabled={id === "photo"} />
          <span class="box" aria-hidden="true"></span>
          <span><strong>{label}</strong><small>{detail}</small></span>
        </label>
      {/each}
    </div>
    <div class="photo-area">
      {#if selectedDay.entry.photoUrl}
        <img src={selectedDay.entry.photoUrl} alt={`Progress for day ${selectedDay.number}`} />
        <div><label class="upload">Replace photo<input type="file" accept="image/*" on:change={handlePhoto} /></label><button on:click={removePhoto}>Remove</button></div>
      {:else}
        <label class="upload upload--empty"><span>{photoBusy ? "Saving." : "+ Add progress photo"}</span><small>Stored privately in your account</small><input type="file" accept="image/*" capture="user" on:change={handlePhoto} disabled={photoBusy} /></label>
      {/if}
    </div>
    <label class="notes">Daily note<textarea rows="3" maxlength="2000" placeholder="What made today hard?" value={selectedDay.entry.note} on:input={updateNote}></textarea></label>
    <div class="dialog-foot"><span>{countChecks(selectedDay.entry)} of 5 tasks checked</span><strong>{isComplete(selectedDay.entry) ? "DAY COMPLETE ✓" : "KEEP GOING"}</strong></div>
  {/if}
</dialog>
