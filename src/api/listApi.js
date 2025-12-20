import { supabase } from "./supabaseClient";

export async function fetchListsByGroup(groupId) {
  const { data, error } = await supabase
    .from("group_lists")
    .select("*")
    .eq("group_id", groupId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Listen:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update positions of multiple lists
 * @param {Array} updates - Array of { id, position } objects
 */
export async function updateListPositions(updates) {
  // Update each list position
  const promises = updates.map(({ id, position }) =>
    supabase
      .from("group_lists")
      .update({ position })
      .eq("id", id)
  );

  const results = await Promise.all(promises);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    console.error("Fehler beim Aktualisieren der Positionen:", results);
    throw new Error("Fehler beim Speichern der Reihenfolge");
  }

  return true;
}