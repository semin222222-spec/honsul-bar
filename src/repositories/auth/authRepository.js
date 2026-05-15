import { supabase, supabaseAuth } from "@/shared/api/supabaseClient";

// supabaseAuth: .auth.* 호출 전용. 로그인/세션 관리.
// supabase: REST 쿼리 전용. accessToken 옵션으로 auth lock 우회.
//   (한 client에서 둘 다 하면 visibilitychange 후 auth lock deadlock 발생)

function throwIfError(error) {
  if (error) throw error;
}

export async function getAuthSession() {
  const { data, error } = await supabaseAuth.auth.getSession();
  throwIfError(error);
  return data.session;
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabaseAuth.auth.onAuthStateChange(callback);

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
  const { data, error } = await supabaseAuth.auth.signUp({ email, password });
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
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  throwIfError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut();
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
