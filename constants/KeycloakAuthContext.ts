// simple shim that re-exports from AuthContext
export {
  AuthProvider as KeycloakAuthProvider,
  useAuth as useKeycloakAuth,
} from './AuthContext';
