import { supabase } from "@/shared/api/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function getAuthSession() {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error);
  return data.session;
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => subscription.unsubscribe();
}

export async function getOwnerByUserId(userId) {
  const { data, error } = await supabase
    .from("store_owners")
    .select("*")
    .eq("user_id", userId)
    .single();

  throwIfError(error);
  return data;
}

export async function getStoreByOwnerId(ownerId) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  throwIfError(error);
  return data;
}

export async function signUpWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  throwIfError(error);
  return data;
}

export async function createOwner({ userId, email, name, phone }) {
  const { data, error } = await supabase
    .from("store_owners")
    .insert({
      user_id: userId,
      email,
      name,
      phone,
    })
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function createStore({ slug, name, ownerId }) {
  const { error } = await supabase.from("stores").insert({
    slug,
    name,
    owner_id: ownerId,
  });

  throwIfError(error);
}

export async function signInWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  throwIfError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

export const authRepository = {
  getAuthSession,
  onAuthStateChange,
  getOwnerByUserId,
  getStoreByOwnerId,
  signUpWithEmail,
  createOwner,
  createStore,
  signInWithPassword,
  signOut,
};
