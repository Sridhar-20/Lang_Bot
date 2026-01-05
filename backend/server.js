const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// database connection
// database connection
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Added for manual token verification
const authRoutes = require('./routes/auth');
const PracticeSession = require('./models/PracticeSession'); // Added Persistence Model

// Connect to MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/languabot', {
            // useNewUrlParser: true, // Deprecated in newer mongoose, but safe to remove usually
            // useUnifiedTopology: true
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // data mode? if db fails, maybe we still run? for now let's just log
    }
};

// Only connect if URI is present (or default to local)
// But to prevent crashing if user hasn't set it up yet, we'll wrap it
if (process.env.MONGODB_URI) {
    connectDB();
} else {
    console.log("⚠️ MONGODB_URI not found in .env. Auth features may not work.");
}

// Middleware to prevent hanging if DB is not connected
app.use('/api/auth', (req, res, next) => {
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Service Unavailable: Database not connected. Please restart backend.' });
    }
    next();
});

app.use('/api/auth', authRoutes);

// Helper to read data files
const readData = (filename) => {
    const filePath = path.join(__dirname, 'data', filename);
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
};

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY;
const INTERVIEW_API_KEY = process.env.GEMINI_INTERVIEW_KEY || API_KEY; // Fallback to main key

if (!API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables.");
}

