/* =====================================================================
   사라진 시계공의 공방 — 방탈출 게임
   방 3개(작업실→서재→시계탑) / 이미지(SVG) 클릭형 / 복합 퍼즐
   상태 기억 · 암호 입력 판정 · 인벤토리 팝업
   ===================================================================== */

/* ---------- 정답(암호) ----------
   금고 코드 = 작업실 포스터(4) + 서재 붉은책(9) + 서재 촛대(2) = 492
   최종 탈출 = 시계탑 대시계를 3시에 맞추기
------------------------------------ */
const SAFE_CODE = "492";

const ITEMS = {
  screwdriver: { emoji: "🪛", name: "드라이버", desc: "나사를 풀 수 있는 낡은 드라이버." },
  brassKey:    { emoji: "🗝️", name: "황동 열쇠", desc: "서재로 통하는 문을 여는 열쇠." },
  cog:         { emoji: "⚙️", name: "황금 태엽", desc: "대형 괘종시계를 감을 수 있는 태엽." },
};

const ROOM_NAMES = { workshop: "작업실", study: "서재", tower: "시계탑" };

function freshState() {
  return {
    room: "workshop",
    inventory: [],           // 아이템 id 배열
    flags: {
      drawerOpen: false,
      workshopDoorOpen: false,
      paintingMoved: false,
      safeOpen: false,
      clockWound: false,
      clockHour: 12,
      escaped: false,
    },
    codeTarget: null,        // 현재 열려있는 암호 대상
    codeBuffer: "",
    journal: [],             // 스토리 일지 {icon, text}
  };
}

/* 방에 처음 들어설 때 나오는 도입 내레이션 */
const ROOM_INTRO = {
  workshop: { icon: "🔧", text: "스승 엘리아스의 작업실. 공구가 어지럽게 흩어져 있고, 무언가를 급히 감춘 흔적이 보인다." },
  study:    { icon: "📚", text: "먼지 쌓인 서재. 스승의 연구가 모두 이곳에 있다. 붉은 일기장 하나가 유독 눈에 띈다." },
  tower:    { icon: "🏰", text: "낡은 시계탑. 거대한 괘종시계가 멈춰 서 있다. 스승이 마지막으로 향한 곳이 바로 여기다." },
};
let state = freshState();

/* ---------- DOM ---------- */
const scene   = document.getElementById("scene");
const $        = (id) => document.getElementById(id);
let timerId = null, startTs = 0;

/* =====================================================================
   SVG 씬 렌더링
   ===================================================================== */
function renderRoom() {
  $("room-name").textContent = ROOM_NAMES[state.room];
  if (state.room === "workshop") scene.innerHTML = workshopSVG();
  else if (state.room === "study") scene.innerHTML = studySVG();
  else if (state.room === "tower") scene.innerHTML = towerSVG();
  $("inv-count").textContent = state.inventory.length;
}

