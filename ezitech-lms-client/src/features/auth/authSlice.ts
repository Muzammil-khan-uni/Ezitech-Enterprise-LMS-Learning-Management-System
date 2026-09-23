import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Role = 'student' | 'instructor' | 'mentor' | 'course_manager' | 'admin';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  mfaEnabled: boolean;
  isEmailVerified: boolean;
  avatar?: { url?: string };
  phone?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setAccessToken, updateUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