// Helper to call Gemini API via fetch (bypassing SDK issues)
const callGemini = async (modelName, prompt, specificKey = null) => {
    const keyToUse = specificKey || API_KEY;
    
    if (!keyToUse) return null;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyToUse}`;
    
    const startTime = Date.now();
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const duration = Date.now() - startTime;
        
        // Log to file
        const logEntry = `[${new Date().toISOString()}] Model: ${modelName} | Duration: ${duration}ms\n`;
        fs.appendFileSync(path.join(__dirname, 'server_timing.log'), logEntry);
        
        if (!response.ok) {
            throw new Error(data.error?.message || response.statusText);
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        const duration = Date.now() - startTime;
        const logEntry = `[${new Date().toISOString()}] ERROR Model: ${modelName} | Duration: ${duration}ms | Error: ${error.message}\n`;
        fs.appendFileSync(path.join(__dirname, 'server_timing.log'), logEntry);
        
        console.error(`\n🔴 Gemini API Error (${modelName}):`);
        console.error(`   Message: ${error.message}`);
        console.error(`   Key Used: ${keyToUse === API_KEY ? 'MAIN' : 'INTERVIEW'}`);
        throw error;
    }
};

// In-memory caches
let topicCache = [];
let grammarCache = {
    basic: [],
    intermediate: [],
    advanced: []
};

const GRAMMAR_BATCH_SIZE = 40;
const TOPIC_BATCH_SIZE = 20;
const CACHE_FILE = path.join(__dirname, 'data', 'persistent_cache.json');

// Helper to save cache to disk
const saveCache = () => {
    try {
        const cacheData = {
            topicCache,
            grammarCache
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
        // console.log("💾 Cache saved to disk."); // Optional: uncomment for verbose logging
    } catch (error) {
        console.error("Failed to save cache:", error.message);
    }
};

// Helper to load cache from disk
const loadCache = () => {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf8');
            const cacheData = JSON.parse(data);
            
            if (cacheData.topicCache) topicCache = cacheData.topicCache;
            if (cacheData.grammarCache) grammarCache = cacheData.grammarCache;
            
            console.log(`📂 Loaded cache from disk:`);
            console.log(`   - Topics: ${topicCache.length}`);
            console.log(`   - Grammar: Basic(${grammarCache.basic.length}), Inter(${grammarCache.intermediate.length}), Adv(${grammarCache.advanced.length})`);
        }
    } catch (error) {
        console.error("Failed to load cache:", error.message);
    }
};

// Load cache on startup
loadCache();

// Helper to generate content using Gemini
const generateBatch = async (type, count, difficulty = 'intermediate') => {
    if (!API_KEY) {
        console.error("Skipping generation: No API Key available.");
        return [];
    }

    console.log(`Generating new batch of ${count} ${type} questions (Difficulty: ${difficulty})...`);
    
    const generateWithModel = async (modelName) => {
        try {
            let prompt = "";
            if (type === 'grammar') {
                let difficultyDesc = "";
                switch(difficulty) {
                    case 'basic':
                        difficultyDesc = "simple, short sentences suitable for beginners (A1-A2 level). Focus on basic tenses (present simple, past simple) and common vocabulary.";
                        break;
                    case 'advanced':
                        difficultyDesc = "complex, sophisticated sentences suitable for advanced learners (C1-C2 level). Include nuanced grammar, idioms, mixed conditionals, and advanced vocabulary.";
                        break;
                    case 'intermediate':
                    default:
                        difficultyDesc = "moderately complex sentences suitable for intermediate learners (B1-B2 level). Include compound sentences and a variety of standard tenses.";
                        break;
                }

                prompt = `Generate ${count} unique, diverse English sentences for grammar practice. 
                They should be ${difficultyDesc}
                Return ONLY a JSON array of objects with this structure: [{"id": 1, "text": "Sentence here"}, ...]
                Do not include markdown formatting.`;
            } else if (type === 'topic') {
                prompt = `Generate ${count} interesting, open-ended discussion topics for English speaking practice.
                They should cover various themes like technology, society, personal growth, travel, etc.
                Return ONLY a JSON array of objects with this structure: [{"id": 1, "text": "Topic question here"}, ...]
                Do not include markdown formatting.`;
            }

            const text = await callGemini(modelName, prompt);
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.warn(`Failed with model ${modelName}:`, error.message);
            throw error;
        }
    };

    try {
        const result = await generateWithModel("gemini-2.5-flash");
        return result;
    } catch (error) {
        console.log("⚠️  gemini-2.5-flash failed, falling back to gemini-2.5-pro...");
        console.log("   Error:", error.message);
        try {
            const result = await generateWithModel("gemini-2.5-pro");
            return result;
        } catch (fallbackError) {
            console.error(`❌ Error generating ${type} batch after fallback:`);
            console.error(`   Model: gemini-2.5-pro`);
            console.error(`   Error: ${fallbackError.message}`);
            return [];
        }
    }
};

// Routes
app.get('/api/practice/questions/topic', async (req, res) => {
    if (topicCache.length === 0) {
        const newBatch = await generateBatch('topic', TOPIC_BATCH_SIZE);
        if (newBatch.length > 0) {
            topicCache = newBatch;
            saveCache(); // Save after generating
            console.log(`✅ Generated ${newBatch.length} NEW topics from Gemini API`);
        } else {
            // Fallback to local file if generation fails
            topicCache = readData('topics.json');
            console.log(`⚠️  Using ${topicCache.length} fallback topics from JSON file`);
        }
    }
    
    const question = topicCache.shift(); // Get and remove the first item
    saveCache(); // Save after consuming
    res.json(question);
});

app.get('/api/practice/questions/grammar', async (req, res) => {
    const difficulty = req.query.difficulty || 'intermediate';
    
    // Validate difficulty
    if (!['basic', 'intermediate', 'advanced'].includes(difficulty)) {
        return res.status(400).json({ error: "Invalid difficulty level. Use 'basic', 'intermediate', or 'advanced'." });
    }

    if (grammarCache[difficulty].length === 0) {
        const newBatch = await generateBatch('grammar', GRAMMAR_BATCH_SIZE, difficulty);
        if (newBatch.length > 0) {
            grammarCache[difficulty] = newBatch;
            saveCache(); // Save after generating
            console.log(`✅ Generated ${newBatch.length} NEW ${difficulty} grammar sentences from Gemini API`);
        } else {
            // Fallback to local file if generation fails - filter by difficulty if possible, or just return generic
            // For now, we'll just return generic fallback
            const allFallback = readData('grammar.json');
            // Simple heuristic for fallback if we wanted, but for now just taking a slice to avoid complexity
            grammarCache[difficulty] = allFallback.slice(0, 20); 
            console.log(`⚠️  Using ${grammarCache[difficulty].length} fallback grammar sentences from JSON file`);
        }
    }

    const question = grammarCache[difficulty].shift(); // Get and remove the first item
    saveCache(); // Save after consuming
    res.json(question);

    // Trigger background pre-fetch for ALL difficulties if they are running low
    prefetchGrammar();
});

// Background pre-fetcher
const prefetchGrammar = async () => {
    const difficulties = ['basic', 'intermediate', 'advanced'];
    let changed = false;
    
    for (const diff of difficulties) {
        if (grammarCache[diff].length < 10) { // Threshold to refill
            console.log(`🔄 Background pre-fetching for ${diff}...`);
            // Run in background without awaiting
            generateBatch('grammar', GRAMMAR_BATCH_SIZE, diff).then(newBatch => {
                if (newBatch.length > 0) {
                    grammarCache[diff] = [...grammarCache[diff], ...newBatch];
                    saveCache(); // Save after background refill
                    console.log(`✅ Background refill complete: ${newBatch.length} new ${diff} sentences.`);
                }
            }).catch(err => console.error(`Background fetch failed for ${diff}:`, err.message));
        }
    }
};

// Initial pre-fetch on server start
setTimeout(prefetchGrammar, 5000); // Wait 5s after start to begin pre-fetching

// Clear cache endpoint - forces regeneration from API
app.post('/api/practice/cache/clear', (req, res) => {
    const previousTopicCount = topicCache.length;
    const previousGrammarCount = grammarCache.basic.length + grammarCache.intermediate.length + grammarCache.advanced.length;
    
    topicCache = [];
    grammarCache = {
        basic: [],
        intermediate: [],
        advanced: []
    };
    
    saveCache(); // Save cleared state
    
    console.log(`🗑️  Cache cleared! Removed ${previousTopicCount} topics and ${previousGrammarCount} grammar sentences`);
    console.log(`   Next request will generate fresh content from Gemini API`);
    
    res.json({ 
        success: true, 
        message: 'Cache cleared successfully',
        cleared: {
            topics: previousTopicCount,
            grammar: previousGrammarCount
        }
    });
});

app.get('/api/practice/questions/interview', (req, res) => {
    const interviews = readData('interviews.json');
    const randomInterview = interviews[Math.floor(Math.random() * interviews.length)];
    res.json(randomInterview);
});

// Conversational Interview Endpoint
app.post('/api/interview/chat', async (req, res) => {
    const { history, userResponse, interviewType } = req.body;
    
    if (!INTERVIEW_API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: Missing API Key' });
    }

    try {
        // Map interview type to context
        const interviewContextMap = {
            'technical': 'Technical Interview - Focus ONLY on: coding skills, algorithms, data structures, system design, debugging, technology stack knowledge, architecture decisions, scalability, performance optimization, and technical problem-solving. Ask them to explain technical concepts, write pseudocode, or discuss technical trade-offs. DO NOT ask about personality, cultural fit, or soft skills.',
            
            'hr': 'HR Interview - Focus ONLY on: personality, cultural fit, why they want this job, why they want to work for this company, career goals, work-life balance, salary expectations, company knowledge, strengths/weaknesses, teamwork, communication style, handling workplace conflicts, and how they handle workplace situations. DO NOT ask about technical skills, job-specific tasks, or how they would perform the actual work.',
            
            'behavioral': 'Behavioral Interview - Focus ONLY on: past experiences using the STAR method (Situation, Task, Action, Result). Ask questions like "Tell me about a time when...", "Describe a situation where...", "Give me an example of...". Focus on how they handled challenges, conflicts, leadership, teamwork, failure, and difficult decisions in PAST roles. DO NOT ask hypothetical questions or technical questions.',
            
            'mixed': 'Mixed Interview - Combine ALL types: Start with HR questions (why this company, career goals), then move to behavioral questions (past experiences with STAR method), and finally technical questions (coding, system design). Create a well-rounded interview covering personality, experience, and technical skills.',
            
            'domain-specific': 'Domain-Specific Interview - Focus ONLY on: specialized knowledge and expertise in the candidate\'s specific field (e.g., healthcare for medical roles, finance for banking, education for teaching, etc.). Ask deep, field-specific questions that test their domain knowledge, industry trends, regulations, best practices, and specialized terminology. Tailor questions to their exact domain.'
        };

        const context = interviewContextMap[interviewType] || interviewContextMap['hr'];
        
        // Construct the enhanced prompt
        let prompt = `