/* ----- 방 1 : 작업실 ----- */
function workshopSVG() {
  const drawer = state.flags.drawerOpen
    ? `<rect x="602" y="250" width="120" height="34" rx="3" fill="#1c130a"/>
       <rect x="618" y="256" width="60" height="10" rx="3" fill="#d9a441"/>
       <text x="662" y="243" fill="#e8c883" font-size="13" text-anchor="middle">열림</text>`
    : `<rect x="600" y="248" width="124" height="40" rx="4" fill="url(#wood2)"/>
       <circle cx="662" cy="268" r="5" fill="#d9a441"/>`;

  return `<svg viewBox="0 0 800 500">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a3a26"/><stop offset="1" stop-color="#2e2317"/>
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a1f13"/><stop offset="1" stop-color="#160f08"/>
      </linearGradient>
      <linearGradient id="wood2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6b4a28"/><stop offset="1" stop-color="#43301a"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="800" height="370" fill="url(#wall)"/>
    <rect x="0" y="370" width="800" height="130" fill="url(#floor)"/>
    <line x1="0" y1="370" x2="800" y2="370" stroke="#0d0905" stroke-width="3"/>

    <!-- 벽 포스터 -->
    <g class="hs" data-id="poster">
      <rect x="70" y="70" width="130" height="160" rx="4" fill="#d8c9a6" transform="rotate(-2 135 150)"/>
      <rect x="82" y="86" width="106" height="60" fill="#b7a476" transform="rotate(-2 135 150)"/>
      <text x="135" y="205" fill="#5c4a2a" font-size="15" text-anchor="middle" transform="rotate(-2 135 150)">낡은 포스터</text>
    </g>

    <!-- 벽시계 -->
    <g class="hs" data-id="wallclock">
      <circle cx="400" cy="130" r="58" fill="#26364a" stroke="#d9a441" stroke-width="4"/>
      <circle cx="400" cy="130" r="50" fill="#12202f"/>
      <line x1="400" y1="130" x2="400" y2="95" stroke="#e8c883" stroke-width="4"/>
      <line x1="400" y1="130" x2="428" y2="130" stroke="#e8c883" stroke-width="4"/>
      <circle cx="400" cy="130" r="4" fill="#d9a441"/>
      <text x="400" y="112" fill="#9fb4c9" font-size="11" text-anchor="middle">XII</text>
    </g>

    <!-- 공구함 (바닥 왼쪽) -->
    <g class="hs" data-id="toolbox">
      <rect x="90" y="392" width="130" height="72" rx="6" fill="#8a3320"/>
      <rect x="90" y="392" width="130" height="20" rx="6" fill="#a4402a"/>
      <rect x="140" y="378" width="30" height="18" rx="3" fill="#5c2013"/>
      <text x="155" y="435" fill="#f2d9c9" font-size="13" text-anchor="middle">공구함</text>
    </g>

    <!-- 서랍장 (오른쪽) -->
    <g class="hs" data-id="drawer">
      <rect x="590" y="300" width="144" height="164" rx="6" fill="url(#wood2)"/>
      <rect x="600" y="312" width="124" height="40" rx="4" fill="#3a2917"/>
      <rect x="600" y="360" width="124" height="40" rx="4" fill="#3a2917"/>
      <circle cx="662" cy="332" r="5" fill="#d9a441"/>
      <circle cx="662" cy="380" r="5" fill="#d9a441"/>
      ${drawer}
    </g>

    <!-- 문 (서재로) -->
    <g class="hs" data-id="door">
      <rect x="330" y="230" width="140" height="240" rx="6" fill="#3d2c19"/>
      <rect x="344" y="246" width="112" height="100" rx="4" fill="#2c1f11"/>
      <rect x="344" y="356" width="112" height="100" rx="4" fill="#2c1f11"/>
      <circle cx="446" cy="356" r="7" fill="#d9a441"/>
      <text x="400" y="492" fill="#a08b6f" font-size="13" text-anchor="middle">서재로 향하는 문 ${state.flags.workshopDoorOpen ? "(열림)" : "🔒"}</text>
    </g>
  </svg>`;
}

