// One source for the app's illustrated avatars and map marker fallbacks.
export function avatarSvg(girl = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${girl ? "#ebdcd1" : "#dfe5d8"}"/>
    <path d="${girl ? "M12 58V30C12 3 52 3 52 30v28Z" : "M17 34V22C17 4 49 4 49 22v12Z"}" fill="#57453b"/>
    <path d="M10 64c0-25 44-25 44 0" fill="${girl ? "#ac6c69" : "#7c8d78"}"/>
    <rect x="27" y="39" width="10" height="12" rx="4" fill="#e7ba9c"/>
    <ellipse cx="32" cy="29" rx="14" ry="17" fill="#f0c6a9"/>
    <path d="${girl ? "M17 28c0-21 26-23 30-2-12-3-15-10-15-10s-6 10-15 12" : "M17 25c-2-21 34-19 30-1-8 1-16-4-18-6-3 6-9 7-12 7"}" fill="#57453b"/>
    <circle cx="26" cy="30" r="1.1" fill="#57453b"/><circle cx="38" cy="30" r="1.1" fill="#57453b"/>
    <path d="M28 37q4 3 8 0" stroke="#b07567" stroke-width="1.3" fill="none"/>
  </svg>`;
}