You are an expert, friendly, and highly intelligent AI Job Interviewer conducting a professional interview.

INTERVIEW TYPE & CONTEXT:
${context}

YOUR DUAL CAPABILITIES:
1. INTERVIEW MODE: Ask relevant, insightful questions based on the interview type
2. CLARIFICATION MODE: Answer the candidate's questions, provide explanations, and offer guidance

INTELLIGENT DETECTION - Analyze the candidate's response to determine:
- Is this an ANSWER to your question? → Acknowledge it and ask the next relevant question
- Is this a QUESTION from the candidate? (contains ?, "what do you mean", "can you explain", "can you clarify", "I don't understand", etc.) → Provide a clear, helpful answer, then continue the interview naturally
- Does the candidate need CLARIFICATION? → Explain clearly, rephrase if needed, then continue
- Is this a REQUEST for examples? → Provide a relevant example, then continue

CONVERSATION STYLE:
1. Keep responses concise (2-4 sentences max) for natural flow
2. Be encouraging, professional, and supportive
3. If answering candidate's question: Be clear and helpful, then smoothly transition back to interview
4. If asking questions: Make them relevant to the interview type and previous answers
5. Build on previous conversation naturally
6. No markdown or special formatting - plain text for speech synthesis

IMPORTANT RULES:
- If candidate asks a question, ALWAYS answer it first before continuing the interview
- Be flexible and conversational, not rigid
- Show empathy and understanding
- Maintain professional interview structure while being approachable

