import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const promptDirectory = path.resolve("prompts");

export const getChatResponse = async (message, mode, exampleCount = 9) => {
  try {
    const promptFile = 
      mode === "example" && exampleCount === 3 ? "ExampleLearnPrompt3.txt" :
      mode === "example" && exampleCount === 6 ? "ExampleLearnPrompt6.txt" :
      mode === "example" && exampleCount === 9 ? "ExampleLearnPrompt.txt" :
      mode === "learnchat" ? "LearnChatPrompt.txt" :
      "DeepDivePrompt.txt";

    console.log(`📝 Loading prompt: ${promptFile} for mode: ${mode}, examples: ${exampleCount}`);

    const systemPrompt = fs.readFileSync(
      path.join(promptDirectory, promptFile),
      "utf-8"
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },   // ← the file above
        { role: "user", content: message }           // ← just topic/problem text; no instructions
      ],
      stop: [
        "<!--EXPLANATION_END-->",
        "<!--STEPS_END-->",
        "<!--SOLVE_END-->",
        "<!--PRACTICE_END-->",
        "<!--SOLUTION_END-->"
      ],
      temperature: 0.2,
      max_tokens: 4600
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Error from OpenAI:", err);
    return "Sorry, the AI couldn't generate a response.";
  }
};

// NEW: Streaming version of getChatResponse
export const streamChatResponse = async (message, mode, exampleCount = 9) => {
  try {
    const promptFile = 
      mode === "example" && exampleCount === 3 ? "ExampleLearnPrompt3.txt" :
      mode === "example" && exampleCount === 6 ? "ExampleLearnPrompt6.txt" :
      mode === "example" && exampleCount === 9 ? "ExampleLearnPrompt.txt" :
      mode === "learnchat" ? "LearnChatPrompt.txt" :
      "DeepDivePrompt.txt";

    console.log(`📝 [STREAM] Loading prompt: ${promptFile} for mode: ${mode}, examples: ${exampleCount}`);

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
  exampleCount = 9,
}) => {
  try {
    const promptFile = 
      mode === "example" && exampleCount === 3 ? "ExampleLearnPrompt3.txt" :
      mode === "example" && exampleCount === 6 ? "ExampleLearnPrompt6.txt" :
      mode === "example" && exampleCount === 9 ? "ExampleLearnPrompt.txt" :
      mode === "learnchat" ? "LearnChatPrompt.txt" :
      "DeepDivePrompt.txt";
    
    console.log(`📝 [VISION-STREAM] Loading prompt: ${promptFile} for mode: ${mode}, examples: ${exampleCount}`);
    
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
  exampleCount = 9,
}) {
  // load the same prompt file you use for text-only
  const promptFile = 
    mode === "example" && exampleCount === 3 ? "ExampleLearnPrompt3.txt" :
    mode === "example" && exampleCount === 6 ? "ExampleLearnPrompt6.txt" :
    mode === "example" && exampleCount === 9 ? "ExampleLearnPrompt.txt" :
    mode === "learnchat" ? "LearnChatPrompt.txt" :
    "DeepDivePrompt.txt";
  
  console.log(`📝 [VISION] Loading prompt: ${promptFile} for mode: ${mode}, examples: ${exampleCount}`);
  
  const systemPrompt = fs.readFileSync(
    path.join(promptDirectory, promptFile),
    "utf-8"
  );

  const content = [{ type: "text", text: message }];
  for (const url of images) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },   // ← the file above
      { role: "user", content: message }           // ← just topic/problem text; no instructions
    ],
    stop: [
      "<!--EXPLANATION_END-->",
      "<!--STEPS_END-->",
      "<!--SOLVE_END-->",
      "<!--PRACTICE_END-->",
      "<!--SOLUTION_END-->"
    ],
    temperature: 0.2,
    max_tokens: 4600
  });

  return completion.choices?.[0]?.message?.content ?? "";
}
