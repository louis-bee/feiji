<template>
  <svg
    class="journey-art"
    viewBox="0 0 720 720"
    role="img"
    aria-label="山峦、飞行轨迹、与远方的太阳，等待你们的第一张照片"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="sky" x2="0" y2="1">
        <stop stop-color="#e2eae5" />
        <stop offset="1" stop-color="#f6eddb" />
      </linearGradient>
      <linearGradient id="hill" x2="0" y2="1">
        <stop stop-color="#839a83" />
        <stop offset="1" stop-color="557c6c" />
      </linearGradient>
    </defs>
    <rect width="720" height="520" fill="url(#sky)" />
    <circle cx="510" cy="151" r="62" fill="#e2c38b" opacity="0.8" />
    <path
      d="M-40 338 150 143 277 314 359 225 560 384 756 209v330H-40Z"
      fill="#b5c1ad"
    />
    <path d="m150 143-60 126 57-22 25 9 30-18Z" fill="#f7f3e7" opacity="0.8" />
    <path
      d="M-10 392 182 275 380 409 532 275 764 380v160H-10Z"
      fill="url(#hill)"
    />
    <path d="M-5 428q132-18 241 16t220-20 280 24v80H-5Z" fill="#315e54" />
    <path
      d="M345 520q-38-37 21-74t-18-45"
      fill="none"
      stroke="#d7c59a"
      stroke-width="15"
      opacity="0.8"
    />
    <path
      d="M80 124c92-70 160 37 232-3s83-70 161-54"
      fill="none"
      stroke="#6c8b83"
      stroke-width="2"
      stroke-dasharray="6 9"
    />
    <g transform="translate(472 62) rotate(18)">
      <path
        d="m-5 3 39-19-18 38-6-15Z"
        fill="#fffaf0"
        stroke="#47685f"
        stroke-width="2"
      />
      <path d="m10 7 12-13" stroke="#47685f" stroke-width="2" />
    </g>
    <g fill="#f9f5ea" opacity="0.8">
      <rect x="28" y="40" width="62" height="3" />
      <rect x="28" y="50" width="36" height="3" />
    </g>
    <text
      x="42"
      y="475"
      fill="#f9f5ea"
      font-family="Georgia,serif"
      font-size="19"
      letter-spacing="4"
    >
      A LITTLE FURTHER, TOGETHER.
    </text>
  </svg>
</template>
