<script>
  import { onMount } from "svelte";

  let theme = "light";

  onMount(() => {
    theme = document.documentElement.dataset.theme || "light";
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === "dark" ? "#111111" : "#f2f2ef";
    localStorage.setItem("hard75-theme", theme);
  }
</script>

<button
  class="theme-toggle"
  on:click={toggleTheme}
  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
>
  {#if theme === "dark"}
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><circle cx="12" cy="12" r="3.5"></circle><path
        d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
      ></path></svg
    >
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><path d="M20.4 15.6A9 9 0 0 1 8.4 3.6a9 9 0 1 0 12 12Z"></path></svg
    >
  {/if}
</button>