CONVERSATION HISTORY:
`;

        // Append history to prompt
        (history || []).forEach(msg => {
            prompt += `${msg.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${msg.text}\n`;
        });

        // Append current user response if it exists
        if (userResponse) {
            prompt += `Candidate: ${userResponse}\n`;
        } else if (req.body.start) {
            prompt += `
SYSTEM INSTRUCTION: This is the START of the interview. 
Generate a warm, friendly, and professional opening greeting for a ${interviewType} interview.
Do NOT dive straight into deep or complex questions.
Start with a simple, welcoming icebreaker or ask the candidate to briefly introduce themselves in a relaxed manner.
Make the candidate feel comfortable before moving to harder questions.
DO NOT say "Candidate:" or "Interviewer:" in your output.
`;
        }

        prompt += `Interviewer:`;

        console.log("Using Interview API Key for request");
        const responseText = await callGemini("gemini-2.5-flash", prompt, INTERVIEW_API_KEY);
        
        // Clean up response
        const cleanResponse = responseText.replace(/Interviewer:/gi, '').trim();

        res.json({ 
            text: cleanResponse,
            interviewType: interviewType
        });

    } catch (error) {
        console.error('Error in interview chat:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

// Grammar metrics calculation function
function calculateGrammarMetrics(targetText, spokenText, duration, fillerWords, repeatingWords) {
    // Helper function to clean and normalize text
    const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    
    const targetWords = cleanText(targetText).split(' ').filter(w => w);
    const spokenWords = cleanText(spokenText).split(' ').filter(w => w);
    
    // 1. Accuracy Score (Levenshtein Distance)
    // This handles insertions ("the work"), deletions, and substitutions gracefully
    const levenshteinDistance = (a, b) => {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    };

    // Calculate distance based on CHARACTERS for precision, or WORDS for speed/tolerance
    // Using WORDS is better for grammar practice to avoid penalizing minor spelling differences if STT is imperfect
    // But standard Levenshtein is usually char-based. Let's use a simplified Word-based Levenshtein.
    
    const wordLevenshtein = (arr1, arr2) => {
        const track = Array(arr2.length + 1).fill(null).map(() =>
        Array(arr1.length + 1).fill(null));
        for (let i = 0; i <= arr1.length; i += 1) {
            track[0][i] = i;
        }
        for (let j = 0; j <= arr2.length; j += 1) {
            track[j][0] = j;
        }
        for (let j = 1; j <= arr2.length; j += 1) {
            for (let i = 1; i <= arr1.length; i += 1) {
                const indicator = arr1[i - 1] === arr2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return track[arr2.length][arr1.length];
    };

    const distance = wordLevenshtein(targetWords, spokenWords);
    const maxLength = Math.max(targetWords.length, spokenWords.length);
    const accuracyScore = maxLength > 0 ? Math.round((1 - distance / maxLength) * 100) : 0;
    
    // Correct words count (approximate for display)
    const correctWords = Math.max(0, targetWords.length - distance);
    
    // 2. Fluency Rating (100 - penalties for fillers and repetitions)
    const fillerPenalty = fillerWords.length * 5;
    const repeatPenalty = repeatingWords.length * 3;
    const fluencyRating = Math.max(0, Math.min(100, 100 - fillerPenalty - repeatPenalty));
    
    // 3. Pronunciation Score (estimated - placeholder for now)
    // In a real implementation, this would compare browser vs Whisper transcripts
    // For now, we estimate based on accuracy
    const pronunciationScore = Math.min(100, accuracyScore + 10);
    
    // 4. Speed Score (WPM - Words Per Minute)
    const wordCount = spokenWords.length;
    const minutes = duration / 60;
    const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;
    
    // Ideal WPM for English: 120-150
    // Score is 100 if within range, decreases as you move away
    let speedScore = 100;
    if (wpm < 120) {
        speedScore = Math.max(0, Math.round((wpm / 120) * 100));
    } else if (wpm > 150) {
        speedScore = Math.max(0, Math.round(100 - ((wpm - 150) / 2)));
    }
    
    return {
        accuracyScore,
        fluencyRating,
        pronunciationScore,
        speedScore,
        wpm,
        details: {
            correctWords,
            totalWords: targetWords.length,
            spokenWords: wordCount,
            fillerCount: fillerWords.length,
            repeatCount: repeatingWords.length,
            duration
        }
    };
}

// Mock submission endpoint - in a real app this would save to DB
// Here we just return some analysis

// Practice Submission Endpoint - Now Saves to DB
app.post('/api/practice/submit', async (req, res) => {
    const { type, transcript, duration, fillerWords, repeatingWords, wordCount, wpm } = req.body;
    
    // 1. Authenticate User (Manual Check)
    let userId = null;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id;
        }
    } catch (err) {
        console.log("Submit: Guest user or invalid token");
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: Missing API Key' });
    }

    try {
        let results;

        // Handle Audio/Text Analysis (Grammar, Topic, Interview)
        if (['grammar', 'topic', 'interview', 'speaking'].includes(type)) {
             // Calculate Grammar-specific metrics if practice type is 'grammar'
            let grammarMetrics = null;
            if (type === 'grammar' && req.body.question?.text) {
                 grammarMetrics = calculateGrammarMetrics(
                    req.body.question.text,
                    transcript,
                    duration,
                    fillerWords || [],
                    repeatingWords || []
                );
            }
    
            const prompt = `
            You are an expert English language coach analyzing a spoken practice session. Provide comprehensive feedback in a single response.
            TRANSCRIPT: "${transcript}"
            AUDIO METRICS:
            - Duration: ${duration} seconds
            - Total words: ${wordCount || 'N/A'}
            - Speaking speed: ${wpm || 'N/A'} WPM (words per minute)
            - Filler words detected: ${JSON.stringify(fillerWords || [])}
            - Repeated words: ${JSON.stringify(repeatingWords || [])}
            TASK: Analyze the transcript and provide detailed feedback in the following JSON format:
            {
              "grammarErrors": [{ "original": "...", "corrected": "...", "rule": "...", "severity": "..." }],
              "pronunciationTips": ["...", "..."],
              "fluencyScore": 0-100,
              "fluencyBreakdown": { "grammar": 0-100, "vocabulary": 0-100, "coherence": 0-100, "speed": 0-100, "fillerWordImpact": 0-100 },
              "vocabularyLevel": "beginner/intermediate/advanced",
              "strengths": ["..."],
              "improvements": ["..."],
              "overallFeedback": "..."
            }
            GUIDELINES: Return ONLY valid JSON, no markdown.
            `;
    
            // Use flash for faster feedback
            const text = await callGemini("gemini-2.5-flash", prompt);
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(jsonStr);
    
            results = {
                ...analysis,
                overallScore: analysis.fluencyScore, // Use fluencyScore as main score
                grammarAccuracy: analysis.fluencyBreakdown.grammar,
                fluency: analysis.fluencyBreakdown.speed,
                coherence: analysis.fluencyBreakdown.coherence,
                vocabulary: analysis.fluencyBreakdown.vocabulary,
                message: analysis.overallFeedback,
                createdAt: new Date(),
                ...(grammarMetrics && { grammarMetrics })
            };
        } 
        // Handle Quiz-based Practice (Listening, Reading)
        else if (['listening', 'reading'].includes(type)) {
            const { score, totalQuestions, topic } = req.body;
            const percentage = Math.round((score / totalQuestions) * 100);
            
            results = {
                overallScore: percentage, // Direct score from quiz
                message: `You answered ${score} out of ${totalQuestions} questions correctly. Keep practicing to improve comprehension!`,
                createdAt: new Date(),
                details: req.body // Save full details
            };
        } else {
             return res.status(400).json({ error: 'Invalid practice type' });
        }

        // 2. Save to MongoDB if User is Authenticated
        if (userId) {
            try {
                const session = new PracticeSession({
                    user: userId,
                    type: type,
                    topic: req.body.topic || req.body.question?.text || 'Practice Session',
                    score: results.overallScore,
                    duration: duration || 0,
                    details: {
                        ...results,
                        transcript,
                        grammarMetrics: results.grammarMetrics
                    }
                });
                await session.save();
                console.log(`✅ Practice Session (${type}) saved for user ${userId}`);
            } catch (dbError) {
                console.error("❌ Failed to save session to DB:", dbError.message);
            }
        }

        res.json(results);

    } catch (error) {
        console.error('Error generating feedback:', error);
        res.status(500).json({ error: 'Failed to generate feedback' });
    }
});

// Listening Practice Generation Endpoint
app.post('/api/listening/generate', async (req, res) => {
    const { type = 'conversation', difficulty = 'intermediate', topic } = req.body;
    
    // Validate inputs
    if (!['conversation', 'story'].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Use 'conversation' or 'story'." });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: Missing API Key' });
    }

    try {
        console.log(`🎧 Generating listening content (Type: ${type})...`);
        
        let prompt = "";
        
        if (type === 'conversation') {
            prompt = `Generate a realistic English conversation script for listening practice.
            Context: ${topic || 'General everyday situation'}
            Difficulty: ${difficulty} (CEFR B1-B2 level)
            Length: 40-60 seconds spoken (strictly 80-100 words - KEEP IT SHORT)
            Format: A dialogue between 2-3 people.
            
            Also generate 5-8 multiple-choice or short-answer comprehension questions based on this conversation.
            
            Return ONLY a valid JSON object with this structure:
            {
                "type": "conversation",
                "title": "Creative Title Here",
                "script": [
                    { "speaker": "Name", "text": "Line of dialogue" },
                    ...
                ],
                "questions": [
                    {
                        "id": 1,
                        "question": "Question text?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "answer": "Correct Option text",
                        "explanation": "Brief explanation of why this is correct"
                    }
                ]
            }
            Do not use markdown formatting.`;
        } else {
            prompt = `Generate a short English story or article for reading/listening practice.
            Topic: ${topic || 'Interesting general knowledge or fiction'}
            Difficulty: ${difficulty} (CEFR B1-B2 level)
            Length: 40-60 seconds read (strictly 80-100 words - KEEP IT SHORT)
            
            Also generate 5-8 comprehension questions.
            
            Return ONLY a valid JSON object with this structure:
            {
                "type": "story",
                "title": "Creative Title Here",
                "content": "Full text of the story/article...",
                "questions": [
                    {
                        "id": 1,
                        "question": "Question text?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "answer": "Correct Option text",
                        "explanation": "Brief explanation"
                    }
                ]
            }
            Do not use markdown formatting.`;
        }

        const generateWithModel = async (modelName) => {
            console.log(`🤖 Attempting generation with ${modelName}...`);
            const responseText = await callGemini(modelName, prompt);
            
            // Robust JSON Extraction
            let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Should start with { and end with }
            const startIndex = jsonStr.indexOf('{');
            const endIndex = jsonStr.lastIndexOf('}');
            
            if (startIndex !== -1 && endIndex !== -1) {
                jsonStr = jsonStr.substring(startIndex, endIndex + 1);
            } else {
                 console.warn("⚠️ Could not find outer braces in response, trying raw parse.");
            }

            try {
                const parsed = JSON.parse(jsonStr);
                return parsed;
            } catch (parseError) {
                console.error(`❌ JSON Parse Error (${modelName}):`, parseError.message);
                console.error("RAW EXTRACTED:", jsonStr);
                throw new Error(`Failed to parse response from ${modelName}`);
            }
        };

        let data;
        try {
            data = await generateWithModel("gemini-2.5-flash");
        } catch (flashError) {
            console.warn(`⚠️ gemini-2.5-flash failed: ${flashError.message}. Retrying with gemini-2.5-pro...`);
            try {
                data = await generateWithModel("gemini-2.5-pro");
            } catch (proError) {
                console.error(`❌ Both models failed.`);
                throw new Error(`Generation failed: ${proError.message}`);
            }
        }

        res.json(data);

    } catch (error) {
        console.error('🔴 Error generating listening content:', error.message);
        res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
});

// Practice History Endpoint
app.get('/api/practice/history', async (req, res) => {
    try {
        // 1. Authenticate User
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // 2. Fetch Sessions
        const sessions = await PracticeSession.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 sessions

        // 3. Transform Data for Frontend
        const history = sessions.map(session => ({
            id: session._id,
            type: session.type === 'topic' ? 'Topic Practice' : 
                  session.type === 'grammar' ? 'Grammar Practice' :
                  session.type === 'interview' ? 'Interview Practice' :
                  session.type === 'listening' ? 'Listening Practice' :
                  'AI Interviewer',
            topic: session.topic,
            score: session.score,
            date: session.createdAt,
            duration: session.duration
        }));

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
