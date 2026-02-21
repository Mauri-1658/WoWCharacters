/* ═══════════════════════════════════════════════════════════
   NEXUS — WoW Character Manager
   Frontend Application Logic
   ═══════════════════════════════════════════════════════════ */

// ─── WoW Class Color Map ────────────────────────────────────
const CLASS_COLORS = {
  Guerrero: "#C79C6E",
  Warrior: "#C79C6E",
  Paladín: "#F58CBA",
  Paladin: "#F58CBA",
  Cazador: "#ABD473",
  Hunter: "#ABD473",
  Pícaro: "#FFF569",
  Rogue: "#FFF569",
  Sacerdote: "#FFFFFF",
  Priest: "#FFFFFF",
  "Caballero de la Muerte": "#C41E3A",
  "Death Knight": "#C41E3A",
  Chamán: "#0070DE",
  Shaman: "#0070DE",
  Mago: "#69CCF0",
  Mage: "#69CCF0",
  Brujo: "#9482C9",
  Warlock: "#9482C9",
  Monje: "#00FF96",
  Monk: "#00FF96",
  Druida: "#FF7D0A",
  Druid: "#FF7D0A",
  "Cazador de demonios": "#A330C9",
  "Demon Hunter": "#A330C9",
  Evocador: "#33937F",
  Evoker: "#33937F",
};

// ─── Class Short Names (Spanish → English) ──────────────────
const CLASS_SHORT_NAMES = {
  'Warrior': 'Warrior',
  'Paladin': 'Paladin',
  'Hunter': 'Hunter',
  'Rogue': 'Rogue',
  'Priest': 'Priest',
  'Death Knight': 'DK',
  'Shaman': 'Shaman',
  'Mage': 'Mage',
  'Warlock': 'Warlock',
  'Monk': 'Monk',
  'Druid': 'Druid',
  'Demon Hunter': 'DH',
  'Evoker': 'Evoker',
  // Spanish keys
  'Guerrero': 'Warrior',
  'Paladín': 'Paladin',
  'Cazador': 'Hunter',
  'Pícaro': 'Rogue',
  'Sacerdote': 'Priest',
  'Caballero de la Muerte': 'DK',
  'Chamán': 'Shaman',
  'Mago': 'Mage',
  'Brujo': 'Warlock',
  'Monje': 'Monk',
  'Druida': 'Druid',
  'Cazador de demonios': 'DH',
  'Evocador': 'Evoker',
};

function getClassShort(className) {
  return CLASS_SHORT_NAMES[className] || className;
}

// ─── Quality Colors ─────────────────────────────────────────
const QUALITY_CLASSES = {
  POOR: "quality-poor",
  COMMON: "quality-common",
  UNCOMMON: "quality-uncommon",
  RARE: "quality-rare",
  EPIC: "quality-epic",
  LEGENDARY: "quality-legendary",
  ARTIFACT: "quality-artifact",
  HEIRLOOM: "quality-heirloom",
};

// ─── State ──────────────────────────────────────────────────
let allCharacters = [];
let filteredCharacters = [];
let currentUser = null;
let mainCharIds = new Set(JSON.parse(localStorage.getItem('nexus_mains') || '[]'));
let friendChars = JSON.parse(localStorage.getItem('nexus_friends') || '[]'); // Array of {name, realm}
let allFriendData = [];

// ─── DOM Elements ───────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const loginScreen = $("#login-screen");
const dashboard = $("#dashboard");
const loginError = $("#login-error");
const userBattletag = $("#user-battletag");
const btnLogout = $("#btn-logout");
const searchInput = $("#search-input");
const filterFaction = $("#filter-faction");
const filterClass = $("#filter-class");
const filterRealm = $("#filter-realm");
const sortBy = $("#sort-by");
const charsGrid = $("#characters-grid");
const noResults = $("#no-results");
const loadingSpinner = $("#loading-spinner");

// Mains
const mainsSection   = $('#mains-section');
const mainsGrid      = $('#mains-grid');
const mainsCount     = $('#mains-count');

// Friends
const friendsSection = $('#friends-section');
const friendsGrid    = $('#friends-grid');
const friendsCount   = $('#friends-count');

// Stats
const statTotal = $("#stat-total");
const statMaxLevel = $("#stat-max-level");
const statAlliance = $("#stat-alliance");
const statHorde = $("#stat-horde");
const statItemAlliance = $("#stat-item-alliance");
const statItemHorde = $("#stat-item-horde");

// Modals
const charModal = $("#char-modal");
const modalOverlay = $("#modal-overlay");
const modalClose = $("#modal-close");

// Faction Modal
const factionModal = $("#faction-modal");
const factionModalClose = $("#faction-modal-close");
const factionModalTitle = $("#faction-modal-title");
const factionStatsList = $("#faction-stats-list");
const factionModalOverlay = factionModal.querySelector(".modal-overlay");

// Talent Modal
const talentModal = $("#talent-modal");
const talentModalOverlay = $("#talent-modal-overlay");
const talentModalClose = $("#talent-modal-close");
const talentTreeContainer = $("#talent-tree-container");
const talentBtnInDetail = $("#modal-btn-talents");

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  // Check for URL error params
  const params = new URLSearchParams(window.location.search);
  if (params.get("error")) {
    showLoginError(getErrorMessage(params.get("error")));
    history.replaceState(null, "", "/");
  }
  if (params.get("login") === "success") {
    history.replaceState(null, "", "/");
  }

  // Check auth status
  try {
    const res = await fetch("/auth/status", { cache: "no-store" });
    const data = await res.json();

    if (data.authenticated) {
      currentUser = data.user;
      showDashboard();
      loadCharacters();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }

  // Event listeners
  btnLogout.addEventListener("click", () => {
    window.location.href = "/auth/logout";
  });
  searchInput.addEventListener("input", applyFilters);
  filterFaction.addEventListener("change", applyFilters);
  filterClass.addEventListener("change", applyFilters);
  filterRealm.addEventListener("change", applyFilters);
  sortBy.addEventListener("change", applyFilters);
  modalOverlay.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);
  
  // Faction modal events
  statItemAlliance.addEventListener("click", () => openFactionModal("ALLIANCE"));
  statItemHorde.addEventListener("click", () => openFactionModal("HORDE"));
  factionModalClose.addEventListener("click", closeFactionModal);
  factionModalOverlay.addEventListener("click", closeFactionModal);

  // Talent modal events
  talentModalClose.addEventListener("click", closeTalentModal);
  talentModalOverlay.addEventListener("click", closeTalentModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeFactionModal();
      closeTalentModal();
    }
  });

  // Dashboard filter toggle
  const btnToggleFilters = $('#btn-toggle-filters');
  const filtersBar = $('#filters-bar');
  if (btnToggleFilters && filtersBar) {
    btnToggleFilters.addEventListener('click', () => {
      const isCollapsed = filtersBar.classList.toggle('collapsed');
      btnToggleFilters.classList.toggle('active', !isCollapsed);
    });
  }
});

// ═══════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════
function showLogin() {
  loginScreen.classList.add("active");
  dashboard.classList.remove("active");
}

