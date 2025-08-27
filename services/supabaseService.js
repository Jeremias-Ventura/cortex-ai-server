import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// save a single chat message
export const saveMessage = async ({ session_id, role, message }) => {
  return await supabase
    .from("chat_history")
    .insert([{ session_id, role, message }]);
};

// fetch all messages for a session
export const getMessages = async (session_id) => {
  return await supabase
    .from("chat_history")
    .select("*")
    .eq("session_id", session_id)
    .order("created_at", { ascending: true });
};

export { supabase };
