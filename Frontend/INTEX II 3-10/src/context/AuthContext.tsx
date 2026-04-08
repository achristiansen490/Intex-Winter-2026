import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type Role =
  | 'Admin'
  | 'Supervisor'
  | 'CaseManager'
  | 'SocialWorker'
  | 'FieldWorker'
  | 'Resident'
  | 'Donor';

export interface AuthUser {
  id: number;
  userName: string;
  email: string;
  userType: string | null;
  staffId: number | null;
  residentId: number | null;
  supporterId: number | null;
  roles: Role[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  role: Role | null;
  isLoading: boolean;
  /** Resolves only after /api/auth/me has completed and user state is set. */
  login: (email: string, password: string) => Promise<Role | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'hh_token';

// Priority order — highest privilege first
const ROLE_PRIORITY: Role[] = [
  'Admin',
  'Supervisor',
  'CaseManager',
  'SocialWorker',
  'FieldWorker',
  'Resident',
  'Donor',
];

function getPrimaryRole(roles: Role[]): Role | null {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
}

async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Token invalid');
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate user on mount / token change (e.g. page refresh)
  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchMe(token)
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  /**
   * Logs in, waits for /api/auth/me to complete, then returns the
   * resolved primary role so the caller can navigate immediately.
   */
  const login = useCallback(async (email: string, password: string): Promise<Role | null> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? 'Login failed');
    }

    const data = (await res.json()) as { token?: string; Token?: string };
    const jwt = data.token ?? data.Token;
    if (!jwt || typeof jwt !== 'string') {
      throw new Error('Login response missing token. Check API JSON and CORS/proxy settings.');
    }

    // Fetch /me immediately using the new token — don't wait for useEffect
    const meData = await fetchMe(jwt);

    // Now commit to state
    localStorage.setItem(TOKEN_KEY, jwt);
    setToken(jwt);
    setUser(meData);

    return getPrimaryRole(meData.roles);
  }, []);

  const logout = useCallback(() => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const role = user ? getPrimaryRole(user.roles) : null;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, role, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