/* ----- 방 2 : 서재 ----- */
function studySVG() {
  const painting = state.flags.paintingMoved
    ? `<!-- 금고 노출 -->
       <g class="hs" data-id="safe">
         <rect x="360" y="120" width="120" height="120" rx="8" fill="#3a3f47" stroke="#d9a441" stroke-width="3"/>
         <circle cx="420" cy="180" r="30" fill="#20242a" stroke="#8a949e" stroke-width="4"/>
         <circle cx="420" cy="180" r="6" fill="#d9a441"/>
         <rect x="470" y="170" width="8" height="20" rx="2" fill="#8a949e"/>
         <text x="420" y="256" fill="#a08b6f" font-size="12" text-anchor="middle">금고 ${state.flags.safeOpen ? "(열림)" : "🔒"}</text>
       </g>`
    : `<g class="hs" data-id="painting">
         <rect x="352" y="104" width="150" height="150" rx="4" fill="#6b4a28"/>
         <rect x="366" y="118" width="122" height="122" fill="#243447"/>
         <circle cx="427" cy="168" r="28" fill="#c8a24a"/>
         <path d="M395 226 q32 -40 64 0" fill="#3a5068"/>
         <text x="427" y="270" fill="#a08b6f" font-size="12" text-anchor="middle">초상화</text>
       </g>`;

  return `<svg viewBox="0 0 800 500">
    <defs>
      <linearGradient id="wall2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a2e3a"/><stop offset="1" stop-color="#241a24"/>
      </linearGradient>
      <linearGradient id="floor2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a1d18"/><stop offset="1" stop-color="#160d0a"/>
      </linearGradient>
      <linearGradient id="wood3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5c3b22"/><stop offset="1" stop-color="#382415"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="800" height="380" fill="url(#wall2)"/>
    <rect x="0" y="380" width="800" height="120" fill="url(#floor2)"/>
    <line x1="0" y1="380" x2="800" y2="380" stroke="#0d0905" stroke-width="3"/>
    ${backArrow("작업실")}

    <!-- 책장 -->
    <g class="hs" data-id="bookshelf">
      <rect x="40" y="80" width="200" height="360" rx="6" fill="url(#wood3)"/>
      <rect x="52" y="92" width="176" height="104" fill="#241a12"/>
      <rect x="52" y="204" width="176" height="104" fill="#241a12"/>
      <rect x="52" y="316" width="176" height="104" fill="#241a12"/>
      ${bookSpines(60, 100)}
      ${bookSpines(60, 212)}
      ${bookSpines(60, 324)}
      <!-- 붉은 책 강조 -->
      <rect x="150" y="100" width="20" height="90" fill="#c8503a" stroke="#f2d9c9" stroke-width="1"/>
    </g>

    ${painting}

    <!-- 촛대 (오른쪽 탁자) -->
    <g class="hs" data-id="candle">
      <rect x="560" y="330" width="180" height="16" rx="4" fill="url(#wood3)"/>
      <rect x="580" y="346" width="140" height="94" fill="#3a2415"/>
      <rect x="642" y="250" width="14" height="80" fill="#c8a24a"/>
      <ellipse cx="649" cy="246" rx="8" ry="16" fill="#ffcf5c"/>
      <ellipse cx="649" cy="242" rx="4" ry="9" fill="#fff3c4"/>
      <rect x="628" y="330" width="42" height="10" rx="3" fill="#d9a441"/>
      <text x="649" y="366" fill="#a08b6f" font-size="12" text-anchor="middle">촛대</text>
    </g>

    <!-- 문 (시계탑으로) -->
    <g class="hs" data-id="door">
      <rect x="300" y="300" width="120" height="140" rx="6" fill="#3d2c19"/>
      <rect x="312" y="312" width="96" height="116" rx="4" fill="#2c1f11"/>
      <circle cx="398" cy="372" r="6" fill="#d9a441"/>
      <text x="360" y="460" fill="#a08b6f" font-size="12" text-anchor="middle">시계탑으로 →</text>
    </g>
  </svg>`;
}

/* 이전 방으로 돌아가는 화살표 (왼쪽 위) */
function backArrow(label) {
  return `<g class="hs" data-id="back">
    <rect x="16" y="16" width="132" height="40" rx="20" fill="rgba(0,0,0,0.45)" stroke="#d9a441" stroke-width="1.5"/>
    <text x="82" y="42" fill="#e8c883" font-size="15" text-anchor="middle">← ${label}</text>
  </g>`;
}

function bookSpines(x, y) {
  const cols = ["#3a5068", "#7a5c2e", "#4f6d3a", "#6b3a55", "#2e4a5c", "#8a6a2e"];
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += `<rect x="${x + i * 20}" y="${y}" width="16" height="90" fill="${cols[i]}"/>`;
  }
  return s;
}

