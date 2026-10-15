// The Salon's data (migration 0027), read and written straight from the
// browser under row-level security. Other people's posts and profiles are
// only reachable through salon_feed / salon_profile (signed-in only); the
// tables themselves answer to their owner alone. Nothing here can set a
// post's status or a suspension: those are editor functions.
import { supabase } from "./supabaseClient";

const uid = async () => (await supabase.auth.getUser()).data.user.id;

/** The caller's own profile row, or null if they never made one. */
export async function getMyProfile() {
  const { data, error } = await supabase.from("salon_profiles").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/** Create the profile, or change it (never upsert: user_id is not an updatable column). */
export async function saveMyProfile(row) {
  const existing = await getMyProfile();
  if (existing) {
    const { error } = await supabase.from("salon_profiles").update(row).eq("user_id", existing.user_id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("salon_profiles").insert({ user_id: await uid(), ...row });
    if (error) throw error;
  }
  return getMyProfile();
}

/** Remove my Salon presence: my posts, then the profile. Likes, follows and reports of mine go with the account. */
export async function removeMySalon() {
  const me = await uid();
  // A post an editor has hidden stays (it can't be deleted by its author); it
  // is invisible without a profile.
  const posts = await supabase.from("salon_posts").delete().eq("user_id", me).eq("status", "published");
  if (posts.error) throw posts.error;
  const { error } = await supabase.from("salon_profiles").delete().eq("user_id", me);
  if (error) throw error;
}

/** One page of posts: { kind, handle, following, before } → rows (newest first). */
export async function getFeed({ kind = null, handle = null, following = false, before = null, limit = 20 } = {}) {
  const { data, error } = await supabase.rpc("salon_feed", { p_kind: kind, p_handle: handle, p_following: following, p_before: before, p_limit: limit });
  if (error) throw error;
  return data || [];
}

/** A profile with counts, or null when it isn't public. */
export async function getProfile(handle) {
  const { data, error } = await supabase.rpc("salon_profile", { p_handle: handle });
  if (error) throw error;
  return data;
}

export async function createPost(row) {
  const { data, error } = await supabase.from("salon_posts").insert({ user_id: await uid(), ...row }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deletePost(id) {
  const { error } = await supabase.from("salon_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function like(postId) {
  const { error } = await supabase.from("salon_likes").insert({ user_id: await uid(), post_id: postId });
  if (error && error.code !== "23505") throw error;
}

export async function unlike(postId) {
  const { error } = await supabase.from("salon_likes").delete().eq("post_id", postId);
  if (error) throw error;
}

export async function follow(userId) {
  const { error } = await supabase.from("salon_follows").insert({ user_id: await uid(), followee_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function unfollow(userId) {
  const { error } = await supabase.from("salon_follows").delete().eq("followee_id", userId);
  if (error) throw error;
}

/** Report a post ({ postId }) or a profile ({ profileUserId }). A repeat report is not an error. */
export async function report({ postId = null, profileUserId = null, reason, note = "" }) {
  const row = { user_id: await uid(), reason, note: note.trim() || null, ...(postId ? { post_id: postId } : { profile_user_id: profileUserId }) };
  const { error } = await supabase.from("salon_reports").insert(row);
  if (error && error.code !== "23505") throw error;
}

// ---- editors only (the admins table) ----
export async function getReportQueue() {
  const { data, error } = await supabase.rpc("salon_report_queue");
  if (error) throw error;
  return data || [];
}

export async function moderate(reportId, action) {
  const { error } = await supabase.rpc("salon_moderate", { p_report: reportId, p_action: action });
  if (error) throw error;
}

export async function unsuspend(handle) {
  const { error } = await supabase.rpc("salon_unsuspend", { p_handle: handle });
  if (error) throw error;
}
