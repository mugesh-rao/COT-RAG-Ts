import OpenAI from "openai";

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: "YOUR_API_KEY", // Replace with your actual OpenAI API key
});

// Interface for context items
interface ContextItem {
    id: number;
    text: string;
}

// CoT Step 1: Generate embedding for the question
async function generateEmbedding(text: string): Promise<number[]> {
    console.log("[CoT Step 1] Generating embedding for question...");
    try {
        const response = await client.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });
        const embedding = response.data?.[0]?.embedding;
        if (!embedding) throw new Error("No embedding returned");
        console.log("[CoT Step 1] Embedding generated successfully.");
        return embedding;
    } catch (error) {
        throw new Error(`Embedding failed: ${error.message}`);
    }
}

// CoT Step 2: Retrieve context (mock database simulation)
async function queryDatabase(embedding: number[]): Promise<{ text: string }[]> {
    console.log("[CoT Step 2] Querying database with embedding...");
    // Mock data simulating a vector search result
    const context = [
        {
            text: "In the 2024 Qatar GP qualifying, Max Verstappen impeded George Russell, earning a one-place grid penalty. Russell took pole, but Verstappen won the race.",
        },
        {
            text: "Post-race, Verstappen accused Russell of exaggerating the incident to stewards, saying he 'lost all respect' for him. Russell claimed Verstappen threatened to crash into him.",
        },
    ];
    console.log("[CoT Step 2] Retrieved context:", context.map(c => c.text));
    return context;
}

// CoT Step 3: Preprocess retrieved context
function preprocessContext(rawContext: { text: string }[]): ContextItem[] {
    console.log("[CoT Step 3] Preprocessing context...");
    const processed = rawContext.map((doc, idx) => {
        const cleanedText = doc.text.trim().replace(/\s+/g, " ");
        return { id: idx, text: cleanedText };
    });
    console.log("[CoT Step 3] Processed context:", processed.map(c => c.text));
    return processed;
}

// CoT Step 4: Generate response with explicit Chain of Thought
async function generateResponse(question: string, context: ContextItem[]): Promise<string> {
    console.log("[CoT Step 4] Generating response with Chain of Thought...");

    // Construct context string
    const contextString = context.length
        ? context.map(c => `Doc ${c.id}: ${c.text}`).join("\n")
        : "No context available.";

    // Define CoT prompt
    const prompt = `
        You are an expert in Formula 1 racing. Use Chain of Thought reasoning to answer the question by following these steps:
        1. Summarize the provided context or note if none exists.
        2. Identify key factors or events relevant to the question.
        3. Reason through the question step-by-step, using the context and your expertise.
        4. Provide a concise final answer.

        Context:
        ${contextString}

        Question: ${question}

        Format your response as:
        [Step 1]
        Summary...
        [Step 2]
        Factors...
        [Step 3]
        Reasoning...
        [Step 4: Final Answer]
        Answer...
    `;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Follow the CoT instructions precisely." },
                { role: "user", content: prompt },
            ],
            temperature: 0.6, // Balanced reasoning
            max_tokens: 1500,
        });
        const answer = response.choices[0].message.content;
        console.log("[CoT Step 4] Response generated successfully.");
        return answer;
    } catch (error) {
        throw new Error(`Response generation failed: ${error.message}`);
    }
}

// Main function implementing CoT workflow
async function askQuestion(question: string): Promise<string> {
    try {
        // Step 1: Generate embedding
        const embedding = await generateEmbedding(question);

        // Step 2: Retrieve context
        const rawContext = await queryDatabase(embedding);

        // Step 3: Preprocess context
        const processedContext = preprocessContext(rawContext);

        // Step 4: Generate response
        const response = await generateResponse(question, processedContext);

        return response;
    } catch (error) {
        console.error("[Error] Chain of Thought process failed:", error.message);
        throw error;
    }
}

// Execute the program
async function run() {
    const question = "Why are George Russell and Max Verstappen arguing after Qatar 2024?";
    console.log(`Starting Chain of Thought process for: "${question}"\n`);
    try {
        const answer = await askQuestion(question);
        console.log("\nGenerated Answer:\n", answer);
    } catch (error) {
        console.error("Failed to generate answer:", error.message);
    }
}

run();