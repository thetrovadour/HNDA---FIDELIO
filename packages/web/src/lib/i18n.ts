export const esHN = {
  // Admin tabs
  'tab.merchants':   'Comercios',
  'tab.redemptions': 'Canjes',
  'tab.payouts':     'Pagos',
  'tab.mint':        'Acreditar',
  'tab.health':      'Estado',
  'tab.clients':     'Clientes',
  'tab.gca':         'GCA',

  // Admin UI
  'admin.title':           'Consola Admin',
  'admin.disconnect':      'Desconectar',
  'admin.connect':         'Conectar',
  'admin.jwt_label':       'Token JWT',
  'admin.jwt_placeholder': 'Pega el JWT de admin...',

  // Client tabs
  'tab.cuenta':    'Mi Cuenta',
  'tab.actividad': 'Actividad',
  'tab.red':       'Red',
  'tab.ajustes':   'Ajustes',

  // Merchant tabs
  'tab.negocio':     'Mi Negocio',
  'tab.canjear':     'Canjear',
  'tab.movimientos': 'Movimientos',

  // Common
  'common.wallet':   'Wallet',
  'common.balance':  'Balance',
  'common.loading':  'Cargando...',
  'common.error':    'Error',
  'common.save':     'Guardar cambios',
  'common.saving':   'Guardando',
  'common.logout':   'Salir',
} as const;

export const enUS: Record<keyof typeof esHN, string> = {
  // Admin tabs
  'tab.merchants':   'Merchants',
  'tab.redemptions': 'Redemptions',
  'tab.payouts':     'Payouts',
  'tab.mint':        'Mint',
  'tab.health':      'Health',
  'tab.clients':     'Clients',
  'tab.gca':         'GCA',

  // Admin UI
  'admin.title':           'Admin Console',
  'admin.disconnect':      'Disconnect',
  'admin.connect':         'Connect',
  'admin.jwt_label':       'JWT Token',
  'admin.jwt_placeholder': 'Paste admin JWT...',

  // Client tabs
  'tab.cuenta':    'My Account',
  'tab.actividad': 'Activity',
  'tab.red':       'Network',
  'tab.ajustes':   'Settings',

  // Merchant tabs
  'tab.negocio':     'My Business',
  'tab.canjear':     'Redeem',
  'tab.movimientos': 'Transactions',

  // Common
  'common.wallet':   'Wallet',
  'common.balance':  'Balance',
  'common.loading':  'Loading...',
  'common.error':    'Error',
  'common.save':     'Save changes',
  'common.saving':   'Saving',
  'common.logout':   'Sign out',
};

export type Key = keyof typeof esHN;

function detectLang(): 'es' | 'en' {
  if (typeof navigator === 'undefined') return 'es';
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('en') ? 'en' : 'es';
}

// Always returns Spanish — safe for SSR. Use useLang() in components instead.
export function t(key: Key): string {
  return esHN[key];
}
