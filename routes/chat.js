import express from "express";
import {
  getChatResponse,
  chatWithVision,
  streamChatResponse,
  streamChatWithVision,
} from "../services/openaiService.js";
import {
  saveMessage,
  getMessages,
  supabase,
} from "../services/supabaseService.js";

const router = express.Router();

// Test Supabase connection FIRST to avoid conflict with :session_id
router.get("/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .limit(1);
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Supabase test failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// NEW: Streaming endpoint
router.get("/stream", async (req, res) => {
  const { session_id, message, mode = "example" } = req.query;

  // Set up Server-Sent Events headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  try {
    console.log(`🔄 Starting stream for session ${session_id}, mode: ${mode}`);

    // Use text-only streaming for GET requests (images come via POST)
    const stream = await streamChatResponse(message, mode);

    // Process the streaming response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        // Send chunk to frontend
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    console.log(`✅ Stream completed for session ${session_id}`);
  } catch (error) {
    console.error("Streaming error:", error);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: "Failed to generate response",
      })}\n\n`
    );
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// NEW: Streaming endpoint for images (POST request to handle image data)
router.post("/stream", express.json({ limit: "15mb" }), async (req, res) => {
  const { session_id, message = "", images = [], mode = "example" } = req.body;

  // Set up Server-Sent Events headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  try {
    console.log(
      `🔄 Starting vision stream for session ${session_id}, images: ${images.length}`
    );

    const safeImages = Array.isArray(images)
      ? images.filter(
          (u) => typeof u === "string" && u.startsWith("data:image/")
        )
      : [];

    let stream;
    if (safeImages.length > 0) {
      // Use vision streaming if images are present
      stream = await streamChatWithVision({
        message,
        images: safeImages,
        mode,
      });
    } else {
      // Use text-only streaming if no images
      stream = await streamChatResponse(message, mode);
    }

    // Process the streaming response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        // Send chunk to frontend
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    console.log(`✅ Vision stream completed for session ${session_id}`);
  } catch (error) {
    console.error("Vision streaming error:", error);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: "Failed to generate response",
      })}\n\n`
    );
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

router.post("/", async (req, res) => {
  const { message, mode } = req.body;

  try {
    const reply = await getChatResponse(message, mode);
    res.json({ response: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.post("/start", async (req, res) => {
  const { mode } = req.body;
  console.log("📦 Received mode:", mode);

  // 🚧 Just return a fake session ID for now
  const fakeId =
    crypto.randomUUID?.() || Math.random().toString(36).substring(2, 10);

  res.status(200).json({ id: fakeId });
});

router.post("/save", async (req, res) => {
  const { session_id, role, message } = req.body;

  console.log("⚠️ Skipping Supabase save. Would have saved:", {
    session_id,
    role,
    message,
  });

  // Just return success without doing anything
  res.status(200).json({ message: "Temporarily skipping DB save" });
});

router.get("/sessions", async (req, res) => {
  const { data, error } = await supabase.from("chat_sessions").select("*");
  if (error) return res.status(500).json({ error });
  res.status(200).json(data);
});

router.post("/complete", express.json({ limit: "15mb" }), async (req, res) => {
  try {
    const { message = "", images = [], mode = "example" } = req.body;

    console.log("Server got images:", images?.length);
    const safeImages = Array.isArray(images)
      ? images.filter(
          (u) => typeof u === "string" && u.startsWith("data:image/")
        )
      : [];

    const reply = await chatWithVision({ message, images: safeImages, mode });
    res.json({ response: reply });
  } catch (err) {
    console.error("chat/complete error:", err);
    res.status(500).json({ error: "Failed to complete chat." });
  }
});

// PLACE THIS LAST
router.get("/:session_id", async (req, res) => {
  const { session_id } = req.params;
  const { data, error } = await getMessages(session_id);
  if (error) return res.status(500).json({ error });
  res.status(200).json(data);
});

export default router;