/* ----- 방 3 : 시계탑 ----- */
function towerSVG() {
  const angle = (state.flags.clockHour % 12) * 30; // 12시=0°, 3시=90°
  const wound = state.flags.clockWound;
  const opened = state.flags.clockHour === 3 && wound;

  const exit = opened
    ? `<g class="hs" data-id="exit">
         <rect x="600" y="150" width="150" height="290" rx="8" fill="#20140a"/>
         <rect x="600" y="150" width="150" height="290" rx="8" fill="url(#glow)"/>
         <rect x="614" y="164" width="122" height="262" rx="6" fill="#0a1420"/>
         <text x="675" y="300" fill="#ffe9a8" font-size="15" text-anchor="middle">✨ 탈출구 ✨</text>
         <text x="675" y="324" fill="#ffe9a8" font-size="12" text-anchor="middle">클릭!</text>
       </g>`
    : "";

  return `<svg viewBox="0 0 800 500">
    <defs>
      <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a3d44"/><stop offset="1" stop-color="#20232a"/>
      </linearGradient>
      <radialGradient id="sky" cx="0.5" cy="0.4" r="0.7">
        <stop offset="0" stop-color="#1c2c4a"/><stop offset="1" stop-color="#0a1120"/>
      </radialGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.6">
        <stop offset="0" stop-color="rgba(255,215,120,0.35)"/><stop offset="1" stop-color="rgba(255,215,120,0)"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="800" height="500" fill="url(#stone)"/>
    ${backArrow("서재")}

    <!-- 창문 + 밤하늘 별 -->
    <g class="hs" data-id="window">
      <path d="M60 200 a80 80 0 0 1 160 0 v170 h-160 z" fill="url(#sky)" stroke="#4a4d54" stroke-width="6"/>
      ${stars()}
      <line x1="140" y1="130" x2="140" y2="370" stroke="#4a4d54" stroke-width="4"/>
      <line x1="62" y1="245" x2="218" y2="245" stroke="#4a4d54" stroke-width="4"/>
    </g>

    <!-- 대형 괘종시계 -->
    <g class="hs" data-id="grandclock">
      <rect x="350" y="70" width="180" height="400" rx="12" fill="#5c3b22"/>
      <rect x="350" y="70" width="180" height="400" rx="12" fill="none" stroke="#d9a441" stroke-width="3"/>
      <circle cx="440" cy="160" r="66" fill="#12202f" stroke="#d9a441" stroke-width="5"/>
      <text x="440" y="112" fill="#9fb4c9" font-size="13" text-anchor="middle">XII</text>
      <text x="498" y="166" fill="#9fb4c9" font-size="13" text-anchor="middle">III</text>
      <text x="440" y="222" fill="#9fb4c9" font-size="13" text-anchor="middle">VI</text>
      <text x="386" y="166" fill="#9fb4c9" font-size="13" text-anchor="middle">IX</text>
      <!-- 시침 -->
      <line x1="440" y1="160" x2="440" y2="112"
            stroke="#e8c883" stroke-width="5" stroke-linecap="round"
            transform="rotate(${angle} 440 160)"/>
      <circle cx="440" cy="160" r="6" fill="#d9a441"/>
      <!-- 태엽 구멍 -->
      <circle cx="440" cy="200" r="7" fill="${wound ? "#d9a441" : "#0a1420"}" stroke="#8a949e" stroke-width="2"/>
      <!-- 진자 -->
      <line x1="440" y1="250" x2="440" y2="400" stroke="#8a949e" stroke-width="3"/>
      <circle cx="440" cy="410" r="22" fill="#c8a24a" stroke="#8a6a2e" stroke-width="3"/>
      <text x="440" y="466" fill="#e8c883" font-size="13" text-anchor="middle">${wound ? "현재 " + state.flags.clockHour + "시 (클릭해 조정)" : "괘종시계 🔒"}</text>
    </g>

    ${exit}
  </svg>`;
}

function stars() {
  const pts = [[95,175],[160,150],[185,210],[110,235],[150,290],[90,300]];
  return pts.map(([x, y]) =>
    `<text x="${x}" y="${y}" fill="#ffe9a8" font-size="16" text-anchor="middle">✦</text>`
  ).join("");
}

/* =====================================================================
   클릭 처리
   ===================================================================== */
scene.addEventListener("click", (e) => {
  const g = e.target.closest(".hs");
  if (!g || state.flags.escaped) return;
  handle(g.dataset.id);
});

