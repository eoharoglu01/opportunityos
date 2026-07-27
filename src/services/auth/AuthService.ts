import { supabase } from "../../lib/supabase";

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export class AuthService {
  private getClient() {
    if (!supabase) {
      throw new Error(
        "Supabase yapılandırılmamış. .env.local dosyasındaki değerleri kontrol edin.",
      );
    }

    return supabase;
  }

  async getSession() {
    const client = this.getClient();

    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  async getCurrentUser() {
    const session = await this.getSession();

    return session?.user ?? null;
  }

  async signInAnonymously() {
    const client = this.getClient();

    const { data, error } = await client.auth.signInAnonymously();

    if (error) {
      throw error;
    }

    return data.user;
  }

  async signUp({ email, password, fullName }: SignUpInput) {
    const client = this.getClient();

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signIn({ email, password }: SignInInput) {
    const client = this.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signOut() {
    const client = this.getClient();

    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();