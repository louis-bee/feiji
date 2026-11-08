<script setup lang="ts">
defineProps<{
  actor: "her" | "him";
  large?: boolean;
}>();
</script>

<template>
  <span :class="['avatar', actor, { large }]" aria-hidden="true">
    <svg v-if="actor === 'her'" viewBox="0 0 64 64" fill="none">
      <path
        d="m12 31 41-19-19 41-5-17-17-5Z"
        fill="#fbf9ef"
        stroke="#506f77"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path d="m29 36 14-15" stroke="#506f77" stroke-width="2" />
      <path
        d="m13 43-5 5m13-1-3 7"
        stroke="#caa15b"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
    <svg v-else viewBox="0 0 64 64" fill="none">
      <ellipse cx="32" cy="33" rx="18" ry="24" fill="#304b47" />
      <ellipse cx="32" cy="39" rx="13" ry="16" fill="#faf6ec" />
      <ellipse cx="25" cy="26" rx="6" ry="7" fill="#faf6ec" />
      <ellipse cx="39" cy="26" rx="6" ry="7" fill="#faf6ec" />
      <circle cx="26" cy="26" r="2" fill="#304b47" />
      <circle cx="38" cy="26" r="2" fill="#304b47" />
      <path d="m28 32 4 4 4-4Z" fill="#cda355" />
      <path d="M17 37q15 7 30 0" stroke="#d1ac5a" stroke-width="5" />
      <path d="m39 39 2 9" stroke="#d1ac5a" stroke-width="5" />
      <path
        d="M20 56h8m8 0h8"
        stroke="#cda355"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #dce7de;
  border: 2px solid #f8f7ec;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  overflow: hidden;
}
.avatar.him {
  background: #f1dfb6;
}
.avatar svg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  width: 90%;
  height: 90%;
}
.avatar.large {
  width: 67px;
  height: 67px;
  border-width: 3px;
  box-shadow: 0 2px 6px #4651390b;
}
</style>