function handle(id) {
  const f = state.flags;
  GameAudio.play("click");

  /* ----- 작업실 ----- */
  if (state.room === "workshop") {
    if (id === "toolbox") {
      if (!hasItem("screwdriver")) {
        addItem("screwdriver");
        narrate("공구함에서 드라이버를 찾았다. 스승이 비밀 서랍을 열 때 쓰던 것이다.", "🪛");
      }
      else toast("공구함은 이제 비어 있다.");
    }
    else if (id === "poster") {
      narrate("벽에 붙은 설계도 조각. 큼직한 숫자 4가 눈에 들어온다.", "📜");
      clue("📜", "스승의 설계도", "'시간 되돌리기 장치'의 설계도 조각. 한쪽에 큼직한 숫자가 적혀 있다: <b style='color:#d9a441;font-size:22px'>4</b><br><span class='muted'>금고 자물쇠의 첫 자리 같다.</span>");
    }
    else if (id === "wallclock") {
      narrate("멈춘 벽시계는 3시를 가리킨다. 쪽지 속 그 시각과 똑같다.", "🕰️");
      clue("🕰️", "멈춘 벽시계", "바늘이 <b>3시</b>에서 멈춰 있다.<br><span class='muted'>스승의 글씨: \"시간은 탑에서 다시 흐른다.\"</span>");
    }
    else if (id === "drawer") {
      if (f.drawerOpen) { toast("서랍은 이미 비어 있다."); return; }
      if (!hasItem("screwdriver")) { toast("서랍이 나사로 단단히 고정돼 있다. 공구가 필요하다."); return; }
      f.drawerOpen = true;
      GameAudio.play("open");
      addItem("brassKey");
      renderRoom();
      narrate("서랍 속 황동 열쇠와 쪽지 — \"그들이 오기 전에, 탑의 시계를 3시에 맞춰라. —E\"", "🗝️");
      clue("🗝️", "서랍을 열었다!", "나사를 풀자 서랍이 열렸다. <b>황동 열쇠</b>를 얻었다!<br><span class='muted'>스승의 쪽지: \"그들이 오기 전에 탑의 시계를 3시에 맞춰라. 나머지 숫자는 붉은 책과 촛불이 안다. —E\"</span>");
    }
    else if (id === "door") {
      if (f.workshopDoorOpen) { go("study"); return; }
      if (!hasItem("brassKey")) { toast("문이 잠겨 있다. 열쇠가 필요하다."); return; }
      f.workshopDoorOpen = true;
      GameAudio.play("door");
      toast("황동 열쇠로 문을 열었다.");
      setTimeout(() => go("study"), 500);
    }
  }

  /* ----- 서재 ----- */
  else if (state.room === "study") {
    if (id === "back") { GameAudio.play("door"); go("workshop"); }
    else if (id === "bookshelf") {
      narrate("스승의 붉은 일기: \"그들이 장치를 노린다. 금고 둘째 자리는 9.\"", "📕");
      clue("📕", "스승의 일기", "붉은 일기장을 펼치자 다급한 필적이 보인다.<br>\"그들이 장치를 노리고 있다. 금고 둘째 자리는 <b style='color:#d9a441;font-size:22px'>9</b>.\"");
    }
    else if (id === "candle") {
      narrate("촛대 밑동에 새겨진 숫자 2. 스승의 오랜 암호 습관이다.", "🕯️");
      clue("🕯️", "촛대", "촛농이 굳은 받침 아래에 작게 새겨진 숫자: <b style='color:#d9a441;font-size:22px'>2</b><br><span class='muted'>금고 자물쇠의 셋째 자리.</span>");
    }
    else if (id === "painting") {
      f.paintingMoved = true;
      GameAudio.play("open");
      renderRoom();
      narrate("초상화를 밀자 벽 속 금고가 드러났다. 스승은 이걸 감추고 싶었던 거다.", "🖼️");
    }
    else if (id === "safe") {
      if (f.safeOpen) { toast("금고는 이미 열려 있다."); return; }
      openCode("safe", "🔒 금고 (3자리)", "포스터 · 붉은 책 · 촛대의 숫자를 순서대로.");
    }
    else if (id === "door") {
      GameAudio.play("door");
      go("tower");
    }
  }

  /* ----- 시계탑 ----- */
  else if (state.room === "tower") {
    if (id === "back") { GameAudio.play("door"); go("study"); }
    else if (id === "window") {
      clue("🌙", "밤하늘", "창밖으로 별이 빛난다.<br><span class='muted'>탈출구는 저 창이 아니라, 시계 안에 있다.</span>");
    }
    else if (id === "grandclock") {
      if (!f.clockWound) {
        if (!hasItem("cog")) { toast("시계가 멈춰 있다. 태엽 구멍에 맞는 무언가가 필요하다."); return; }
        f.clockWound = true;
        GameAudio.play("wind");
        renderRoom();
        narrate("태엽을 끼우자 멈췄던 시계가 다시 똑딱이기 시작했다. 시간이 되돌아오는 것만 같다.", "⚙️");
        clue("⚙️", "시계가 살아났다!", "황금 태엽을 끼우자 진자가 흔들리기 시작했다.<br><span class='muted'>이제 시계를 클릭해 시각을 맞추자. 스승이 사라진 시각은 벽시계가 가리키던 3시였다.</span>");
        return;
      }
      // 시각 조정 (클릭할 때마다 +1시)
      f.clockHour = (f.clockHour % 12) + 1;
      renderRoom();
      if (f.clockHour === 3) {
        GameAudio.play("unlock");
        narrate("바늘이 3시에 닿는 순간, 벽 뒤에서 육중한 문이 열리는 소리가 울렸다!", "✨");
      } else {
        GameAudio.play("tick");
      }
    }
    else if (id === "exit") {
      win();
    }
  }
}

