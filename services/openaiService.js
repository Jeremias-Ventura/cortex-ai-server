import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const promptDirectory = path.resolve("prompts");

export const getChatResponse = async (message, mode) => {
  try {
    const promptFile =
      mode === "example" ? "ExampleLearnPrompt.txt" : "DeepDivePrompt.txt";

    const systemPrompt = fs.readFileSync(
      path.join(promptDirectory, promptFile),
      "utf-8"
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Error from OpenAI:", err);
    return "Sorry, the AI couldn't generate a response.";
  }
};

// NEW: Streaming version of getChatResponse
export const streamChatResponse = async (message, mode) => {
  try {
    const promptFile =
      mode === "example" ? "ExampleLearnPrompt.txt" : "DeepDivePrompt.txt";

    const systemPrompt = fs.readFileSync(
      path.join(promptDirectory, promptFile),
      "utf-8"
    );

    console.log(`🔄 Starting streaming request with mode: ${mode}`);

    // Enable streaming with stream: true
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      stream: true, // This enables streaming!
    });

    console.log("✅ Stream created successfully");
    return stream;

  } catch (err) {
    console.error("Error from OpenAI streaming:", err);
    throw err; // Let the route handler deal with the error
  }
};

// NEW: Streaming version of chatWithVision
export const streamChatWithVision = async ({
  message,
  images = [],
  mode = "example",
}) => {
  try {
    const promptFile =
      mode === "example" ? "ExampleLearnPrompt.txt" : "DeepDivePrompt.txt";
    const systemPrompt = fs.readFileSync(
      path.join(promptDirectory, promptFile),
      "utf-8"
    );

    const content = [{ type: "text", text: message }];
    for (const url of images) {
      content.push({ type: "image_url", image_url: { url } });
    }

    console.log(`🔄 Starting vision streaming request with ${images.length} images`);

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      stream: true, // Enable streaming for vision too!
    });

    console.log("✅ Vision stream created successfully");
    return stream;

  } catch (err) {
    console.error("Error from OpenAI vision streaming:", err);
    throw err;
  }
};

export async function chatWithVision({
  message,
  images = [],
  mode = "example",
}) {
  // load the same prompt file you use for text-only
  const promptFile =
    mode === "example" ? "ExampleLearnPrompt.txt" : "DeepDivePrompt.txt";
  const systemPrompt = fs.readFileSync(
    path.join(promptDirectory, promptFile),
    "utf-8"
  );

  const content = [{ type: "text", text: message }];
  for (const url of images) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt }, // <-- add your prompt here
      { role: "user", content },
    ],
  });

  return completion.choices?.[0]?.message?.content ?? "";
}