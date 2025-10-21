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
import parseResponse from "../parseSections.js";

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

// Streaming endpoint
router.get("/stream", async (req, res) => {
  const { session_id, message, mode, exampleCount } = req.query;
  console.log(`🔄 Stream: mode=${mode}, examples=${exampleCount || 9}`);

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
    
    // Validate mode parameter
    if (!mode) {
      console.error("❌ Mode parameter is missing!");
      res.write(`data: ${JSON.stringify({
        type: "error",
        error: "Mode parameter is required",
      })}\n\n`);
      res.end();
      return;
    }

    // Use text-only streaming for GET requests (images come via POST)
    const stream = await streamChatResponse(message, mode, parseInt(exampleCount) || 9);

    let fullResponse = "";
    let sentInitialSections = false;

    // Process the streaming response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        // Send chunk to frontend
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);

        // Check if we have enough content for first 15 sections
        if (!sentInitialSections) {
          const currentSections = parseResponse(fullResponse);
          
          // Once we have at least 15 sections, send them immediately
          if (currentSections.length >= 15) {
            const initialSections = currentSections.slice(0, 15);
            res.write(
              `data: ${JSON.stringify({ 
                type: "sectionsReady", 
                sections: initialSections 
              })}\n\n`
            );
            console.log(`🚀 Sent first 15 sections to frontend (out of ${currentSections.length} so far)`);
            sentInitialSections = true;
          }
        }
      }
    }

    // Parse the complete response into sections
    const sections = parseResponse(fullResponse);

    // Debug logging to see parsed sections
    console.log("🔍 RAW RESPONSE LENGTH:", fullResponse.length);
    console.log("📊 PARSED SECTIONS COUNT:", sections.length);
    console.log(
      "📋 SECTIONS TYPES:",
      sections.map((s) => s.type)
    );
    console.log(
      "📝 FIRST SECTION PREVIEW:",
      sections[0]?.content?.substring(0, 100) + "..."
    );

    // Log each section details
    sections.forEach((section, index) => {
      console.log(`\n--- SECTION ${index + 1} ---`);
      console.log(`Type: ${section.type}`);
      console.log(`Title: ${section.title}`);
      console.log(`Content Length: ${section.content.length}`);
      console.log(`Preview: ${section.content.substring(0, 150)}...`);
    });

    // Send remaining sections (if any beyond the first 15)
    if (sections.length > 15) {
      const remainingSections = sections.slice(15);
      res.write(
        `data: ${JSON.stringify({ 
          type: "remainingSections", 
          sections: remainingSections,
          startIndex: 15
        })}\n\n`
      );
      console.log(`📦 Sent remaining ${remainingSections.length} sections (sections 15-${sections.length - 1})`);
    }

    // Send completion signal
    res.write(
      `data: ${JSON.stringify({ type: "done", totalSections: sections.length })}\n\n`
    );
    console.log(`✅ Stream completed for session ${session_id} - Total sections: ${sections.length}`);
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
  const { session_id, message = "", images = [], mode, exampleCount } = req.body;
  console.log(`🔄 Vision stream: mode=${mode}, examples=${exampleCount || 9}`);

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
      `🔄 Starting vision stream for session ${session_id}, images: ${images.length}, mode: ${mode}`
    );
    
    // Validate mode parameter
    if (!mode) {
      console.error("❌ Mode parameter is missing!");
      res.write(`data: ${JSON.stringify({
        type: "error",
        error: "Mode parameter is required",
      })}\n\n`);
      res.end();
      return;
    }

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
        exampleCount: parseInt(exampleCount) || 9,
      });
    } else {
      // Use text-only streaming if no images
      stream = await streamChatResponse(message, mode, parseInt(exampleCount) || 9);
    }

    let fullResponse = "";
    let sentInitialSections = false;

    // Process the streaming response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        // Send chunk to frontend
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);

        // Check if we have enough content for first 15 sections
        if (!sentInitialSections) {
          const currentSections = parseResponse(fullResponse);
          
          // Once we have at least 15 sections, send them immediately
          if (currentSections.length >= 15) {
            const initialSections = currentSections.slice(0, 15);
            res.write(
              `data: ${JSON.stringify({ 
                type: "sectionsReady", 
                sections: initialSections 
              })}\n\n`
            );
            console.log(`🚀 Sent first 15 sections to frontend (out of ${currentSections.length} so far)`);
            sentInitialSections = true;
          }
        }
      }
    }

    // Parse the complete response into sections
    const sections = parseResponse(fullResponse);

    // Debug logging to see parsed sections
    console.log("🔍 RAW RESPONSE LENGTH:", fullResponse.length);
    console.log("📊 PARSED SECTIONS COUNT:", sections.length);
    console.log(
      "📋 SECTIONS TYPES:",
      sections.map((s) => s.type)
    );
    console.log(
      "📝 FIRST SECTION PREVIEW:",
      sections[0]?.content?.substring(0, 100) + "..."
    );

    // Log each section details
    sections.forEach((section, index) => {
      console.log(`\n--- SECTION ${index + 1} ---`);
      console.log(`Type: ${section.type}`);
      console.log(`Title: ${section.title}`);
      console.log(`Content Length: ${section.content.length}`);
      console.log(`Preview: ${section.content.substring(0, 150)}...`);
    });

    // Send remaining sections (if any beyond the first 15)
    if (sections.length > 15) {
      const remainingSections = sections.slice(15);
      res.write(
        `data: ${JSON.stringify({ 
          type: "remainingSections", 
          sections: remainingSections,
          startIndex: 15
        })}\n\n`
      );
      console.log(`📦 Sent remaining ${remainingSections.length} sections (sections 15-${sections.length - 1})`);
    }

    // Send completion signal
    res.write(
      `data: ${JSON.stringify({ type: "done", totalSections: sections.length })}\n\n`
    );
    console.log(`✅ Vision stream completed for session ${session_id} - Total sections: ${sections.length}`);
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
  const { message, mode, exampleCount } = req.body;

  try {
    //
    const rawReply = await getChatResponse(message, mode, parseInt(exampleCount) || 9);

    // parse into sections
    const sections = parseResponse(rawReply);

    // Debug logging to see parsed sections
    console.log("🔍 RAW RESPONSE LENGTH:", rawReply.length);
    console.log("📊 PARSED SECTIONS COUNT:", sections.length);
    console.log(
      "📋 SECTIONS TYPES:",
      sections.map((s) => s.type)
    );
    console.log(
      "📝 FIRST SECTION PREVIEW:",
      sections[0]?.content?.substring(0, 100) + "..."
    );

    // Log each section details
    sections.forEach((section, index) => {
      console.log(`\n--- SECTION ${index + 1} ---`);
      console.log(`Type: ${section.type}`);
      console.log(`Title: ${section.title}`);
      console.log(`Content Length: ${section.content.length}`);
      console.log(`Preview: ${section.content.substring(0, 150)}...`);
    });

    res.json({
      sections: sections,
      rawResponse: rawReply,
    });
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
    const { message = "", images = [], mode = "example", exampleCount } = req.body;

    console.log("Server got images:", images?.length);
    const safeImages = Array.isArray(images)
      ? images.filter(
          (u) => typeof u === "string" && u.startsWith("data:image/")
        )
      : [];

    const reply = await chatWithVision({ 
      message, 
      images: safeImages, 
      mode, 
      exampleCount: parseInt(exampleCount) || 9 
    });
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