/* =====================================================================
   유틸 : 아이템 / 방이동 / 메시지
   ===================================================================== */
function hasItem(id) { return state.inventory.includes(id); }
function addItem(id) {
  if (!hasItem(id)) {
    state.inventory.push(id);
    $("inv-count").textContent = state.inventory.length;
    GameAudio.play("pickup");
    toast(`${ITEMS[id].emoji} ${ITEMS[id].name} 획득!`);
  }
}
function go(room) {
  state.room = room;
  renderRoom();
  const intro = ROOM_INTRO[room];
  if (intro) narrate(intro.text, intro.icon);
}

let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ----- 내레이션(스토리 자막) + 일지 기록 ----- */
function narrate(text, icon = "📜", log = true) {
  const t = $("narr-text");
  t.classList.add("fade");
  setTimeout(() => { t.textContent = text; t.classList.remove("fade"); }, 200);
  $("narr-speaker").textContent = icon;
  GameAudio.speak(text);
  if (log && !state.journal.some((e) => e.text === text)) {
    state.journal.push({ icon, text });
  }
}

/* ----- 단서/메시지 모달 ----- */
function clue(emoji, title, body) {
  $("clue-emoji").textContent = emoji;
  $("clue-title").textContent = title;
  $("clue-body").innerHTML = body;
  $("clue-modal").classList.add("show");
}

/* ----- 인벤토리 팝업 ----- */
$("btn-inventory").addEventListener("click", () => {
  const list = $("inv-list");
  list.innerHTML = "";
  state.inventory.forEach((id) => {
    const it = ITEMS[id];
    const div = document.createElement("div");
    div.className = "inv-item";
    div.innerHTML = `<div class="emoji">${it.emoji}</div><div class="name">${it.name}</div>`;
    div.onclick = () => toast(`${it.emoji} ${it.name} — ${it.desc}`);
    list.appendChild(div);
  });
  $("inv-empty").style.display = state.inventory.length ? "none" : "block";
  $("inventory-modal").classList.add("show");
});

/* ----- 일지(스토리 로그) 팝업 ----- */
$("btn-journal").addEventListener("click", () => {
  const list = $("journal-list");
  if (!state.journal.length) {
    list.innerHTML = `<p class="journal-empty">아직 기록할 이야기가 없다. 공방을 조사하자.</p>`;
  } else {
    list.innerHTML = state.journal
      .map((e) => `<div class="journal-entry"><span class="je-icon">${e.icon}</span><span class="je-text">${e.text}</span></div>`)
      .join("");
  }
  $("journal-modal").classList.add("show");
});

/* ----- 힌트 ----- */
$("btn-hint").addEventListener("click", () => {
  const f = state.flags;
  let h = "";
  if (state.room === "workshop") {
    if (!hasItem("screwdriver")) h = "바닥의 공구함부터 열어보자.";
    else if (!f.drawerOpen) h = "드라이버로 잠긴 서랍을 열 수 있다.";
    else if (!f.workshopDoorOpen) h = "황동 열쇠로 서재 문을 열자. 포스터와 벽시계도 꼭 확인!";
    else h = "서재 문을 클릭해 이동하자.";
  } else if (state.room === "study") {
    if (!f.paintingMoved) h = "초상화 뒤에 뭔가 숨겨져 있을지도. 붉은 책과 촛대도 조사하자.";
    else if (!f.safeOpen) h = "금고 코드 = 포스터(4)·붉은책(9)·촛대(2) 순서.";
    else h = "황금 태엽을 챙겼으면 시계탑으로 가자.";
  } else {
    if (!f.clockWound) h = "황금 태엽으로 대시계를 감아야 한다.";
    else if (f.clockHour !== 3) h = "벽시계가 가리키던 시각(3시)에 대시계를 맞추자. 시계를 클릭!";
    else h = "나타난 탈출구를 클릭!";
  }
  toast("💡 " + h);
});

