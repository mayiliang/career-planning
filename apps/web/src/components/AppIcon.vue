<script setup lang="ts">
defineProps<{ name: string }>();
const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  book: 'M12 5v16M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V3Z',
  route: 'M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 5h8a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8',
  briefcase: 'M8 7V4h8v3M3 7h18v13H3V7Zm0 5a23 23 0 0 0 18 0m-9 0v3',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm7 9a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z',
  search: 'M21 21l-5-5m2-6a8 8 0 1 0-16 0 8 8 0 0 0 16 0Z',
  panel: 'M3 4h18v16H3V4Zm5 0v16m8-12-4 4 4 4',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  clock: 'M12 8v5l3 2m6-3a9 9 0 1 0-18 0 9 9 0 0 0 18 0Z',
  plus: 'M12 5v14M5 12h14',
};
</script>

<template>
  <svg class="app-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path :d="paths[name] ?? paths.map" /></svg>
</template>

<style scoped>
.app-icon { display: block; flex-shrink: 0; }
</style>
