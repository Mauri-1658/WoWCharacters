require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const REGION = process.env.REGION || "eu";

// ─── Region URLs ───────────────────────────────────────────────
const OAUTH_BASE = `https://oauth.battle.net`;
const API_BASE = `https://${REGION}.api.blizzard.com`;

// ─── Session ───────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24h
  }),
);

// ─── Serve Static Files ────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ─── Auth: Login ────────────────────────────────────────────────
app.get("/auth/login", (req, res) => {
  const redirectUri = `http://localhost:${PORT}/auth/callback`;
  const authUrl =
    `${OAUTH_BASE}/authorize?` +
    `client_id=${process.env.BLIZZARD_CLIENT_ID}` +
    `&scope=wow.profile` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&state=battlenet_auth`;

  res.redirect(authUrl);
});

// ─── Auth: Callback ─────────────────────────────────────────────
app.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect("/?error=auth_denied");
  }

  if (!code) {
    return res.redirect("/?error=no_code");
  }

  try {
    const redirectUri = `http://localhost:${PORT}/auth/callback`;

    // Exchange code for token
    const tokenResponse = await axios.post(
      `${OAUTH_BASE}/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: process.env.BLIZZARD_CLIENT_ID,
        client_secret: process.env.BLIZZARD_CLIENT_SECRET,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    req.session.accessToken = tokenResponse.data.access_token;
    req.session.tokenExpiry = Date.now() + tokenResponse.data.expires_in * 1000;

    // Get user info
    try {
      const userInfo = await axios.get(`${OAUTH_BASE}/userinfo`, {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      });
      req.session.user = {
        id: userInfo.data.id,
        battletag: userInfo.data.battletag,
      };
    } catch (e) {
      req.session.user = { id: "unknown", battletag: "Usuario" };
    }

    res.redirect("/?login=success");
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
    res.redirect("/?error=token_failed");
  }
});

// ─── Auth: Status ──────────────────────────────────────────────
app.get("/auth/status", (req, res) => {
  if (req.session.accessToken && req.session.tokenExpiry > Date.now()) {
    res.json({
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ─── Auth: Logout ──────────────────────────────────────────────
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ─── Middleware: Require Auth ───────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.accessToken || req.session.tokenExpiry < Date.now()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// ─── API: Get All Characters ────────────────────────────────────
app.get("/api/user/characters", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE}/profile/user/wow`, {
      headers: {
        Authorization: `Bearer ${req.session.accessToken}`,
        "Cache-Control": "no-cache",
      },
      params: {
        namespace: `profile-${REGION}`,
        locale: "en_US",
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error("Characters fetch error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch characters",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Character Details ─────────────────────────────────
app.get("/api/character/:realm/:name", requireAuth, async (req, res) => {
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    console.error("Character detail error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch character details",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Character Statistics ──────────────────────────────
app.get("/api/character/:realm/:name/stats", requireAuth, async (req, res) => {
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    console.log(`[*] Fetching stats for ${charName} on ${realmSlug}...`);
    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/statistics`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "en_US",
        },
      },
    );
    console.log(`[OK] Stats received for ${charName}`);
    res.json(response.data);
  } catch (err) {
    console.error("Stats fetch error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch character statistics",
    });
  }
});

// ─── API: Get Character Media (Avatar) ──────────────────────────
app.get("/api/character/:realm/:name/media", requireAuth, async (req, res) => {
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/character-media`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    console.error("Character media error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch character media",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Character Equipment ───────────────────────────────
app.get(
  "/api/character/:realm/:name/equipment",
  requireAuth,
  async (req, res) => {
    try {
      const { realm, name } = req.params;
      const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
      const charName = name.toLowerCase();

      const response = await axios.get(
        `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/equipment`,
        {
          headers: {
            Authorization: `Bearer ${req.session.accessToken}`,
            "Cache-Control": "no-cache",
          },
          params: {
            namespace: `profile-${REGION}`,
            locale: "en_US",
          },
        },
      );
      res.json(response.data);
    } catch (err) {
      console.error("Equipment error:", err.response?.data || err.message);
      res.status(err.response?.status || 500).json({
        error: "Failed to fetch equipment",
        details: err.response?.data || err.message,
      });
    }
  },
);

// ─── API: Search Character by Name (Global) ─────────────────────
app.get("/api/character/search/:name", requireAuth, async (req, res) => {
  try {
    const { name } = req.params;
    
    // Blizzard Search API: /data/wow/search/character
    // We search by name. The namespace for search is dynamic.
    const response = await axios.get(
      `${API_BASE}/data/wow/search/character`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `dynamic-${REGION}`,
          locale: "en_US",
          "name.en_US": name, // Specific name search
          _orderby: "level:desc", // Show highest levels first
          _page: 1
        },
      }
    );

    // Simplify the search results for the frontend
    const results = response.data.results.map(r => ({
      name: r.data.name.en_US || r.data.name.es_ES || Object.values(r.data.name)[0],
      realm: r.data.realm.name.en_US || r.data.realm.name.es_ES || Object.values(r.data.realm.name)[0],
      realmSlug: r.data.realm.slug,
      level: r.data.level,
      classId: r.data.character_class.id,
      className: r.data.character_class.name.en_US || r.data.character_class.name.es_ES,
      raceName: r.data.race.name.en_US || r.data.race.name.es_ES,
      faction: r.data.faction.type
    }));

    res.json({ results });
  } catch (err) {
    console.error("Search error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Search failed",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Character Raid Encounters ────────────────────────
app.get("/api/character/:realm/:name/raids", requireAuth, async (req, res) => {
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/encounters/raids`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.json({ expansions: [] });
    }
    console.error("Raids fetch error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch raids",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Character Mythic Plus Summary ─────────────────────
app.get("/api/character/:realm/:name/mythic-plus", requireAuth, async (req, res) => {
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/mythic-keystone-profile`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    // It's common for characters not to have M+ data, so we return a 404 or empty info gracefully
    if (err.response?.status === 404) {
      return res.json({ current_mythic_rating: { rating: 0 } });
    }
    console.error("M+ fetch error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch M+ data",
    });
  }
});

// ─── API: Get Character Talents/Specializations ─────────────────
app.get("/api/character/:realm/:name/talents", requireAuth, async (req, res) => {
  console.log(`[Talents] Request for ${req.params.realm}/${req.params.name}`);
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/specializations`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "en_US",
        },
      },
    );

    // DEBUG: Log the structure
    console.log(`[Talents DEBUG] Status: ${response.status} for ${charName}`);
    const data = response.data;
    if (data.specializations) {
      data.specializations.forEach((s, idx) => {
        const isCurrent = s.specialization?.id === data.active_specialization?.id;
        console.log(`  Spec[${idx}]: ${s.specialization?.name} ${isCurrent ? '[ACTIVE]' : ''}`);
        console.log(`    Keys: ${Object.keys(s).join(', ')}`);
        if (s.talent_tree_summary) console.log(`    TreeID (Root): ${s.talent_tree_summary.id}`);
        
        if (s.loadouts) {
          s.loadouts.forEach((l, lIdx) => {
            console.log(`    Loadout[${lIdx}]: Active=${l.is_active} Keys=${Object.keys(l).join(', ')}`);
            if (l.talent_tree_summary) console.log(`      TreeID: ${l.talent_tree_summary.id}`);
            if (l.hero_talent_tree)   console.log(`      hero_talent_tree: ${JSON.stringify(l.hero_talent_tree)}`);
            if (l.selected_hero_spec) console.log(`      selected_hero_spec: ${JSON.stringify(l.selected_hero_spec)}`);
          });
        }
      });
    }

    res.json(response.data);
  } catch (err) {
    console.error("Talents fetch error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch talents",
    });
  }
});

// ─── API: Get Static Talent Tree Layout ────────────────────────
app.get("/api/talent-tree/:treeId/:specId", requireAuth, async (req, res) => {
  console.log(`[TalentTree] Tree:${req.params.treeId} Spec:${req.params.specId}`);
  try {
    const { treeId, specId } = req.params;
    const response = await axios.get(
      `${API_BASE}/data/wow/talent-tree/${treeId}/playable-specialization/${specId}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `static-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    console.error("Talent tree fetch error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch talent tree structure",
    });
  }
});

// ─── API: Get Item Media (Icon) ─────────────────────────────────
app.get("/api/item/:itemId/media", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const response = await axios.get(
      `${API_BASE}/data/wow/media/item/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `static-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch item media",
    });
  }
});

// ─── API: Get Game Data Media (Class, Spec, Race Icons) ───────────
app.get("/api/media/:type/:id", requireAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const response = await axios.get(
      `${API_BASE}/data/wow/media/${type}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `static-${REGION}`,
          locale: "en_US",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch media",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Playable Specialization Data (Fallback for TreeID) ──
app.get("/api/specialization/:specId", requireAuth, async (req, res) => {
  try {
    const { specId } = req.params;
    const response = await axios.get(
      `${API_BASE}/data/wow/playable-specialization/${specId}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `static-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch specialization data",
    });
  }
});

// ─── API: Search Global Characters ──────────────────────────────
app.get("/api/character/search/:name", requireAuth, async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`[*] Searching for character "${name}" in all realms...`);

    const response = await axios.get(`${API_BASE}/data/wow/search/character`, {
      headers: {
        Authorization: `Bearer ${req.session.accessToken}`,
        "Cache-Control": "no-cache",
      },
      params: {
        namespace: `profile-${REGION}`,
        locale: "en_US",
        "name.en_US": name,
        _page: 1,
        _pageSize: 20,
        "orderby": "level:desc"
      },
    });

    // Map Blizzard search results to a simpler format
    const results = response.data.results.map((r) => {
      const data = r.data;
      return {
        name: data.name.en_US,
        realm: data.realm.name.en_US,
        realmSlug: data.realm.slug,
        level: data.level,
        raceName: data.playable_race.name.en_US,
        className: data.playable_class.name.en_US,
        faction: data.faction.type,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error("Global search error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to perform global search",
      details: err.response?.data || err.message,
    });
  }
});

// ─── API: Get Character Mounts Collection ────────────────────────
app.get("/api/character/:realm/:name/mounts", requireAuth, async (req, res) => {
  try {
    const { realm, name } = req.params;
    const realmSlug = realm.toLowerCase().replace(/\s+/g, "-");
    const charName = name.toLowerCase();

    console.log(`[Backend] Fetching mounts for ${charName}-${realmSlug} in ${REGION}...`);

    const response = await axios.get(
      `${API_BASE}/profile/wow/character/${realmSlug}/${charName}/collections/mounts`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `profile-${REGION}`,
          locale: "es_ES",
        },
      },
    );
    console.log(`[Backend] Successfully fetched ${response.data.mounts?.length} mounts for ${charName}`);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data;
    console.error(`[Backend] Mounts fetch error (${status}):`, JSON.stringify(errorData) || err.message);
    
    // Check if it's a 404 - might mean character not found or no mounts collection
    if (status === 404) {
      return res.status(404).json({ error: "No mounts collection found for this character", mounts: [] });
    }
    
    res.status(status).json({
      error: "Failed to fetch mounts collection",
      details: errorData
    });
  }
});

// ─── API: Get Mount Media (Icon) ──────────────────────────────────
app.get("/api/mount/:mountId/media", requireAuth, async (req, res) => {
  try {
    const { mountId } = req.params;
    const response = await axios.get(
      `${API_BASE}/data/wow/media/mount/${mountId}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.accessToken}`,
          "Cache-Control": "no-cache",
        },
        params: {
          namespace: `static-${REGION}`,
          locale: "en_US",
        },
      },
    );
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch mount media",
    });
  }
});

// ─── Wowhead Fallback: Item Icon ────────────────────────────────
app.get("/api/wowhead/item/:itemId/icon", async (req, res) => {
  try {
    const { itemId } = req.params;
    const response = await axios.get(
      `https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=1&locale=0`,
      { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const iconName = response.data?.icon;
    if (iconName) {
      return res.json({ icon: `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg` });
    }
    res.status(404).json({ error: "Icon not found" });
  } catch (err) {
    res.status(500).json({ error: "Wowhead fallback failed" });
  }
});

// ─── Wowhead Fallback: Mount Icon ───────────────────────────────
app.get("/api/wowhead/mount/:mountId/icon", async (req, res) => {
  try {
    const { mountId } = req.params;
    // Try Wowhead mount tooltip
    const response = await axios.get(
      `https://nether.wowhead.com/tooltip/spell/${mountId}?dataEnv=1&locale=0`,
      { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const iconName = response.data?.icon;
    if (iconName) {
      return res.json({ icon: `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg` });
    }
    // Fallback: try the mount page itself
    const mountRes = await axios.get(
      `https://nether.wowhead.com/tooltip/mount/${mountId}?dataEnv=1&locale=0`,
      { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const mountIcon = mountRes.data?.icon;
    if (mountIcon) {
      return res.json({ icon: `https://wow.zamimg.com/images/wow/icons/large/${mountIcon}.jpg` });
    }
    res.status(404).json({ error: "Mount icon not found" });
  } catch (err) {
    res.status(500).json({ error: "Wowhead mount fallback failed" });
  }
});

// ─── Wowhead Fallback: Spell/Talent Icon ────────────────────────
app.get("/api/wowhead/spell/:spellId/icon", async (req, res) => {
  try {
    const { spellId } = req.params;
    const response = await axios.get(
      `https://nether.wowhead.com/tooltip/spell/${spellId}?dataEnv=1&locale=0`,
      { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const iconName = response.data?.icon;
    if (iconName) {
      return res.json({ icon: `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg` });
    }
    res.status(404).json({ error: "Spell icon not found" });
  } catch (err) {
    res.status(500).json({ error: "Wowhead spell fallback failed" });
  }
});

// ─── Wowhead Fallback: Class Icon Map (static, no API call) ─────
const CLASS_ICON_MAP = {
  1: 'classicon_warrior',
  2: 'classicon_paladin',
  3: 'classicon_hunter',
  4: 'classicon_rogue',
  5: 'classicon_priest',
  6: 'classicon_deathknight',
  7: 'classicon_shaman',
  8: 'classicon_mage',
  9: 'classicon_warlock',
  10: 'classicon_monk',
  11: 'classicon_druid',
  12: 'classicon_demonhunter',
  13: 'classicon_evoker',
};

app.get("/api/wowhead/class/:classId/icon", (req, res) => {
  const classId = parseInt(req.params.classId);
  const iconName = CLASS_ICON_MAP[classId];
  if (iconName) {
    return res.json({ icon: `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg` });
  }
  res.status(404).json({ error: "Class icon not found" });
});

// ─── Wowhead Fallback: Spec Icon Map (static) ──────────────────
const SPEC_ICON_MAP = {
  // Warrior
  71: 'ability_warrior_savageblow', 72: 'ability_warrior_innerrage', 73: 'ability_warrior_defensivestance',
  // Paladin
  65: 'spell_holy_holybolt', 66: 'ability_paladin_shieldofthetemplar', 70: 'spell_holy_auraoflight',
  // Hunter
  253: 'ability_hunter_bestialdiscipline', 254: 'ability_hunter_focusedaim', 255: 'ability_hunter_camouflage',
  // Rogue
  259: 'ability_rogue_deadlybrew', 260: 'ability_backstab', 261: 'inv_sword_30',
  // Priest
  256: 'spell_holy_powerwordshield', 257: 'spell_holy_guardianspirit', 258: 'spell_shadow_shadowwordpain',
  // Death Knight
  250: 'spell_deathknight_bloodpresence', 251: 'spell_deathknight_frostpresence', 252: 'spell_deathknight_unholypresence',
  // Shaman
  262: 'spell_nature_lightning', 263: 'spell_shaman_improvedstormstrike', 264: 'spell_nature_magicimmunity',
  // Mage
  62: 'spell_holy_magicalsentry', 63: 'spell_fire_firebolt02', 64: 'spell_frost_frostbolt02',
  // Warlock
  265: 'spell_shadow_deathcoil', 266: 'spell_shadow_metamorphosis', 267: 'spell_shadow_rainoffire',
  // Monk
  268: 'spell_monk_brewmaster_spec', 270: 'spell_monk_mistweaver_spec', 269: 'spell_monk_windwalker_spec',
  // Druid
  102: 'spell_nature_starfall', 103: 'ability_druid_catform', 104: 'ability_racial_bearform', 105: 'spell_nature_healingtouch',
  // Demon Hunter
  577: 'ability_demonhunter_specdps', 581: 'ability_demonhunter_spectank',
  // Evoker
  1467: 'classicon_evoker', 1468: 'classicon_evoker', 1473: 'classicon_evoker',
};

app.get("/api/wowhead/spec/:specId/icon", (req, res) => {
  const specId = parseInt(req.params.specId);
  const iconName = SPEC_ICON_MAP[specId];
  if (iconName) {
    return res.json({ icon: `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg` });
  }
  res.status(404).json({ error: "Spec icon not found" });
});

// ─── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nNexus — Battle.net Character Manager`);
  console.log(`   Server running at http://localhost:${PORT}`);
  console.log(`   Region: ${REGION.toUpperCase()}`);
  console.log(
    `   Client ID: ${process.env.BLIZZARD_CLIENT_ID ? "✅ configured" : "❌ missing"}`,
  );
  console.log(
    `   Client Secret: ${process.env.BLIZZARD_CLIENT_SECRET ? "✅ configured" : "❌ missing"}\n`,
  );
});