/* =====================================================================
   암호 입력 (키패드)
   ===================================================================== */
function openCode(target, title, hint) {
  state.codeTarget = target;
  state.codeBuffer = "";
  $("code-title").textContent = title;
  $("code-hint").textContent = hint;
  updateCodeDisplay();
  $("code-modal").classList.add("show");
}
function updateCodeDisplay() {
  const d = $("code-display");
  d.className = "code-display";
  const b = state.codeBuffer;
  d.textContent = (b + "＿＿＿").slice(0, 3).replace(/(.)/g, "$1 ").trim();
}
document.querySelector(".keypad").addEventListener("click", (e) => {
  const key = e.target.dataset.key;
  if (!key) return;
  GameAudio.play("click");
  if (key === "clear") { state.codeBuffer = ""; updateCodeDisplay(); return; }
  if (key === "ok") { checkCode(); return; }
  if (state.codeBuffer.length < 3) { state.codeBuffer += key; updateCodeDisplay(); }
});
function checkCode() {
  const d = $("code-display");
  if (state.codeTarget === "safe") {
    if (state.codeBuffer === SAFE_CODE) {
      d.classList.add("ok");
      GameAudio.play("success");
      state.flags.safeOpen = true;
      addItem("cog");
      setTimeout(() => {
        $("code-modal").classList.remove("show");
        renderRoom();
        narrate("금고 속 황금 태엽과 마지막 메모 — \"태엽으로 탑의 시계를 감고, 내가 사라진 그 시각에 맞춰라.\"", "⚙️");
        clue("⚙️", "금고가 열렸다!", "안에서 <b>황금 태엽</b>을 발견했다!<br><span class='muted'>스승의 마지막 메모: \"이 태엽으로 탑의 대시계를 감고, 내가 사라진 그 시각에 맞춰라. 그러면 길이 열린다.\"</span>");
      }, 600);
    } else {
      d.classList.add("err");
      GameAudio.play("error");
      d.textContent = "오답";
      setTimeout(() => { state.codeBuffer = ""; updateCodeDisplay(); }, 700);
    }
  }
}

/* =====================================================================
   승리 / 타이머 / 시작·재시작
   ===================================================================== */
function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
function tick() { $("timer").textContent = fmt(Date.now() - startTs); }

function win() {
  state.flags.escaped = true;
  clearInterval(timerId);
  GameAudio.stopMusic();
  GameAudio.stopSpeak();
  GameAudio.play("win");
  const elapsed = Date.now() - startTs;
  const under = elapsed <= 180000;
  $("win-time").innerHTML =
    `기록: <b>${fmt(elapsed)}</b>` + (under ? " ⭐ 3분 이내 클리어!" : "");
  $("win-screen").classList.add("show");
}

function startGame() {
  state = freshState();
  GameAudio.init();
  GameAudio.resume();
  GameAudio.startMusic();
  renderRoom();
  narrate(ROOM_INTRO.workshop.text, ROOM_INTRO.workshop.icon);
  $("start-screen").classList.remove("show");
  $("win-screen").classList.remove("show");
  startTs = Date.now();
  clearInterval(timerId);
  timerId = setInterval(tick, 250);
  tick();
}

$("btn-start").addEventListener("click", startGame);
$("btn-replay").addEventListener("click", startGame);

/* 오디오 토글 */
$("btn-sound").addEventListener("click", () => {
  GameAudio.init(); GameAudio.resume();
  const on = GameAudio.toggleSound();
  $("btn-sound").textContent = on ? "🔊" : "🔇";
  $("btn-sound").classList.toggle("off", !on);
});
$("btn-voice").addEventListener("click", () => {
  const on = GameAudio.toggleVoice();
  $("btn-voice").textContent = on ? "🗣️" : "🔕";
  $("btn-voice").classList.toggle("off", !on);
});

/* 닫기 버튼 (모든 X, 인벤토리 배경) */
document.querySelectorAll("[data-close]").forEach((b) =>
  b.addEventListener("click", () => b.closest(".overlay").classList.remove("show"))
);
[ "inventory-modal", "clue-modal", "journal-modal" ].forEach((idm) => {
  $(idm).addEventListener("click", (e) => {
    if (e.target.id === idm) $(idm).classList.remove("show");
  });
});

/* 초기 렌더 (시작 화면 뒤 배경용) */
renderRoom();
