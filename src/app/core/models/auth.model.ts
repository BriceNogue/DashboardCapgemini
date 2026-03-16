export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
}