function showDashboard() {
  loginScreen.classList.remove("active");
  dashboard.classList.add("active");
  if (currentUser) {
    userBattletag.textContent = currentUser.battletag || "Usuario";
  }
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove("hidden");
}

function getErrorMessage(code) {
  const messages = {
    auth_denied: "Autenticación denegada. Inténtalo de nuevo.",
    no_code: "No se recibió código de autorización.",
    token_failed: "Error al obtener el token. Verifica tus credenciales.",
  };
  return messages[code] || "Error de autenticación desconocido.";
}

// ═══════════════════════════════════════════════════════════
// LOAD CHARACTERS
// ═══════════════════════════════════════════════════════════
async function loadCharacters() {
  showLoading(true);

  try {
    const res = await fetch("/api/user/characters", { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/auth/logout";
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    allCharacters = parseCharacters(data);
    populateFilters();
    updateStats();
    await loadFriendsData(); // Load friends after user chars
    applyFilters();
  } catch (err) {
    console.error("Error loading characters:", err);
    charsGrid.innerHTML = `
      <div class="no-results">
        <p class="no-results-text">Error al cargar los personajes: ${err.message}</p>
      </div>`;
  } finally {
    showLoading(false);
  }
}

// ─── Parse API Response ────────────────────────────────────
function parseCharacters(data) {
  const characters = [];

  if (data.wow_accounts) {
    for (const account of data.wow_accounts) {
      if (account.characters) {
        for (const char of account.characters) {
          characters.push({
            id: char.id,
            name: char.name,
            level: char.level || 0,
            realm: char.realm?.name || char.realm?.slug || "—",
            realmSlug: char.realm?.slug || "",
            race: char.playable_race?.name || "—",
            class: char.playable_class?.name || "—",
            faction: char.faction?.type || char.faction?.name || "NEUTRAL",
            factionName: char.faction?.name || "Neutral",
          });
        }
      }
    }
  }

  return characters;
}

// ═══════════════════════════════════════════════════════════
// FILTERS & SORTING
// ═══════════════════════════════════════════════════════════
function populateFilters() {
  const classes = [...new Set(allCharacters.map((c) => c.class))].sort();
  const realms = [...new Set(allCharacters.map((c) => c.realm))].sort();

  // Populate class filter
  filterClass.innerHTML = '<option value="all">Todas</option>';
  classes.forEach((cls) => {
    const opt = document.createElement("option");
    opt.value = cls;
    opt.textContent = cls;
    filterClass.appendChild(opt);
  });

  // Populate realm filter
  filterRealm.innerHTML = '<option value="all">Todos</option>';
  realms.forEach((realm) => {
    const opt = document.createElement("option");
    opt.value = realm;
    opt.textContent = realm;
    filterRealm.appendChild(opt);
  });
}

function applyFilters() {
  const search = searchInput.value.toLowerCase().trim();
  const faction = filterFaction.value;
  const cls = filterClass.value;
  const realm = filterRealm.value;
  const sort = sortBy.value;

  filteredCharacters = allCharacters.filter((c) => {
    if (
      search &&
      !c.name.toLowerCase().includes(search) &&
      !c.realm.toLowerCase().includes(search)
    )
      return false;
    if (faction !== "all" && c.faction !== faction) return false;
    if (cls !== "all" && c.class !== cls) return false;
    if (realm !== "all" && c.realm !== realm) return false;
    return true;
  });

  // Sort
  filteredCharacters.sort((a, b) => {
    switch (sort) {
      case "level-desc":
        return b.level - a.level;
      case "level-asc":
        return a.level - b.level;
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  renderCharacters();
  checkGlobalSearchTrigger(search);
}

function checkGlobalSearchTrigger(search) {
  const parts = search.split('-');
  
  if (parts.length >= 2 && parts[0].length >= 2 && parts[1].length >= 2) {
    // Name-Realm format
    if (filteredCharacters.length === 0) {
      appendGlobalSearchPrompt(parts[0], parts[1]);
    }
  } else if (search.length >= 3 && !search.includes('-')) {
    // Name-only format (min 3 chars to avoid too many results)
    if (filteredCharacters.length === 0) {
      appendGlobalNameSearchPrompt(search);
    }
  }
}

function appendGlobalNameSearchPrompt(name) {
  const promptHtml = `
    <div class="global-search-prompt" onclick="fetchGlobalCharacterByName('${name}')">
      <div class="prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div class="prompt-text">
        <p>¿Buscas a <strong>${name}</strong> en todo Blizzard?</p>
        <span>Pulsa para buscar en todos los reinos</span>
      </div>
    </div>
  `;
  charsGrid.innerHTML = promptHtml;
}

function appendGlobalSearchPrompt(name, realm) {
  const promptHtml = `
    <div class="global-search-prompt" onclick="fetchGlobalCharacter('${name}', '${realm}')">
      <div class="prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div class="prompt-text">
        <p>¿No es tuyo? Buscar <strong>${name}</strong> en <strong>${realm}</strong></p>
        <span>Pulsa para buscar en todo Blizzard</span>
      </div>
    </div>
  `;
  charsGrid.innerHTML = promptHtml;
}

async function fetchGlobalCharacterByName(name) {
  showLoading(true);
  try {
    const res = await fetch(`/api/character/search/${name}`, { cache: "no-store" });
    if (!res.ok) throw new Error('Error en la búsqueda');
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('Sin resultados');
    }

    if (data.results.length === 1) {
      // If only one, open it directly
      const char = data.results[0];
      openCharDetail(char.realmSlug, char.name);
    } else {
      // Multiple results, show selection list
      renderSearchResults(data.results, name);
    }
  } catch (err) {
    charsGrid.innerHTML = `
      <div class="no-results">
        <p class="no-results-text">No encontramos ningún "${name}" en Blizzard.</p>
        <span style="font-size:0.8rem; color:var(--text-muted);">Prueba con el formato Nombre-Server o revisa la ortografía.</span>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

function renderSearchResults(results, queryName) {
  charsGrid.innerHTML = `
    <div class="search-results-header" style="grid-column: 1/-1; margin-bottom: 1rem;">
      <p style="color:var(--text-secondary); font-size:0.9rem;">Se han encontrado ${results.length} personajes llamados "<strong>${queryName}</strong>"</p>
    </div>
    ${results.map(char => {
      const classColor = CLASS_COLORS[char.className] || '#d4a843';
      const factionClass = char.faction === 'ALLIANCE' ? 'faction-alliance' : 'faction-horde';
      
      return `
        <div class="char-card search-result-card ${factionClass}" 
             style="--class-color: ${classColor}"
             onclick="openCharDetail('${char.realmSlug}', '${char.name}')">
          <div class="char-card-inner">
            <div class="char-avatar-wrap" style="width: 70px; min-height: 80px;">
              <div class="char-avatar char-avatar-placeholder" style="font-size: 1.2rem; color: ${classColor};">
                ${getClassEmoji(char.className)}
              </div>
            </div>
            <div class="char-info" style="padding: 0.75rem;">
              <div class="char-name">${char.name}</div>
              <div class="char-meta">${char.level} · ${char.raceName}</div>
              <span class="char-class" style="color: ${classColor}; border: 1px solid ${classColor}44; background: ${classColor}15; font-size:0.6rem;">
                ${getClassShort(char.className)}
              </span>
              <div class="char-realm" style="font-weight: 700; color: var(--gold);">${char.realm}</div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ═══════════════════════════════════════════════════════════
// RENDER CHARACTERS
// ═══════════════════════════════════════════════════════════
function renderCharacters() {
  // Render mains section
  renderMains();
  renderFriends();

  // Filter out main characters from the grid
  const gridCharacters = filteredCharacters.filter(c => !mainCharIds.has(getCharKey(c)));

  if (gridCharacters.length === 0) {
    charsGrid.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');

  charsGrid.innerHTML = gridCharacters.map(char => {
    const classColor = CLASS_COLORS[char.class] || '#d4a843';
    const factionClass = char.faction === 'ALLIANCE' ? 'faction-alliance'
                       : char.faction === 'HORDE' ? 'faction-horde'
                       : 'faction-neutral';

    return `
      <div class="char-card ${factionClass}"
           style="--class-color: ${classColor}"
           data-realm="${char.realmSlug}"
           data-name="${char.name}">
        <div class="char-card-inner" onclick="openCharDetail('${char.realmSlug}', '${char.name}')">
          <div class="char-avatar-wrap">
            <div class="char-avatar char-avatar-placeholder" id="avatar-${char.realmSlug}-${char.name}" style="
              background: linear-gradient(135deg, ${classColor}33, ${classColor}11);
              display: flex; align-items: center; justify-content: center;
              font-size: 1.8rem; color: ${classColor};
            ">${getClassEmoji(char.class)}</div>
          </div>
          <div class="char-info">
            <div class="char-name">${char.name}</div>
            <div class="char-meta">${char.race} · ${char.factionName}</div>
            <span class="char-class" id="badge-${char.realmSlug}-${char.name}" style="color: ${classColor}; border: 1px solid ${classColor}44; background: ${classColor}15;">
              ${getClassShort(char.class)}
            </span>
            <div class="char-realm">${char.realm}</div>
          </div>
        </div>
        <span class="char-level">${char.level}</span>
        <span class="char-ilvl" id="ilvl-${char.realmSlug}-${char.name}"></span>
      </div>`;
  }).join('');

  // Lazy-load character portraits
  loadCardAvatars(gridCharacters);
}

// ─── Friends Management ──────────────────────────────────
async function loadFriendsData() {
  if (friendChars.length === 0) return;
  
  allFriendData = [];
  const promises = friendChars.map(async (f) => {
    try {
      const res = await fetch(`/api/character/${f.realm}/${f.name.toLowerCase()}`, { cache: "no-store" });
      if (res.ok) {
        const char = await res.json();
        allFriendData.push({
          name: char.name,
          realm: char.realm?.name,
          realmSlug: f.realm,
          level: char.level,
          class: char.character_class?.name,
          activeSpec: char.active_spec?.name,
          race: char.race?.name,
          faction: char.faction?.type,
          factionName: char.faction?.name,
          isFriend: true
        });
      }
    } catch (e) {
      console.error(`Error loading friend ${f.name}:`, e);
    }
  });

  await Promise.all(promises);
}

function renderFriends() {
  if (!allFriendData || allFriendData.length === 0) {
    if (friendsSection) friendsSection.classList.add('hidden');
    return;
  }

  if (friendsSection) friendsSection.classList.remove('hidden');
  if (friendsCount) friendsCount.textContent = allFriendData.length;

  friendsGrid.innerHTML = allFriendData.map(char => {
    const classColor = CLASS_COLORS[char.class] || '#d4a843';
    const factionClass = char.faction === 'ALLIANCE' ? 'faction-alliance'
                       : char.faction === 'HORDE' ? 'faction-horde'
                       : 'faction-neutral';

    return `
      <div class="char-card char-card-friend ${factionClass}" 
           style="--class-color: ${classColor}"
           data-realm="${char.realmSlug}" 
           data-name="${char.name}">
        <button class="btn-remove-friend" onclick="event.stopPropagation(); removeFriend('${char.realmSlug}', '${char.name}')" title="Eliminar de amigos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="char-card-inner" onclick="openCharDetail('${char.realmSlug}', '${char.name}')">
          <div class="char-avatar-wrap">
            <div class="char-avatar char-avatar-placeholder" id="friend-avatar-${char.realmSlug}-${char.name}" style="
              background: linear-gradient(135deg, ${classColor}33, ${classColor}11);
              display: flex; align-items: center; justify-content: center;
              font-size: 1.8rem; color: ${classColor};
            ">${getClassEmoji(char.class)}</div>
          </div>
          <div class="char-info">
            <div class="char-name">${char.name}</div>
            <div class="char-meta">${char.race} · ${char.factionName}</div>
            <span class="char-class" id="friend-badge-${char.realmSlug}-${char.name}" style="color: ${classColor}; border: 1px solid ${classColor}44; background: ${classColor}15;">
              ${getClassShort(char.class)}${char.activeSpec ? ` - ${char.activeSpec}` : ''}
            </span>
            <div class="char-realm">${char.realm}</div>
          </div>
        </div>
        <span class="char-level">${char.level}</span>
        <span class="char-ilvl" id="friend-ilvl-${char.realmSlug}-${char.name}"></span>
      </div>`;
  }).join('');
  
  // Load avatars for friends
  loadCardAvatars(allFriendData, true);
}

function toggleFriend(realm, name) {
  const index = friendChars.findIndex(f => f.realm === realm && f.name.toLowerCase() === name.toLowerCase());
  if (index === -1) {
    friendChars.push({ realm, name });
  } else {
    friendChars.splice(index, 1);
  }
  localStorage.setItem('nexus_friends', JSON.stringify(friendChars));
  loadFriendsData().then(renderCharacters);
}

function removeFriend(realm, name) {
  friendChars = friendChars.filter(f => !(f.realm === realm && f.name.toLowerCase() === name.toLowerCase()));
  localStorage.setItem('nexus_friends', JSON.stringify(friendChars));
  allFriendData = allFriendData.filter(f => !(f.realmSlug === realm && f.name.toLowerCase() === name.toLowerCase()));
  renderCharacters();
}

// ─── Lazy-load Avatars for Character Cards ─────────────────
async function loadCardAvatars(characters, forFriends = false) {
  for (const char of characters) {
    const avatarId = forFriends ? `friend-avatar-${char.realmSlug}-${char.name}` : `avatar-${char.realmSlug}-${char.name}`;
    const ilvlId = forFriends ? `friend-ilvl-${char.realmSlug}-${char.name}` : `ilvl-${char.realmSlug}-${char.name}`;

    try {
      // Fetch avatar + ilvl in parallel
      const [mediaRes, detailRes] = await Promise.all([
        fetch(`/api/character/${char.realmSlug}/${char.name.toLowerCase()}/media`, { cache: "no-store" }),
        fetch(`/api/character/${char.realmSlug}/${char.name.toLowerCase()}`, { cache: "no-store" })
      ]);

      // Avatar
      if (mediaRes.ok) {
        const media = await mediaRes.json();
        const avatarAsset =
          media.assets?.find((a) => a.key === "inset") ||
          media.assets?.find((a) => a.key === "avatar") ||
          media.assets?.[0];
        if (avatarAsset?.value) {
          const placeholder = document.getElementById(avatarId);
          if (placeholder) {
            const img = document.createElement("img");
            img.src = avatarAsset.value;
            img.alt = char.name;
            img.className = "char-avatar char-avatar-img";
            img.onload = () => { placeholder.replaceWith(img); };
          }
        }
      }

      // iLvl
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const ilvl = detail.equipped_item_level || detail.average_item_level;
        if (ilvl) {
          const ilvlEl = document.getElementById(ilvlId);
          if (ilvlEl) {
            ilvlEl.textContent = ilvl;
            ilvlEl.title = 'Item Level';
          }
        }
        // Spec + Short Class Combined
        const specName = detail.active_spec?.name;
        if (specName) {
          const badgeId = forFriends ? `friend-badge-${char.realmSlug}-${char.name}` : `badge-${char.realmSlug}-${char.name}`;
          const badgeEl = document.getElementById(badgeId);
          if (badgeEl) badgeEl.textContent = `${getClassShort(char.class)} - ${specName}`;
        }
      }
    } catch (err) {
      // Keep placeholders on error
    }
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN CHARACTERS (FAVORITES)
// ═══════════════════════════════════════════════════════════
function getCharKey(char) {
  return `${char.realmSlug}|${char.name}`.toLowerCase();
}

function toggleMain(realmSlug, charName) {
  const key = `${realmSlug}|${charName}`.toLowerCase();
  if (mainCharIds.has(key)) {
    mainCharIds.delete(key);
  } else {
    mainCharIds.add(key);
  }
  localStorage.setItem('nexus_mains', JSON.stringify([...mainCharIds]));
  renderCharacters();
}

function renderMains() {
  const mains = allCharacters.filter(c => mainCharIds.has(getCharKey(c)));

  if (mains.length === 0) {
    mainsSection.classList.add('hidden');
    return;
  }

  mainsSection.classList.remove('hidden');
  mainsCount.textContent = mains.length;

  mainsGrid.innerHTML = mains.map(char => {
    const classColor = CLASS_COLORS[char.class] || '#d4a843';
    const factionClass = char.faction === 'ALLIANCE' ? 'faction-alliance'
                       : char.faction === 'HORDE' ? 'faction-horde'
                       : 'faction-neutral';

    return `
      <div class="main-card ${factionClass}"
           style="--class-color: ${classColor}"
           onclick="openCharDetail('${char.realmSlug}', '${char.name}')">
        <div class="main-card-avatar-wrap">
          <div class="char-avatar char-avatar-placeholder" id="main-avatar-${char.realmSlug}-${char.name}" style="
            background: linear-gradient(135deg, ${classColor}33, ${classColor}11);
            display: flex; align-items: center; justify-content: center;
            font-size: 2.2rem; color: ${classColor};
          ">${getClassEmoji(char.class)}</div>
        </div>
        <div class="main-card-info">
          <div class="main-card-name">${char.name}</div>
          <div class="main-card-meta">${char.race}</div>
          <span class="char-class" id="main-badge-${char.realmSlug}-${char.name}" style="color: ${classColor}; border: 1px solid ${classColor}44; background: ${classColor}15;">
            ${getClassShort(char.class)}
          </span>
          <div class="main-card-realm">${char.realm}</div>
        </div>
        <span class="main-card-level">${char.level}</span>
        <span class="char-ilvl" id="main-ilvl-${char.realmSlug}-${char.name}"></span>
      </div>`;
  }).join('');

  // Also load avatars for mains
  loadMainAvatars(mains);
}

async function loadMainAvatars(mains) {
  for (const char of mains) {
    try {
      const [mediaRes, detailRes] = await Promise.all([
        fetch(`/api/character/${char.realmSlug}/${char.name.toLowerCase()}/media`, { cache: "no-store" }),
        fetch(`/api/character/${char.realmSlug}/${char.name.toLowerCase()}`, { cache: "no-store" })
      ]);

      if (mediaRes.ok) {
        const media = await mediaRes.json();
        const avatarAsset = media.assets?.find(a => a.key === 'inset') ||
                            media.assets?.find(a => a.key === 'avatar') ||
                            media.assets?.[0];
        if (avatarAsset?.value) {
          const placeholder = document.getElementById(`main-avatar-${char.realmSlug}-${char.name}`);
          if (placeholder) {
            const img = document.createElement('img');
            img.src = avatarAsset.value;
            img.alt = char.name;
            img.className = 'char-avatar char-avatar-img';
            img.onload = () => { placeholder.replaceWith(img); };
          }
        }
      }

      if (detailRes.ok) {
        const detail = await detailRes.json();
        const ilvl = detail.equipped_item_level || detail.average_item_level;
        if (ilvl) {
          const ilvlEl = document.getElementById(`main-ilvl-${char.realmSlug}-${char.name}`);
          if (ilvlEl) {
            ilvlEl.textContent = ilvl;
            ilvlEl.title = 'Item Level';
          }
        }
        // Spec + Short Class Combined
        const specName = detail.active_spec?.name;
        if (specName) {
          const badgeEl = document.getElementById(`main-badge-${char.realmSlug}-${char.name}`);
          if (badgeEl) badgeEl.textContent = `${getClassShort(char.class)} - ${specName}`;
        }
      }
    } catch (err) { /* keep placeholder */ }
  }
}

function getClassEmoji(className) {
  return "";
}

// ═══════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════
function updateStats() {
  statTotal.textContent = allCharacters.length;
  if (statMaxLevel) statMaxLevel.textContent =
    allCharacters.length > 0
      ? Math.max(...allCharacters.map((c) => c.level))
      : 0;
  statAlliance.textContent = allCharacters.filter(
    (c) => c.faction === "ALLIANCE",
  ).length;
  statHorde.textContent = allCharacters.filter(
    (c) => c.faction === "HORDE",
  ).length;
}


const MAX_ACHIEVEMENT_POINTS = 53610;

// ═══════════════════════════════════════════════════════════
// CHARACTER DETAIL MODAL
// ═══════════════════════════════════════════════════════════
async function openCharDetail(realmSlug, charName) {
  charModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Reset
  $('#modal-name').textContent = charName;
  $('#modal-avatar').src = '';
  $('#modal-avatar').style.display = 'none';
  $('#modal-portrait-placeholder').style.display = 'flex';
  $('#modal-level').textContent = 'Nivel —';
  $('#modal-ilvl-header').textContent = '—';
  $('#modal-faction').textContent = '—';
  $('#modal-faction').className = 'tag';
  $('#modal-race').textContent = '\u2014';
  $('#modal-class').textContent = '\u2014';
  $('#modal-spec').textContent = '\u2014';
  $('#modal-hero-talent').textContent = '\u2014';
  $('#modal-realm').textContent = '\u2014';
  $('#modal-achievements').textContent = '\u2014';
  $('#modal-achievements-pct').textContent = '0%';
  $('#modal-equipment').innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Cargando equipo...</p>';

  // Fetch character details
  try {
    const res = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const char = await res.json();

    $('#modal-name').textContent = char.active_title?.display_string?.replace('{name}', char.name) || char.name || charName;
    $('#modal-level').textContent = `Nivel ${char.level || '—'}`;

    if (char.equipped_item_level) {
      $('#modal-ilvl-header').textContent = char.equipped_item_level;
    } else if (char.average_item_level) {
      $('#modal-ilvl-header').textContent = char.average_item_level;
    }

    const classColor = CLASS_COLORS[char.character_class?.name] || '#d4a843';

    // Faction tag
    const factionType = char.faction?.type || '';
    const factionEl = $('#modal-faction');
    factionEl.textContent = char.faction?.name || '—';
    if (factionType === 'ALLIANCE') {
      factionEl.className = 'tag tag-alliance';
    } else if (factionType === 'HORDE') {
      factionEl.className = 'tag tag-horde';
    }

    // Apply class color to name
    $('#modal-name').style.color = classColor;

    $('#modal-race').textContent = char.race?.name || '\u2014';
    $('#modal-class').textContent = getClassShort(char.character_class?.name) || '\u2014';
    $('#modal-spec').textContent = char.active_spec?.name || '\u2014';
    $('#modal-realm').textContent = char.realm?.name || '\u2014';
    
    // Achievements
    const points = char.achievement_points || 0;
    $('#modal-achievements').textContent = points.toLocaleString('es-ES');
    const pct = ((points / MAX_ACHIEVEMENT_POINTS) * 100).toFixed(1);
    $('#modal-achievements-pct').textContent = `${pct}%`;

    // Load Class, Race, Spec Icons
    loadModalIcons(char);

    // Update Header BiS Link
    updateBiSLink(char.character_class?.name, char.active_spec?.name);

    // Fetch Stats
    fetchStats(realmSlug, charName);

    // Fetch Hero Talent (async, non-blocking)
    fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/talents`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(talentData => {
        if (!talentData) return;
        // Find the active loadout and its selected hero spec
        const activeSpec = talentData.specializations?.find(
          s => s.specialization?.id === talentData.active_specialization?.id
        );
        const activeLoadout = activeSpec?.loadouts?.find(l => l.is_active);
        const heroSpec = activeLoadout?.selected_hero_spec;
        if (heroSpec?.name) {
          $('#modal-hero-talent').textContent = heroSpec.name;
          // Load hero talent icon via Wowhead CDN (using spec icon as proxy)
          const heroWrap = $('#modal-hero-talent-icon-wrap');
          if (heroWrap && heroSpec.id) {
            const heroIconUrl = `https://wow.zamimg.com/images/wow/icons/large/ability_herospec_${heroSpec.name.toLowerCase().replace(/[^a-z]/g, '')}.jpg`;
            const img = document.createElement('img');
            img.alt = heroSpec.name;
            img.onerror = () => { heroWrap.innerHTML = ''; heroWrap.style.display = 'none'; };
            img.onload = () => { heroWrap.style.display = 'flex'; };
            img.src = heroIconUrl;
            heroWrap.innerHTML = '';
            heroWrap.appendChild(img);
          }
        }
      })
      .catch(() => {});


  } catch (err) {
    console.error('Error loading character details:', err);
    $('#modal-title').textContent = 'No se pudieron cargar los detalles';
  }

  // Fetch portrait (prefer main-render or inset for large display)
  try {
    const mediaRes = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/media`, { cache: "no-store" });
    if (mediaRes.ok) {
      const media = await mediaRes.json();
      const portraitAsset = media.assets?.find(a => a.key === 'main-raw') ||
                            media.assets?.find(a => a.key === 'inset') ||
                            media.assets?.find(a => a.key === 'avatar') ||
                            media.assets?.[0];
      if (portraitAsset?.value) {
        const img = $('#modal-avatar');
        img.src = portraitAsset.value;
        img.onload = () => {
          img.style.display = 'block';
          $('#modal-portrait-placeholder').style.display = 'none';
        };
      }
    }
  } catch (err) {
    console.error('Error loading portrait:', err);
  }

  // Fetch equipment
  try {
    const equipRes = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/equipment`, { cache: "no-store" });
    if (equipRes.ok) {
      const equipData = await equipRes.json();
      renderEquipment(equipData);
    } else {
      $('#modal-equipment').innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Equipo no disponible</p>';
    }
  } catch (err) {
    $('#modal-equipment').innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Error al cargar equipo</p>';
  }

  // Fetch PvE Progress (Raids & M+)
  loadPvEProgress(realmSlug, charName);

  // Friend button logic
  const friendBtn = $('#modal-btn-friend');
  const characterKey = `${realmSlug}|${charName.toLowerCase()}`;
  const isOwned = allCharacters.some(c => getCharKey(c).toLowerCase() === characterKey);
  
  if (isOwned) {
    friendBtn.classList.add('hidden');
  } else {
    friendBtn.classList.remove('hidden');
  }

  // Talents button logic
  const talentBtn = $('#modal-btn-talents');
  // Replace listener
  const newTalentBtn = talentBtn.cloneNode(true);
  talentBtn.parentNode.replaceChild(newTalentBtn, talentBtn);
  newTalentBtn.addEventListener('click', () => {
    openTalentModal(realmSlug, charName);
  });

  const isFriend = friendChars.some(f => f.realm === realmSlug && f.name.toLowerCase() === charName.toLowerCase());
  
  if (isFriend) {
    friendBtn.classList.add('active');
    friendBtn.querySelector('span').textContent = 'Siguiendo';
  } else {
    friendBtn.classList.remove('active');
    friendBtn.querySelector('span').textContent = 'Seguir';
  }

  // Remove old listeners to avoid multiple calls
  const newFriendBtn = friendBtn.cloneNode(true);
  friendBtn.parentNode.replaceChild(newFriendBtn, friendBtn);
  
  // Favorite button logic (only for owned characters)
  const favBtn = $('#modal-btn-favorite');
  if (isOwned) {
    favBtn.classList.remove('hidden');
    const isMain = mainCharIds.has(characterKey);
    favBtn.classList.toggle('active', isMain);
    favBtn.querySelector('span').textContent = isMain ? 'Principal' : 'Favorito';
    
    // Replace listener
    const newFavBtn = favBtn.cloneNode(true);
    favBtn.parentNode.replaceChild(newFavBtn, favBtn);
    newFavBtn.addEventListener('click', () => {
      toggleMain(realmSlug, charName.toLowerCase()); // toggleMain uses lowerCase key
      const active = newFavBtn.classList.toggle('active');
      newFavBtn.querySelector('span').textContent = active ? 'Principal' : 'Favorito';
    });
  } else {
    favBtn.classList.add('hidden');
  }

  newFriendBtn.addEventListener('click', () => {
    toggleFriend(realmSlug, charName);
    const active = newFriendBtn.classList.toggle('active');
    newFriendBtn.querySelector('span').textContent = active ? 'Siguiendo' : 'Seguir';
  });
}

async function loadModalIcons(char) {
  const raceWrap = $('#modal-race-icon-wrap');
  const classWrap = $('#modal-class-icon-wrap');
  const specWrap = $('#modal-spec-icon-wrap');

  // Reset
  raceWrap.innerHTML = '';
  classWrap.innerHTML = '';
  specWrap.innerHTML = '';

  const fetchIcon = async (type, id, container, fallbackUrl = '') => {
    if (!id && !fallbackUrl) return;
    try {
      if (id) {
        const res = await fetch(`/api/media/${type}/${id}`, { cache: "no-store" });
        if (res.ok) {
          const media = await res.json();
          const asset = media.assets?.find(a => a.key === 'icon' || a.key === 'portrait') || media.assets?.[0];
          if (asset?.value) {
            container.innerHTML = `<img src="${asset.value}" alt="${type}">`;
            container.style.display = 'flex';
            return;
          }
        }
      }
      
      // Use fallback if API fails or no ID provided
      if (fallbackUrl) {
        container.innerHTML = `<img src="${fallbackUrl}" alt="${type}">`;
        container.style.display = 'flex';
      }
    } catch (e) { 
      console.error(`Error loading ${type} icon:`, e);
      if (fallbackUrl) {
        container.innerHTML = `<img src="${fallbackUrl}" alt="${type}">`;
        container.style.display = 'flex';
      }
    }
  };

  // Race fallback mapping (Wowhead CDN pattern)
  const raceMap = {
    'Human': 'human', 'Orc': 'orc', 'Dwarf': 'dwarf', 'Night Elf': 'nightelf',
    'Undead': 'scourge', 'Tauren': 'tauren', 'Gnome': 'gnome', 'Troll': 'troll',
    'Goblin': 'goblin', 'Blood Elf': 'bloodelf', 'Draenei': 'draenei',
    'Worgen': 'worgen', 'Pandaren': 'pandaren', 'Nightborne': 'nightborne',
    'Highmountain Tauren': 'highmountain', 'Void Elf': 'voidelf',
    'Lightforged Draenei': 'lightforged', 'Zandalari Troll': 'zandalari',
    'Kul Tiran': 'kultiran', 'Dark Iron Dwarf': 'darkiron',
    'Mag\'har Orc': 'maghar', 'Mechagnome': 'mechagnome', 'Vulpera': 'vulpera',
    'Dracthyr': 'dracthyr', 'Earthen': 'earthen'
  };
  
  const raceName = char.race?.name;
  const gender = char.gender?.type?.toLowerCase() || 'male';
  let raceFallback = '';
  if (raceName && raceMap[raceName]) {
    raceFallback = `https://wow.zamimg.com/images/wow/icons/large/race_${raceMap[raceName]}_${gender}.jpg`;
  }

  // Parallel fetch
  await Promise.all([
    fetchIcon('playable-race', char.race?.id, raceWrap, raceFallback),
    char.character_class?.id ? fetchIcon('playable-class', char.character_class.id, classWrap) : Promise.resolve(),
    char.active_spec?.id ? fetchIcon('playable-specialization', char.active_spec.id, specWrap) : Promise.resolve()
  ]);
}

async function loadPvEProgress(realmSlug, charName) {
  const raidsContainer = $('#modal-raids-container');
  const mplusScore = $('#modal-mplus-score');
  
  // Reset PvE UI to loading state
  raidsContainer.innerHTML = '<p class="loading-text" style="color:var(--text-muted); font-size:0.8rem; text-align:center;">Analizando encuentros...</p>';
  mplusScore.classList.add('hidden');
  mplusScore.style.background = ''; // Reset background

  // Fetch M+ Rating
  try {
    const mplusRes = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/mythic-plus`, { cache: "no-store" });
    if (mplusRes.ok) {
      const data = await mplusRes.json();
      const rating = Math.round(data.current_mythic_rating?.rating || 0);
      if (rating > 0) {
        mplusScore.textContent = `Rating M+ ${rating}`;
        mplusScore.classList.remove('hidden');
        // Color coding for score
        if (rating >= 2500) mplusScore.style.background = 'linear-gradient(135deg, #ff8000, #d94000)';
        else if (rating >= 2000) mplusScore.style.background = 'linear-gradient(135deg, #a330c9, #7124a3)';
        else if (rating >= 1500) mplusScore.style.background = 'linear-gradient(135deg, #0070dd, #004a91)';
        else mplusScore.style.background = 'linear-gradient(135deg, #1eff00, #14a300)';
      }
    }
  } catch (err) { console.error('Error loading M+:', err); }

  // Fetch Raids
  try {
    const raidsRes = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/raids`, { cache: "no-store" });
    if (raidsRes.ok) {
      const data = await raidsRes.json();
      renderRaidProgress(data);
    } else {
      raidsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Sin datos de banda disponibles</p>';
    }
  } catch (err) { 
    console.error('Error loading raids:', err);
    raidsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Error al conectar con la base de datos de raids</p>';
  }
}

function renderRaidProgress(data) {
  const container = $('#modal-raids-container');
  
  // Filter for the most recent expansion (TWW) or just get the latest entries
  // The structure is expansions -> instances -> modes -> progress
  let allInstances = [];
  if (data.expansions) {
    data.expansions.forEach(exp => {
      exp.instances.forEach(inst => {
        allInstances.push(inst);
      });
    });
  }

  // We want the last 2 raids (most relevant)
  const recentRaids = allInstances.slice(-2).reverse();

  if (recentRaids.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Sin bandas registradas</p>';
    return;
  }

  container.innerHTML = '';
  recentRaids.forEach(raid => {
    const row = document.createElement('div');
    row.className = 'raid-row';
    
    // Sort modes by difficulty (Normal -> Heroic -> Mythic)
    // Sometimes modes is undefined or empty
    if (!raid.modes || raid.modes.length === 0) return;

    const sortedModes = raid.modes.sort((a, b) => {
      const order = { 'NORMAL': 1, 'HEROIC': 2, 'MYTHIC': 3 };
      return (order[a.difficulty.type] || 0) - (order[b.difficulty.type] || 0);
    });

    const difficultiesMap = sortedModes.map(mode => {
      const type = mode.difficulty.type;
      const label = type.substring(0, 1);
      
      // Safety check for progress
      const current = mode.progress?.completed_count ?? 0;
      const total = mode.progress?.total_count ?? 0;
      
      return `
        <span class="diff-badge diff-${type.toLowerCase()}" title="${mode.difficulty.name}">
          ${label} ${current}/${total}
        </span>
      `;
    }).join('');

    // Progress bar based on highest completion percentage among difficulties
    const pcts = raid.modes.map(m => {
      if (!m.progress || !m.progress.total_count) return 0;
      return (m.progress.completed_count / m.progress.total_count) * 100;
    });
    const maxPct = pcts.length > 0 ? Math.max(...pcts) : 0;

    row.innerHTML = `
      <div class="raid-info">
        <span class="raid-name">${raid.instance.name}</span>
        <div class="raid-difficulties">
          ${difficultiesMap}
        </div>
      </div>
      <div class="raid-progress-bar">
        <div class="raid-progress-fill" style="width: ${maxPct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}


function renderEquipment(data) {
  const equipGrid = $('#modal-equipment');

  if (!data.equipped_items || data.equipped_items.length === 0) {
    equipGrid.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Sin equipo</p>';
    return;
  }

  equipGrid.innerHTML = data.equipped_items.map(item => {
    const qualityClass = QUALITY_CLASSES[item.quality?.type] || 'quality-common';
    const itemName = item.name || '—';
    const ilvl = item.level?.value || '';
    const itemMediaId = item.media?.id || '';

    // Enchantments — show only name + tier
    const enchants = [];
    if (item.enchantments) {
      item.enchantments.forEach(e => {
        // Only player-applied enchants
        if (e.enchantment_slot?.type && !['PERMANENT','BONUS_SOCKETS'].includes(e.enchantment_slot.type)) return;

        let label = '';
        // Prefer source item name (clean name)
        if (e.source_item?.name) {
          label = e.source_item.name;
        } else if (e.display_string) {
          // Fallback: extract just the effect name
          label = e.display_string
            .replace(/^.*?:\s*/, '')  // remove prefix like "A: "
            .replace(/\|.*$/, '')     // remove anything after |
            .trim();
        }
        if (!label) return;

        enchants.push(label);
      });
    }

    // Sockets / Gems
    const gems = [];
    if (item.sockets) {
      item.sockets.forEach(s => {
        if (s.item?.name) gems.push(s.item.name);
        else if (s.socket_type?.name) gems.push(`${s.socket_type.name} vacío`);
      });
    }

    const enchantHtml = enchants.map(e => `<span class="equip-enchant">${e}</span>`).join('');
    const gemHtml = gems.map(g => `<span class="equip-gem">${g}</span>`).join('');
    const extrasHtml = (enchantHtml || gemHtml) ? `<div class="equip-extras">${enchantHtml}${gemHtml}</div>` : '';

    return `
      <div class="equip-item">
        <div class="equip-icon-wrap" ${itemMediaId ? `data-item-id="${itemMediaId}"` : ''}>
          <div class="equip-icon-placeholder"></div>
        </div>
        <div class="equip-details">
          <span class="equip-name ${qualityClass}">${itemName}</span>
          ${extrasHtml}
        </div>
        ${ilvl ? `<div class="equip-ilvl-container">
          <span class="equip-ilvl-label">LVL</span>
          <span class="equip-ilvl-val">${ilvl}</span>
        </div>` : ''}
      </div>`;
  }).join('');

  // Lazy-load item icons
  loadItemIcons();
}

async function updateBiSLink(className, specName) {
  const bisLink = $('#modal-bis-link');
  if (className && specName) {
    const classSlug = className.toLowerCase().replace(/\s+/g, '-');
    const specSlug = specName.toLowerCase().replace(/\s+/g, '-');
    bisLink.href = `https://www.wowhead.com/guide/classes/${classSlug}/${specSlug}/bis-gear`;
    bisLink.classList.remove('hidden');
  } else {
    bisLink.classList.add('hidden');
  }
}

async function fetchStats(realmSlug, charName) {
  const statsContainer = $('#modal-attributes-section');
  if (!statsContainer) return;

  try {
    const res = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/stats`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      renderStats(data);
    } else {
      statsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Estadísticas no disponibles</p>';
    }
  } catch (err) {
    console.error('Error loading stats:', err);
    statsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Error al cargar estadísticas</p>';
  }
}

function renderStats(data) {
  const container = $('#modal-attributes-section');
  if (!container) return;
  container.innerHTML = '';

  const statGroups = [
    { label: 'Fuerza', value: data.strength?.effective, type: 'primary' },
    { label: 'Agilidad', value: data.agility?.effective, type: 'primary' },
    { label: 'Intelecto', value: data.intellect?.effective, type: 'primary' },
    { label: 'Aguante', value: data.stamina?.effective, type: 'primary' },
    { label: 'Crítico', value: `${data.melee_crit?.value?.toFixed(1)}%`, type: 'secondary' },
    { label: 'Celeridad', value: `${data.melee_haste?.value?.toFixed(1)}%`, type: 'secondary' },
    { label: 'Maestría', value: `${data.mastery?.value?.toFixed(1)}%`, type: 'secondary' },
    { label: 'Versatilidad', value: `${data.versatility_value?.toFixed(1)}%`, type: 'secondary' }
  ];

  statGroups.forEach(stat => {
    // Show stats if they have a non-zero value
    if (!stat.value || stat.value === '0.0%' || stat.value === 0) return;

    const box = document.createElement('div');
    box.className = `attr-box ${stat.type}`;
    box.innerHTML = `
      <span class="attr-box-label">${stat.label}</span>
      <span class="attr-box-value">${stat.value}</span>
    `;
    container.appendChild(box);
  });

  if (container.innerHTML === '') {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Sin datos de estadísticas relevantes</p>';
  }
}

async function loadItemIcons() {
  const iconWraps = document.querySelectorAll('.equip-icon-wrap[data-item-id]');
  for (const wrap of iconWraps) {
    const itemId = wrap.dataset.itemId;
    if (!itemId) continue;
    try {
      const res = await fetch(`/api/item/${itemId}/media`, { cache: "no-store" });
      if (!res.ok) continue;
      const media = await res.json();
      const iconAsset = media.assets?.find(a => a.key === 'icon') || media.assets?.[0];
      if (iconAsset?.value) {
        const img = document.createElement('img');
        img.src = iconAsset.value;
        img.alt = '';
        img.className = 'equip-icon-img';
        img.onload = () => {
          const placeholder = wrap.querySelector('.equip-icon-placeholder');
          if (placeholder) placeholder.replaceWith(img);
        };
      }
    } catch (err) { /* keep placeholder */ }
  }
}

function closeModal() {
  charModal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ─── Faction Modal ───────────────────────────────────────
function openFactionModal(faction) {
  const factionChars = allCharacters.filter(c => c.faction === faction);
  const total = factionChars.length;
  
  if (total === 0) return;

  const factionName = faction === "ALLIANCE" ? "Alianza" : "Horda";
  const factionColor = faction === "ALLIANCE" ? "var(--alliance-blue)" : "var(--horde-red)";
  
  factionModalTitle.textContent = `Reparto de Razas: ${factionName}`;
  factionModal.style.setProperty('--faction-color', factionColor);
  
  // Count races
  const counts = {};
  factionChars.forEach(c => {
    counts[c.race] = (counts[c.race] || 0) + 1;
  });

  // Sort by count desc
  const sortedRaces = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // Render
  factionStatsList.innerHTML = sortedRaces.map(([race, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    return `
      <div class="race-stat-item">
        <div class="race-stat-info">
          <span class="race-name">${race}</span>
          <span class="race-percentage">${count} | ${pct}%</span>
        </div>
        <div class="race-bar-bg">
          <div class="race-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  factionModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeFactionModal() {
  factionModal.classList.add("hidden");
  if (charModal.classList.contains('hidden')) {
    document.body.style.overflow = "";
  }
}

// ─── Talent Modal ────────────────────────────────────────
async function openTalentModal(realmSlug, charName) {
  talentModal.classList.remove('hidden');
  document.body.style.overflow = "hidden";
  $("#talent-modal-char-name").textContent = `Talentos: ${charName}`;
  talentTreeContainer.innerHTML = `
    <div class="talent-loading">
      <div class="spinner"></div>
      <p>Consultando el Códice de Talentos...</p>
    </div>
  `;

  // Helper to handle non-json errors
  const checkResponse = async (res) => {
    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text);
        if (json.error) errorMsg = json.error;
      } catch(e) {
        // Not JSON, probably HTML 404
        if (text.includes('<!DOCTYPE') || text.includes('Cannot GET')) {
          errorMsg = `Ruta no encontrada (404). ¿Has reiniciado el servidor?`;
        } else {
          errorMsg = text.substring(0, 100);
        }
      }
      throw new Error(errorMsg);
    }
    return res.json();
  };

  try {
    const data = await fetch(`/api/character/${realmSlug}/${charName.toLowerCase()}/talents`).then(checkResponse);
    
    if (!data.specializations) throw new Error("Datos de especialización no encontrados");
    
    const activeSpec = data.specializations.find(s => s.specialization.id === data.active_specialization?.id) || data.specializations[0];
    if (!activeSpec) throw new Error("No se encontró información de la especialización");
    
    const activeLoadout = activeSpec.loadouts?.find(l => l.is_active) || activeSpec.loadouts?.[0];
    if (!activeLoadout) throw new Error("El personaje no tiene una configuración de talentos (loadout) guardada");

    const specId = activeSpec.specialization.id;
    const specName = activeSpec.specialization.name;
    
    // Check treeId in various locations
    let treeId = activeSpec.talent_tree_summary?.id || activeLoadout?.talent_tree_summary?.id;

    // FALLBACK: If treeId is still missing, try to fetch it from Specialization static data
    if (!treeId && specId) {
      console.log(`[Talents] TreeID missing in profile, attempting specialization fallback for SpecID: ${specId}`);
      try {
        const specMeta = await fetch(`/api/specialization/${specId}`).then(checkResponse);
        treeId = specMeta.talent_tree_summary?.id;
      } catch (e) {
        console.warn("Fallback specialization fetch failed:", e);
      }
    }

    $("#talent-modal-spec-info").textContent = `${specName} — ${activeLoadout?.talent_loadout_selection_display_string || 'Configuración Activa'}`;

    if (!treeId) {
      console.warn("Talent Tree ID not found after fallbacks:", activeSpec);
      talentTreeContainer.innerHTML = `
        <div class="talent-loading">
          <p>Este personaje no posee un árbol de talentos compatible o la API de Blizzard no está proporcionando los datos necesarios.</p>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">Especialización detectada: ${specName} (ID: ${specId})</p>
        </div>
      `;
      return;
    }

    // Check if we have selected talents
    const hasTalentData = activeLoadout && activeLoadout.selected_talents && activeLoadout.selected_talents.length > 0;
    if (!hasTalentData) {
      console.warn("No selected_talents found in activeLoadout. API might be missing data.");
      // We still proceed to render the tree, but it will be "empty" (no active nodes)
    }

    const treeData = await fetch(`/api/talent-tree/${treeId}/${specId}`).then(checkResponse);
    renderTalentTree(treeData, activeLoadout || {});

    // If talent data was missing, show a warning badge
    if (!hasTalentData) {
      const warning = document.createElement('div');
      warning.style = 'position:absolute; top:1rem; right:1rem; background:rgba(217, 83, 79, 0.2); border:1px solid #d9534f; color:#ffbaba; padding:0.5rem 1rem; border-radius:8px; font-size:0.8rem; z-index:100; max-width:250px;';
      warning.innerHTML = '<strong>Nota:</strong> Los talentos seleccionados no están disponibles en la API de Blizzard en este momento (Parche 11.x). Mostrando árbol base.';
      talentTreeContainer.appendChild(warning);
    }

  } catch (err) {
    console.error("Talent modal error:", err);
    talentTreeContainer.innerHTML = `
      <div class="talent-loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" style="margin-bottom:1rem; opacity:0.5; color:#ff4444;">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="color:#ffbaba; font-weight:600;">Ocurrió un error al invocar los talentos</p>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">${err.message}</p>
        <button class="btn-toggle-filters active" style="margin-top:1.5rem; background:rgba(255,255,255,0.1);" onclick="closeTalentModal()">Cerrar</button>
      </div>`;
  }
}

function closeTalentModal() {
  talentModal.classList.add('hidden');
  // Only restore scroll if main modal is also closed
  if (charModal.classList.contains('hidden')) {
    document.body.style.overflow = "";
  }
}

async function renderTalentTree(treeData, activeLoadout) {
  talentTreeContainer.innerHTML = '';
  
  // Create a map of active talent IDs and ranks
  const activeTalentIds = new Set();
  const talentRanks = {};

  if (activeLoadout.selected_talents) {
    activeLoadout.selected_talents.forEach(t => {
      const id = t.tooltip.talent.id;
      activeTalentIds.add(id);
      talentRanks[id] = t.rank;
    });
  }

  // Combine class and spec nodes
  const nodes = (treeData.class_talent_nodes || []).concat(treeData.spec_talent_nodes || []);
  
  // Find bounds to shift coordinates if needed (Blizzard coords start around 100/100)
  const minRow = Math.min(...nodes.map(n => n.display_row));
  const minCol = Math.min(...nodes.map(n => n.display_col));

  nodes.forEach(node => {
    if (typeof node.display_row !== 'number' || typeof node.display_col !== 'number') return;

    const el = document.createElement('div');
    el.className = 'talent-node';
    
    // Map coords: 100 approx units per row/col
    // We adjust to be 1-indexed for CSS Grid
    const row = Math.floor((node.display_row - minRow) / 60) + 1;
    const col = Math.floor((node.display_col - minCol) / 60) + 1;
    
    el.style.gridRow = row;
    el.style.gridColumn = col;

    // Check talent entries
    const talentEntry = node.talents?.[0];
    if (talentEntry) {
      const talentId = talentEntry.talent.id;
      const isActive = activeTalentIds.has(talentId);
      if (isActive) el.classList.add('active');
      
      el.setAttribute('data-name', talentEntry.talent.name);
      
      // Rank indicator
      if (isActive && talentRanks[talentId] > 0) {
        const rankSpan = document.createElement('span');
        rankSpan.className = 'talent-rank';
        rankSpan.textContent = talentRanks[talentId];
        el.appendChild(rankSpan);
      }

      // Symbol
      if (node.node_type?.type === 'CHOICE') el.classList.add('choice');

      // Fetch Icon via proxy
      fetch(`/api/media/talent/${talentId}`)
        .then(res => res.json())
        .then(media => {
          const asset = media.assets?.find(a => a.key === 'icon') || media.assets?.[0];
          if (asset?.value) {
            const img = document.createElement('img');
            img.src = asset.value;
            img.alt = talentEntry.talent.name;
            el.appendChild(img);
          }
        }).catch(() => {});
    }

    talentTreeContainer.appendChild(el);
  });
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function showLoading(show) {
  loadingSpinner.classList.toggle("hidden", !show);
  if (show) {
    charsGrid.innerHTML = "";
    noResults.classList.add("hidden");
  }
}
