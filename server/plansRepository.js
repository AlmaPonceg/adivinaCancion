import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Default initial plans
const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Acústico',
    badge: 'Para jugar en casa',
    tagline: 'Ideal para jugar con amigos cercanos y reuniones pequeñas sin costo alguno.',
    priceMonthly: 0,
    priceYearly: 0,
    maxPlayers: 10,
    enabled: true,
    accentColor: '#46178F',
    features: [
      'Hasta 10 jugadores por sala',
      'Acceso a todos los packs públicos',
      'Pulsador web clásico en tiempo real',
      'Marcador automático de puntuación',
    ],
    limits: {
      maxPlayers: 10,
      canUseDjBot: false,
      canCustomTheme: false,
      unlimitedPacks: false,
    },
  },
  {
    id: 'plus',
    name: 'Party Plus',
    badge: 'Para particulares y amigos',
    tagline: 'El kit de herramientas para juntadas, cumpleaños y diversión musical sin trabas.',
    priceMonthly: 3,
    priceYearly: 29,
    discountText: 'Ahorrá 20% anual',
    maxPlayers: 35,
    enabled: true,
    accentColor: '#E21B3C',
    features: [
      'Hasta 35 jugadores en simultáneo',
      'Creación de packs personalizados ilimitados',
      'Efectos de sonido arcade y pulsadores temáticos',
      'Buscador integrado de canciones con vista previa',
      'Partidas sin anuncios ni esperas',
    ],
    limits: {
      maxPlayers: 35,
      canUseDjBot: false,
      canCustomTheme: false,
      unlimitedPacks: true,
    },
  },
  {
    id: 'pro',
    name: 'Showtime Pro',
    badge: 'Más Popular',
    tagline: 'La experiencia de game-show definitiva para bares, eventos medianos y docentes.',
    priceMonthly: 12,
    priceYearly: 108,
    discountText: 'Ahorrá 25% anual',
    maxPlayers: 100,
    enabled: true,
    accentColor: '#46178F',
    features: [
      'Hasta 100 jugadores en simultáneo',
      'Asistente DJ Bot inteligente con IA para sugerencias en vivo',
      'Modo Torneo por Equipos con podio interactivo',
      'Controles avanzados de tiempo y desempates',
      'Acceso prioritario a novedades y packs exclusivos',
    ],
    limits: {
      maxPlayers: 100,
      canUseDjBot: true,
      canCustomTheme: false,
      unlimitedPacks: true,
    },
  },
  {
    id: 'ultra',
    name: 'Festival 360',
    badge: 'Para profesionales y eventos',
    tagline: 'La plataforma total para animadores, salones de fiestas, boliches y grandes eventos.',
    priceMonthly: 29,
    priceYearly: 249,
    discountText: 'Ahorrá 30% hasta fin de mes',
    maxPlayers: 1000,
    enabled: true,
    accentColor: '#00E676',
    features: [
      'Jugadores ilimitados (hasta 1.000+ por sala)',
      'Personalización completa de colores, logo y pantallas',
      'Panel de control dual para DJ y animador en vivo',
      'Descarga de reportes y estadísticas en Excel / JSON',
      'Soporte técnico prioritario 24/7 para tus eventos',
    ],
    limits: {
      maxPlayers: 1000,
      canUseDjBot: true,
      canCustomTheme: true,
      unlimitedPacks: true,
    },
  },
];

// Initial registered/tracked users with assigned plans
const DEFAULT_USERS = [
  {
    id: 'user_alma',
    username: 'Alma Ponce',
    role: 'admin',
    planId: 'ultra',
    joinedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    notes: 'Cumpleañera VIP & Host Principal',
  },
  {
    id: 'user_facu',
    username: 'Facu',
    role: 'admin',
    planId: 'ultra',
    joinedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    notes: 'Moderador & Desarrollador',
  },
  {
    id: 'user_djfiesta',
    username: 'DJ Fiesta',
    role: 'creator',
    planId: 'pro',
    joinedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    notes: 'Creador de Packs de Cumbia & Cuarteto',
  },
  {
    id: 'user_comunidad',
    username: 'Comunidad Trivia',
    role: 'creator',
    planId: 'plus',
    joinedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    notes: 'Packs de Rock Nacional',
  },
  {
    id: 'user_invitado_demo',
    username: 'Invitado Demo',
    role: 'user',
    planId: 'free',
    joinedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Usuario Estándar',
  },
];

