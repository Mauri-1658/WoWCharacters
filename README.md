# <img src="https://render.worldofwarcraft.com/us/icons/56/wow_token01.jpg" width="32" height="32" style="vertical-align:middle; border-radius:6px;"> WoWCharacters — Battle.net Manager

> Gestiona todos tus personajes de **World of Warcraft** desde un único panel, conectado directamente a tu cuenta de **Battle.net**.

---

## ![](https://wow.zamimg.com/images/wow/icons/tiny/inv_misc_questionmark.gif) ¿Qué es esto?

**WoWCharacters** es una aplicación web local que se autentica con tu cuenta de Battle.net mediante OAuth2 y te muestra todos tus personajes de WoW con información detallada:

- Clase, especialización y nivel
- Facción (![Alianza](https://wow.zamimg.com/images/wow/icons/tiny/achievement_pvp_a_16.gif) Alianza / ![Horda](https://wow.zamimg.com/images/wow/icons/tiny/achievement_pvp_h_16.gif) Horda)
- Equipamiento y rango de ítem
- Árbol de talentos activo
- Imagen de retrato del personaje

---

## 🛠️ Tecnologías

| Stack         | Herramienta                       |
| ------------- | --------------------------------- |
| Backend       | Node.js + Express                 |
| Autenticación | OAuth2 — Battle.net API           |
| HTTP Client   | Axios                             |
| Sesiones      | express-session                   |
| Frontend      | HTML5 + CSS3 + JavaScript vanilla |
| Entorno       | XAMPP (Windows)                   |

---

## 📋 Requisitos previos

1. **Node.js** ≥ 18 instalado → [nodejs.org](https://nodejs.org)
2. **XAMPP** con Apache en marcha (solo si usas el directorio `htdocs`)
3. Una **cuenta de Battle.net** con acceso a WoW
4. Credenciales de la **API de Blizzard** (Client ID + Client Secret)

---

## 🔑 Obtener credenciales de la API de Blizzard

1. Ve a [develop.battle.net](https://develop.battle.net/access/)
2. Inicia sesión con tu cuenta de Battle.net
3. Crea una nueva aplicación:
   - **Redirect URI:** `http://localhost:3000/auth/callback`
   - **Service URL:** `http://localhost:3000`
4. Copia el **Client ID** y el **Client Secret**

---

## ⚙️ Configuración

### 1. Clona o descarga el proyecto

```bash
# Si tienes git:
git clone <url-del-repo> BattleNetManager

# O descarga el ZIP y extrae en:
C:\xampp\htdocs\BattleNetManager\
```

### 2. Configura el archivo `.env`

Crea o edita `.env` en la raíz del proyecto:

```env
# Credenciales de la API de Blizzard
BLIZZARD_CLIENT_ID=tu_client_id_aqui
BLIZZARD_CLIENT_SECRET=tu_client_secret_aqui

# Clave secreta para las sesiones (cámbiala por cualquier texto)
SESSION_SECRET=mi_clave_secreta_segura

# Región: eu | us | kr | tw
REGION=eu

# Puerto del servidor local
PORT=3000
```

> ⚠️ **Nunca compartas ni subas tu `.env` a un repositorio público.**

### 3. Instala las dependencias

```bash
npm install
```

---

## 🚀 Ejecutar la aplicación

### Opción A — Lanzador automático (recomendado, Windows)

Haz doble clic en **`launch.bat`**. Este script:

- Comprueba e instala dependencias si faltan
- Arranca el servidor en background
- Abre el navegador automáticamente en `http://localhost:3000`

### Opción B — Terminal

```bash
npm start
# o
node server.js
```

Después abre tu navegador en: **http://localhost:3000**

---

## 🗺️ Estructura del proyecto

```
BattleNetManager/
├── public/
│   ├── index.html          # SPA principal
│   ├── css/
│   │   └── styles.css      # Estilos (dark fantasy theme)
│   └── js/
│       └── app.js          # Lógica frontend completa
├── server.js               # Servidor Express + rutas API
├── .env                    # Variables de entorno (no subir)
├── package.json
└── launch.bat              # Lanzador Windows
```

---

## 🌐 Rutas de la API (servidor)

| Método | Ruta                                    | Descripción                               |
| ------ | --------------------------------------- | ----------------------------------------- |
| `GET`  | `/auth/login`                           | Redirige al flujo OAuth2 de Battle.net    |
| `GET`  | `/auth/callback`                        | Callback OAuth, guarda el token de sesión |
| `GET`  | `/auth/logout`                          | Cierra sesión                             |
| `GET`  | `/api/characters`                       | Lista todos los personajes de la cuenta   |
| `GET`  | `/api/character/:realm/:name`           | Perfil completo del personaje             |
| `GET`  | `/api/character/:realm/:name/equipment` | Equipamiento del personaje                |
| `GET`  | `/api/character/:realm/:name/talents`   | Talentos activos del personaje            |
| `GET`  | `/api/character/:realm/:name/media`     | Imagen/retrato del personaje              |
| `GET`  | `/api/talent-tree/:treeId/:specId`      | Layout estático del árbol de talentos     |

---

## ✨ Funcionalidades

### Panel principal

- **![](https://wow.zamimg.com/images/wow/icons/tiny/ability_hunter_beastcall.gif) Tarjetas de personaje** con retrato, nombre, reino, clase, especialización, nivel y facción
- **![](https://wow.zamimg.com/images/wow/icons/tiny/achievement_character_human_male.gif) Personaje principal** destacado en una tarjeta grande con más detalle
- **Filtros** por facción, clase y rango de ítem
- **Búsqueda** en tiempo real por nombre de personaje

### Topbar

- **Contador de personajes** totales
- **Contador ![Horda](https://wow.zamimg.com/images/wow/icons/tiny/achievement_pvp_h_16.gif) Horda** / **![Alianza](https://wow.zamimg.com/images/wow/icons/tiny/achievement_pvp_a_16.gif) Alianza** clicables — muestran el modal de distribución de razas

### Modal de Equipamiento

- Vista completa de los 16 slots de equipo
- Iconos de ítem con calidad de color (épico, raro, etc.)
- Nivel de ítem, encantamientos y gemas

### Modal de Talentos

- Árbol de talentos visual con los talentos seleccionados actualmente
- Carga automática según la especialización activa del personaje

---

## 🔒 Seguridad

- Las credenciales de la API nunca se exponen al cliente
- El token de acceso de Battle.net se guarda en sesión del servidor (no en cookies del navegador directamente)
- Las rutas `/api/*` requieren sesión autenticada (`requireAuth` middleware)
- El `.env` **no debe subirse nunca** a control de versiones — añade `.env` a tu `.gitignore`

```gitignore
# .gitignore recomendado
.env
node_modules/
```

---

## ❓ Problemas frecuentes

| Error                                | Solución                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `Invalid redirect URI` en Battle.net | Asegúrate de que el Redirect URI en el portal de Blizzard es exactamente `http://localhost:3000/auth/callback` |
| Personajes no cargan                 | Comprueba que `REGION` en `.env` coincide con la región de tu cuenta (ej. `eu`)                                |
| Puerto 3000 ocupado                  | Cambia `PORT` en `.env` a otro valor (ej. `3001`) y actualiza el Redirect URI en Battle.net                    |
| `npm: command not found`             | Instala Node.js desde [nodejs.org](https://nodejs.org)                                                         |

---

## 📄 Licencia

Proyecto personal / educativo. Este proyecto no está afiliado con **Blizzard Entertainment**.  
Los iconos y recursos de World of Warcraft son propiedad de **© Blizzard Entertainment, Inc.**

---

<p align="center">
  <img src="https://render.worldofwarcraft.com/us/icons/56/wow_token01.jpg" width="24">
  <em>Hecho con ❤️ para la comunidad de World of Warcraft</em>
</p>