class PlansRepository {
  constructor() {
    this.ensureDataDir();
    this.ensurePlansFile();
    this.ensureUsersFile();
    this.readSessions();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  ensurePlansFile() {
    if (!fs.existsSync(PLANS_FILE)) {
      this.writePlans(DEFAULT_PLANS);
    }
  }

  ensureUsersFile() {
    if (!fs.existsSync(USERS_FILE)) {
      this.writeUsers(DEFAULT_USERS);
    }
  }

  readPlans() {
    try {
      this.ensurePlansFile();
      const raw = fs.readFileSync(PLANS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
      return DEFAULT_PLANS;
    } catch (err) {
      console.error('[PlansRepo] Error reading plans.json, falling back to defaults:', err);
      return DEFAULT_PLANS;
    }
  }

  writePlans(plans) {
    this.ensureDataDir();
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
  }

  readUsers() {
    try {
      this.ensureUsersFile();
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
      return DEFAULT_USERS;
    } catch (err) {
      console.error('[PlansRepo] Error reading users.json, falling back to defaults:', err);
      return DEFAULT_USERS;
    }
  }

  writeUsers(users) {
    this.ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  }

  // ── Public Plan Queries ─────────────────────────────────────

  getPlans({ includeDisabled = true } = {}) {
    const plans = this.readPlans();
    if (includeDisabled) return plans;
    return plans.filter((p) => p.enabled);
  }

  getPlanById(planId) {
    const plans = this.readPlans();
    return plans.find((p) => p.id === planId) || null;
  }

  // ── Moderator Plan Actions ──────────────────────────────────

  togglePlanStatus(planId) {
    const plans = this.readPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return null;

    plan.enabled = !plan.enabled;
    this.writePlans(plans);
    return plan;
  }

  updatePlan(planId, updates = {}) {
    const plans = this.readPlans();
    const planIndex = plans.findIndex((p) => p.id === planId);
    if (planIndex === -1) return null;

    plans[planIndex] = {
      ...plans[planIndex],
      ...updates,
      id: planId, // Prevent id overwrite
    };

    this.writePlans(plans);
    return plans[planIndex];
  }

  // ── User & Plan Assignment Actions ──────────────────────────

  getUsers() {
    return this.readUsers();
  }

  getUserById(userId) {
    const users = this.readUsers();
    return users.find((u) => u.id === userId || u.username.toLowerCase() === String(userId).toLowerCase()) || null;
  }

  setUserPlan(userIdOrUsername, planId) {
    const plan = this.getPlanById(planId);
    if (!plan) {
      throw new Error(`El plan con ID '${planId}' no existe.`);
    }

    const users = this.readUsers();
    const query = String(userIdOrUsername).trim().toLowerCase();
    let user = users.find((u) => u.id.toLowerCase() === query || u.username.toLowerCase() === query);

    const now = new Date().toISOString();

    if (user) {
      user.planId = planId;
      user.updatedAt = now;
    } else {
      // Create record if not found (e.g. active community player or new creator)
      user = {
        id: `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        username: userIdOrUsername,
        role: 'user',
        planId: planId,
        joinedAt: now,
        updatedAt: now,
      };
      users.push(user);
    }

    this.writeUsers(users);
    return { user, plan };
  }

  getUserEffectivePlan(userIdOrUsername) {
    const user = this.getUserById(userIdOrUsername);
    const planId = user?.planId || 'free';
    const plan = this.getPlanById(planId) || this.getPlanById('free');
    return {
      user: user || { id: 'guest', username: userIdOrUsername || 'Invitado', planId: 'free', role: 'guest' },
      plan,
    };
  }

  // ── Authentication & Sessions ──────────────────────────────

  activeSessions = new Map();

  readSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.activeSessions = new Map(list);
        }
      }
    } catch (err) {
      console.error('[PlansRepo] Error reading sessions.json:', err);
    }
  }

  writeSessions() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify([...this.activeSessions.entries()], null, 2), 'utf-8');
    } catch (err) {
      console.error('[PlansRepo] Error writing sessions.json:', err);
    }
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  }

  createSession(user) {
    const token = 'hitpop_usr_' + crypto.randomBytes(24).toString('hex');
    this.activeSessions.set(token, {
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
    });
    this.writeSessions();
    return token;
  }

  getUserByToken(token) {
    if (!token) return null;
    const session = this.activeSessions.get(token);
    if (!session) return null;
    const user = this.getUserById(session.userId);
    return this.sanitizeUser(user);
  }

  destroySession(token) {
    if (token && this.activeSessions.has(token)) {
      this.activeSessions.delete(token);
      this.writeSessions();
    }
  }

  registerUser({ username, password, email }) {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error('El nombre de usuario debe tener al menos 2 caracteres.');
    }
    if (!password || password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    const users = this.readUsers();
    const existing = users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existing) {
      throw new Error(`El usuario "${cleanUsername}" ya existe. Elegí otro nombre.`);
    }

    const now = new Date().toISOString();
    const newUser = {
      id: `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      email: email ? email.trim().toLowerCase() : '',
      passwordHash: this.hashPassword(password),
      role: 'creator',
      planId: 'free',
      joinedAt: now,
      updatedAt: now,
      notes: 'Creador Registrado',
    };

    users.push(newUser);
    this.writeUsers(users);

    const token = this.createSession(newUser);
    return { user: this.sanitizeUser(newUser), token };
  }

  authenticateUser(usernameOrEmail, password) {
    const query = (usernameOrEmail || '').trim().toLowerCase();
    if (!query) throw new Error('Ingresá tu usuario o correo.');
    if (!password) throw new Error('Ingresá tu contraseña.');

    const users = this.readUsers();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === query ||
        (u.email && u.email.toLowerCase() === query)
    );

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    // If account was created prior to password hash (legacy seeds), set password on first login
    if (!user.passwordHash) {
      user.passwordHash = this.hashPassword(password);
      user.updatedAt = new Date().toISOString();
      this.writeUsers(users);
    } else {
      const isValid = this.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new Error('Contraseña incorrecta.');
      }
    }

    const token = this.createSession(user);
    return { user: this.sanitizeUser(user), token };
  }
}

const plansRepository = new PlansRepository();
export default plansRepository;
